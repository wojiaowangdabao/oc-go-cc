# 贡献指南

## 开发

```bash
# 构建（版本从 git 自动检测）
make build

# 开发模式运行
make run

# 运行测试（带竞态检测）
make test

# 运行 go vet
make vet

# 清理构建产物
make clean

# 安装到 $GOPATH/bin
make install

# 构建跨平台发布版
make dist
```

运行单个测试：`go test ./internal/router/ -v`

## 工作原理

```
┌─────────────┐     Anthropic API      ┌─────────────┐     OpenAI API       ┌─────────────┐
│  Claude Code ├──────────────────────►│  oc-go-cc    ├────────────────────►│  OpenCode Go │
│  (CLI)       │  POST /v1/messages   │  (代理)      │  /chat/completions  │  (上游)      │
│              │◄──────────────────────┤              │◄────────────────────┤              │
└─────────────┘   Anthropic SSE        └─────────────┘   OpenAI SSE          └─────────────┘
```

1. Claude Code 以 [Anthropic Messages API](https://docs.anthropic.com/en/api/messages) 格式发送请求
2. oc-go-cc 解析请求，计算 token 数量，并通过路由规则选择模型
3. 请求被转换为 [OpenAI Chat Completions](https://platform.openai.com/docs/api-reference/chat) 格式
4. 转换后的请求发送到 OpenCode Go 的端点
5. 响应（流式或非流式）被转换回 Anthropic 格式
6. Claude Code 收到响应，就像直接来自 Anthropic 一样

### 转换内容对照

| Anthropic                                                      | OpenAI                                    |
| -------------------------------------------------------------- | ----------------------------------------- |
| `system`（字符串或数组）                                        | `messages[0]` 搭配 `role: "system"`       |
| `content: [{"type":"text","text":"..."}]`                      | `content: "..."`                          |
| `tool_use` 内容块                                               | `tool_calls` 数组                         |
| `tool_result` 内容块                                            | `role: "tool"` 消息                        |
| `thinking` 内容块                                               | `reasoning_content`                       |
| `stop_reason: "end_turn"`                                      | `finish_reason: "stop"`                   |
| `stop_reason: "tool_use"`                                      | `finish_reason: "tool_calls"`             |
| SSE `message_start` / `content_block_delta` / `message_stop`   | SSE `role` / `delta.content` / `[DONE]`   |

### DeepSeek V4 思考模式

DeepSeek V4 Pro 和 Flash 通过 OpenCode Go 使用 OpenAI 兼容的 `/chat/completions` 端点。它们支持思考模式和可配置的推理努力度。

对于 Claude Code 和其他 agent 编码工作流，配置 DeepSeek V4 模型如下：

```json
{
  "provider": "opencode-go",
  "model_id": "deepseek-v4-pro",
  "max_tokens": 8192,
  "reasoning_effort": "max",
  "thinking": {
    "type": "enabled"
  }
}
```

`oc-go-cc` 将这些字段作为 OpenAI Chat Completions 参数转发到 OpenCode Go：

- `reasoning_effort`：控制 DeepSeek V4 的推理努力度（`high` 或 `max`）
- `thinking`：启用或禁用 DeepSeek V4 的思考模式

DeepSeek V4 的思考响应以 OpenAI `reasoning_content` 形式返回，并转换回 Anthropic `thinking` 块供 Claude Code 使用。

## 架构

```
cmd/oc-go-cc/main.go           CLI 入口点（cobra 命令）
internal/
├── config/
│   ├── config.go               配置类型
│   ├── loader.go               JSON 加载、环境变量覆盖、${VAR} 变量插值
│   ├── watcher.go              热重载文件监听（fsnotify）
│   └── atomic.go               原子配置交换，支持并发访问
├── router/
│   ├── model_router.go         基于场景的模型选择
│   ├── scenarios.go            场景检测（default/think/long_context/background）
│   └── fallback.go             带断路器的回退处理器
├── server/
│   └── server.go               HTTP 服务器设置、优雅关闭、PID 管理
├── handlers/
│   ├── messages.go             POST /v1/messages 处理器（流式 + 非流式）
│   └── health.go               健康检查和 token 计数端点
├── transformer/
│   ├── request.go              Anthropic → OpenAI 请求转换
│   ├── response.go             OpenAI → Anthropic 响应转换
│   └── stream.go               实时 SSE 流转换
├── client/
│   └── opencode.go             OpenCode Go HTTP 客户端
├── daemon/
│   ├── launchd.go              macOS launchd plist 管理
│   ├── background.go           后台守护进程 fork
│   └── process.go              PID 文件和进程管理
└── token/
    └── counter.go              Tiktoken token 计数器（cl100k_base）
pkg/types/
├── anthropic.go                Anthropic API 类型（多态 system/content 字段）
└── openai.go                   OpenAI API 类型
configs/
└── config.example.json         示例配置
```

### 关键设计决策

- **多态字段处理**：Anthropic 的 `system` 和 `content` 字段接受字符串和数组两种格式。我们使用 `json.RawMessage` 配合访问器方法（`SystemText()`、`ContentBlocks()`）来正确处理这两种格式。
- **实时流代理**：SSE 事件在传输过程中实时转换，不会缓冲。这意味着 Claude Code 能实时看到来自 OpenCode Go 的响应。
- **每个模型独立断路器**：每个模型都有自己的断路器。连续 3 次失败后，该模型会被跳过 30 秒，然后重新测试。
- **环境变量插值**：配置值如 `"${OC_GO_CC_API_KEY}"` 在加载时解析，因此你永远不需要将密钥放在配置文件中。

## API 端点

代理暴露了 Claude Code 期望的以下端点：

| 方法   | 路径                        | 说明                               |
| ------ | --------------------------- | ---------------------------------- |
| `POST` | `/v1/messages`              | 主要聊天端点（Anthropic 格式）       |
| `POST` | `/v1/messages/count_tokens` | Token 计数                         |
| `GET`  | `/health`                   | 健康检查                           |
