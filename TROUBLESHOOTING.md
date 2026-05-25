# 故障排除

## Windows Scoop 后台模式

在 Windows 上，`oc-go-cc serve -b` 使用原生 Windows 进程 API，并保持 Scoop 的 shim 路径不变。这意味着后台模式不需要 `nohup` 或类 Unix shell，Scoop 提供的环境变量也能正常工作。

## "invalid request body" 错误

这意味着代理无法解析来自 Claude Code 的请求。启用调试日志以查看原始请求：

```json
{ "logging": { "level": "debug" } }
```

或者设置环境变量：

```bash
export OC_GO_CC_LOG_LEVEL=debug
```

## "all models failed" 错误

回退链中的所有模型都返回了错误。请检查：

1. 你的 API 密钥是否有效：`oc-go-cc validate`
2. 是否超过了[使用限制](https://opencode.ai/auth)
3. OpenCode Go 服务是否可达：`curl -H "Authorization: Bearer $OC_GO_CC_API_KEY" https://opencode.ai/zen/go/v1/models`

## 连接被拒绝

确保代理正在运行：

```bash
oc-go-cc status
```

并且 Claude Code 指向了正确的地址：

```bash
echo $ANTHROPIC_BASE_URL  # 应为 http://127.0.0.1:3456
```

## 流式传输不正常

代理实时将 OpenAI SSE 转换为 Anthropic SSE。如果流式传输出现问题：

1. 将日志级别设置为 `debug` 以查看原始 SSE 数据块
2. 检查是否有代理或防火墙缓冲了连接
3. 先尝试非流式请求以验证模型是否正常工作

## 调试模式

要获取最大量的日志，请使用 debug 级别运行：

```bash
OC_GO_CC_LOG_LEVEL=debug oc-go-cc serve
```

这会记录：

- 来自 Claude Code 的原始 Anthropic 请求体
- 发送到 OpenCode Go 的转换后 OpenAI 请求
- 收到的原始 OpenAI 响应
- 流式传输期间的 SSE 流事件
