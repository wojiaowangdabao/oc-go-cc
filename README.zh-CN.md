# oc-go-cc

一个 Go 语言编写的 CLI 代理工具，让你可以将 [OpenCode Go](https://opencode.ai/docs/go/) 订阅与 [Claude Code](https://docs.anthropic.com/en/docs/claude-code) 配合使用。

`oc-go-cc` 位于 Claude Code 和 OpenCode Go 之间，拦截 Anthropic API 请求，将其转换为 OpenAI 格式，然后转发到 OpenCode Go 的端点。Claude Code 以为它在和 Anthropic 通信——但实际上你的请求被路由到了更经济的开源模型。

## 为什么需要这个工具？

OpenCode Go 以 **$5/月**（之后 $10/月）的价格提供强大的开源编程模型。这个代理工具让这些模型可以无缝地在 Claude Code 的界面下工作——无需补丁、无需 fork，只需设置两个环境变量即可。

## 功能特性

- **透明代理** — Claude Code 发送 Anthropic 格式的请求，代理自动转换为 OpenAI 格式并转发
- **模型路由** — 根据上下文自动路由到不同模型（默认、思考、长上下文、后台任务）
- **故障回退链** — 如果某个模型失败，自动尝试配置链中的下一个模型
- **断路器** — 跟踪模型健康状态，跳过故障模型以避免延迟飙升
- **实时流式传输** — 完整的 SSE 流式传输，实时进行 OpenAI 到 Anthropic 格式转换
- **工具调用** — 正确处理 Anthropic tool_use/tool_result 与 OpenAI function calling 之间的转换
- **Token 计数** — 使用 tiktoken (cl100k_base) 进行精确的 token 计数和上下文阈值检测
- **JSON 配置** — 灵活的配置文件，支持环境变量覆盖和 `${VAR}` 变量插值
- **热重载** — 监听配置文件变化并自动重载（默认关闭）
- **后台模式** — 作为守护进程在终端后台运行
- **登录自动启动** — 通过 launchd 实现系统开机自启（macOS）

## 快速开始

### 1. 安装

```bash
# macOS / Linux
brew tap samueltuyizere/tap && brew install oc-go-cc

# Windows
scoop bucket add oc-go-cc https://github.com/samueltuyizere/scoop-bucket && scoop install oc-go-cc
```

更多安装方式请参考 [INSTALLATION.md](INSTALLATION.md)。

### 2. 初始化配置

```bash
oc-go-cc init
```

会在 `~/.config/oc-go-cc/config.json` 创建默认配置文件。编辑该文件添加你的 API 密钥，或设置环境变量：

```bash
export OC_GO_CC_API_KEY=sk-opencode-your-key-here
```

### 3. 启动代理

```bash
oc-go-cc serve
```

### 4. 配置 Claude Code

```bash
export ANTHROPIC_BASE_URL=http://127.0.0.1:3456
export ANTHROPIC_AUTH_TOKEN=unused
```

### 5. 运行 Claude Code

```bash
claude
```

## CLI 命令

```
oc-go-cc serve              启动代理服务器
oc-go-cc serve -b           后台模式启动（脱离终端）
oc-go-cc serve --port 8080  自定义端口启动
oc-go-cc stop               停止正在运行的代理
oc-go-cc status             检查代理运行状态
oc-go-cc init               创建默认配置文件
oc-go-cc validate           验证配置文件
oc-go-cc models             列出可用的 OpenCode Go 模型
oc-go-cc autostart enable   启用登录自动启动
oc-go-cc autostart disable  禁用登录自动启动
oc-go-cc autostart status   查看自动启动状态
oc-go-cc --version          显示版本号
```

## 文档

| 文档 | 说明 |
| -------- | ----------- |
| [INSTALLATION.md](INSTALLATION.md) | Homebrew、Scoop、源码编译、发布包 |
| [CONFIGURATION.md](CONFIGURATION.md) | 配置参考、环境变量、模型路由、回退链 |
| [MODELS.md](MODELS.md) | 模型能力、费用和路由建议 |
| [CONTRIBUTING.md](CONTRIBUTING.md) | 开发环境搭建、架构说明、工作原理 |
| [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | 常见问题及调试模式 |

## 许可证

[AGPL-3.0](LICENSE)
