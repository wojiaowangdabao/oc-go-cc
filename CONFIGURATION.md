# 配置

## 配置文件

位置：`~/.config/oc-go-cc/config.json`

可通过 `OC_GO_CC_CONFIG` 环境变量覆盖路径。

## 完整配置参考

```json
{
  "api_key": "${OC_GO_CC_API_KEY}",
  "host": "127.0.0.1",
  "port": 3456,
  "hot_reload": false,

  "models": {
    "default": {
      "provider": "opencode-go",
      "model_id": "kimi-k2.6",
      "temperature": 0.7,
      "max_tokens": 4096
    },
    "background": {
      "provider": "opencode-go",
      "model_id": "qwen3.5-plus",
      "temperature": 0.5,
      "max_tokens": 2048
    },
    "think": {
      "provider": "opencode-go",
      "model_id": "glm-5.1",
      "temperature": 0.7,
      "max_tokens": 8192
    },
    "complex": {
      "provider": "opencode-go",
      "model_id": "glm-5.1",
      "temperature": 0.7,
      "max_tokens": 4096
    },
    "long_context": {
      "provider": "opencode-go",
      "model_id": "minimax-m2.7",
      "temperature": 0.7,
      "max_tokens": 16384,
      "context_threshold": 80000
    },
    "fast": {
      "provider": "opencode-go",
      "model_id": "qwen3.6-plus",
      "temperature": 0.7,
      "max_tokens": 4096
    }
  },

  "fallbacks": {
    "default": [
      { "provider": "opencode-go", "model_id": "glm-5" },
      { "provider": "opencode-go", "model_id": "qwen3.6-plus" }
    ],
    "think": [{ "provider": "opencode-go", "model_id": "glm-5" }],
    "complex": [{ "provider": "opencode-go", "model_id": "glm-5" }],
    "long_context": [{ "provider": "opencode-go", "model_id": "minimax-m2.5" }],
    "fast": [{ "provider": "opencode-go", "model_id": "qwen3.5-plus" }]
  },

  "opencode_go": {
    "base_url": "https://opencode.ai/zen/go/v1/chat/completions",
    "timeout_ms": 300000
  },

  "logging": {
    "level": "info",
    "requests": true
  }
}
```

## 环境变量

环境变量会覆盖配置文件中的值。配置值也支持 `${VAR}` 变量插值。

| 变量                    | 说明                              | 默认值                                           |
| ----------------------- | --------------------------------- | ------------------------------------------------ |
| `OC_GO_CC_API_KEY`      | OpenCode Go API 密钥（**必填**）  | —                                                |
| `OC_GO_CC_CONFIG`       | 自定义配置文件路径                 | `~/.config/oc-go-cc/config.json`                 |
| `OC_GO_CC_HOST`         | 代理监听主机                       | `127.0.0.1`                                      |
| `OC_GO_CC_PORT`         | 代理监听端口                       | `3456`                                           |
| `OC_GO_CC_OPENCODE_URL` | OpenCode Go API 端点              | `https://opencode.ai/zen/go/v1/chat/completions` |
| `OC_GO_CC_LOG_LEVEL`    | 日志级别：`debug`、`info`、`warn`、`error` | `info`                                           |

## 热重载

默认情况下，配置更改需要重启服务器。启用热重载可以监听配置文件变化并自动应用：

```json
{
  "hot_reload": true
}
```

启用后，代理会监听配置目录的变化（兼容通过重命名/新建文件方式保存的编辑器），并自动重新加载配置。你也可以通过向进程发送 `SIGHUP` 信号来手动触发重载：

```bash
kill -HUP <PID>
```

## 模型路由

代理会自动检测请求类型，根据上下文大小和内容分析路由到合适的模型：

| 场景              | 触发条件                                          | 模型          | 原因                                          |
| ----------------- | ------------------------------------------------ | ------------- | --------------------------------------------- |
| **长上下文**      | >80K tokens（可配置）                             | MiniMax M2.7  | 100万上下文窗口，其他模型仅 128-256K           |
| **复杂**          | 系统提示中包含 "architect"、"refactor"、"complex" | GLM-5.1       | 最佳推理和架构理解能力                         |
| **思考**          | 系统提示中包含 "think"、"plan"、"reason"          | GLM-5         | 推理能力好，比 GLM-5.1 更便宜                  |
| **后台**          | "read file"、"grep"、"list directory"             | Qwen3.5 Plus  | 最便宜（约 1万 req/5hr），适合简单操作          |
| **默认**          | 其他所有请求                                      | Kimi K2.6     | 质量和费用的最佳平衡（约 1.8K req/5hr）         |

**详见 [MODELS.md](MODELS.md) 了解模型能力、费用和路由建议。**

DeepSeek V4 用户可以将任何场景的模型设置为 `deepseek-v4-pro` 或 `deepseek-v4-flash`。如需确定性最大思考模式，在该场景的模型配置和回退条目中添加 `reasoning_effort: "max"` 和 `thinking: {"type":"enabled"}`。

### 路由详情

| 场景              | 触发条件                                                                    | 配置键                | 默认模型       |
| ----------------- | -------------------------------------------------------------------------- | --------------------- | ------------- |
| **默认**          | 标准聊天                                                                    | `models.default`      | `kimi-k2.6`   |
| **思考**          | 系统提示包含 "think"、"plan"、"reason"；或包含 thinking 内容块              | `models.think`        | `glm-5.1`     |
| **长上下文**      | Token 数量超过 `context_threshold`                                         | `models.long_context` | `minimax-m2.7` |
| **后台**          | 文件读取、目录列表、grep 模式                                               | `models.background`   | `qwen3.5-plus`|

路由优先级：**长上下文** > **思考** > **后台** > **默认**

## 回退链

当模型请求失败时（网络错误、速率限制、服务器错误），代理会尝试回退链中的下一个模型：

```
主模型 -> 回退 1 -> 回退 2 -> ... -> 错误（全部失败）
```

每个模型还有一个**断路器**，用于跟踪连续失败次数。连续 3 次失败后，断路器打开，该模型会被跳过 30 秒，然后再次测试（半开状态）。
