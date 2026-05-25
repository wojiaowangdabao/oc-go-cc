# OpenCode Go 模型指南

OpenCode Go 模型的完整指南，包含能力、费用和路由建议。

**来源：** [OpenCode Go 文档](https://opencode.ai/docs/go/)

## 快速费用对比

> 💰 **费用感知路由很重要！** GLM-5.1 每5小时可处理 880 次请求，而 Qwen3.5 Plus 可处理 **10,200 次**——同样的 $12 预算，请求量相差 **11.6 倍**。

| 模型               | 每 $12 请求数（5小时） | 性价比  | 质量    |
| ----------------- | --------------------- | ------- | ------- |
| **Qwen3.5 Plus**  | **10,200**            | ★★★★★   | ★★☆☆☆   |
| **MiniMax M2.5**  | **6,300**             | ★★★★★   | ★★☆☆☆   |
| **MiniMax M2.7**  | **3,400**             | ★★★★☆   | ★★★☆☆   |
| **Qwen3.6 Plus**  | **3,300**             | ★★★★☆   | ★★★☆☆   |
| **MiMo-V2-Omni**  | **2,150**             | ★★★☆☆   | ★★★☆☆   |
| **Kimi K2.5**     | **1,850**             | ★★☆☆☆   | ★★★★☆   |
| **MiMo-V2-Pro**   | **1,290**             | ★★☆☆☆   | ★★★★☆   |
| **Kimi K2.6**     | **~1,150**            | ★☆☆☆☆   | ★★★★★   |
| **GLM-5**         | **1,150**             | ★☆☆☆☆   | ★★★★☆   |
| **GLM-5.1**       | **880**               | ☆☆☆☆☆   | ★★★★★   |

## 重要提示：API 端点

⚠️ **注意：** 并非所有模型使用相同的 API 端点！oc-go-cc 会自动处理，但你应该了解：

| 模型                                                                                        | 端点                                                | 格式                    |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------- | ----------------------- |
| GLM-5, GLM-5.1, Kimi K2.6, Kimi K2.5, MiMo-V2-Pro, MiMo-V2-Omni, Qwen3.5 Plus, Qwen3.6 Plus, DeepSeek V4 Pro/Flash | `https://opencode.ai/zen/go/v1/chat/completions`    | OpenAI 兼容             |
| **MiniMax M2.5, MiniMax M2.7**                                                              | `https://opencode.ai/zen/go/v1/messages`            | **Anthropic 兼容**      |

**为什么这很重要：** MiniMax 模型原生使用 Anthropic 格式。oc-go-cc 会自动检测 MiniMax 模型并将其路由到正确的端点，无需转换。这意味着 MiniMax 模型可以与 Claude Code 无缝协作。

DeepSeek V4 Pro 和 Flash 在 OpenCode Go 中使用 OpenAI 兼容格式。oc-go-cc 将 Claude Code 的 Anthropic 请求转换为 OpenAI Chat Completions 格式，包括工具调用、工具结果、思考历史、`reasoning_effort` 和 `thinking`。

对于 Claude Code 和 OpenCode 风格的 agent 工作流，DeepSeek V4 支持最大思考模式：

```json
{
  "model_id": "deepseek-v4-pro",
  "reasoning_effort": "max",
  "thinking": {
    "type": "enabled"
  }
}
```

使用 `deepseek-v4-pro` 用于默认、复杂、思考、长上下文路由。使用 `deepseek-v4-flash` 用于快速、后台或子代理工作负载。

## 费用感知路由策略

### 默认使用便宜的，必要时升级

**大多数请求应该使用便宜的模型。** 仅在以下情况升级到昂贵的模型：

1. **任务复杂度要求高**（多步推理、架构设计）
2. **尝试过便宜模型但失败了**
3. **代码质量至关重要**（生产代码审查）

### 推荐路由配置

```json
{
  "models": {
    "background": {
      // 简单操作
      "model_id": "qwen3.5-plus",
      "max_tokens": 2048
    },
    "default": {
      // 较好的质量，适中的费用
      "model_id": "kimi-k2.6",
      "max_tokens": 4096
    },
    "long_context": {
      // 仅处理大文件
      "model_id": "minimax-m2.5",
      "context_threshold": 80000
    },
    "think": {
      // 推理任务
      "model_id": "glm-5",
      "max_tokens": 8192
    },
    "complex": {
      // 仅复杂架构任务
      "model_id": "glm-5.1",
      "max_tokens": 4096
    },
    "fast": {
      // 流式请求（优先考虑 TTFT）
      "model_id": "qwen3.6-plus",
      "max_tokens": 4096
    }
  }
}
```

### 决策树

```
上下文是否超过 80K tokens？
├── 是 → 使用 MiniMax M2.5（100万上下文，6,300 req/$12）
│
是否是复杂任务（架构、重构、工具操作）？
├── 是 → 使用 GLM-5.1（880 req/$12）
│
是否是推理/规划任务？
├── 是 → 使用 GLM-5（1,150 req/$12）
│
是否是简单的后台任务（读文件、grep、列目录、无工具调用）？
├── 是 → 使用 Qwen3.5 Plus（10,200 req/$12）
│
默认 → 使用 Kimi K2.6（1,850 req/$12, ★★★★★）或 Qwen3.6 Plus（3,300 req/$12）
```

## 详细模型介绍

### 性价比之王 💰

#### Qwen3.5 Plus — 主力模型

- **模型 ID：** `qwen3.5-plus`
- **费用：** **每 $12 可处理 10,200 次请求**（最佳性价比！）
- **上下文：** ~128K tokens
- **质量：** ★★☆☆☆（适合简单任务）
- **最适合：**
  - 文件读取操作
  - 目录列表
  - Grep/搜索
  - 简单问题
  - 批量操作
  - 后台任务
- **何时使用：** 当你需要低成本执行大量操作时

#### MiniMax M2.5 — 低成本长上下文

- **模型 ID：** `minimax-m2.5`
- **端点：** **Anthropic 兼容**（`/v1/messages`）
- **费用：** **每 $12 可处理 6,300 次请求**
- **上下文：** **~100万 tokens**（1百万！）
- **质量：** ★★☆☆☆（可接受）
- **速度：** 快
- **最适合：**
  - 非常大的文件
  - 长对话
  - 多文件上下文
- **何时使用：** 当你需要 100万上下文但想最小化费用时
- **注意：** 使用 Anthropic 端点 — oc-go-cc 自动处理

### 平衡模型（质量 + 费用）

#### DeepSeek V4 Pro — Agent 编码 + 最大思考

- **模型 ID：** `deepseek-v4-pro`
- **端点：** **OpenAI 兼容**（`/chat/completions`）
- **上下文：** **~100万 tokens**
- **质量：** ★★★★★
- **最适合：**
  - Claude Code agent 工作流
  - 复杂实现和调试
  - 架构设计和重构
  - 长上下文编码任务
  - 最大思考模式
- **推荐配置：**

  ```json
  {
    "provider": "opencode-go",
    "model_id": "deepseek-v4-pro",
    "temperature": 0.1,
    "max_tokens": 8192,
    "reasoning_effort": "max",
    "thinking": {
      "type": "enabled"
    }
  }
  ```

#### DeepSeek V4 Flash — 快速 Agent 工作负载

- **模型 ID：** `deepseek-v4-flash`
- **端点：** **OpenAI 兼容**（`/chat/completions`）
- **上下文：** **~100万 tokens**
- **质量：** ★★★★☆
- **最适合：**
  - 快速路由
  - 后台任务
  - 子代理风格工作
  - DeepSeek V4 Pro 的回退
- **推荐配置：**

  ```json
  {
    "provider": "opencode-go",
    "model_id": "deepseek-v4-flash",
    "temperature": 0.1,
    "max_tokens": 4096,
    "reasoning_effort": "max",
    "thinking": {
      "type": "enabled"
    }
  }
  ```

#### Qwen3.6 Plus — 经济实惠的通用编码 ⭐ 推荐默认

- **模型 ID：** `qwen3.6-plus`
- **费用：** **每 $12 可处理 3,300 次请求**（是 GLM-5.1 的 3.8 倍！）
- **上下文：** ~128K tokens
- **质量：** ★★★☆☆（对大多数任务足够好）
- **速度：** 快
- **最适合：**
  - 通用编码（默认选择）
  - 功能实现
  - Bug 修复
  - 重构
- **何时使用：** 费用敏感用户的默认选择

#### Kimi K2.6 — 平衡费用下的最佳质量

- **模型 ID：** `kimi-k2.6`
- **费用：** **每 $12 约 1,850 次请求**
- **上下文：** ~256K tokens（K2.5 的升级版，有所改进）
- **质量：** ★★★★★（优秀 — 改进版）
- **速度：** 快
- **最适合：**
  - 复杂编码任务
  - 代码审查
  - 架构讨论
  - 通用默认选择（最佳质量费用比）
- **何时使用：** 默认选择 — 与 K2.5 费用相近但质量更好

#### Kimi K2.5 — 质量 + 合理费用（旧版）

- **模型 ID：** `kimi-k2.5`
- **费用：** **每 $12 可处理 1,850 次请求**
- **上下文：** ~256K tokens（大多数模型的 2 倍）
- **质量：** ★★★★☆（优秀）
- **速度：** 快
- **最适合：**
  - 复杂编码任务
  - 代码审查
  - 架构讨论
  - 当你需要比经济型模型更好的质量时
- **何时使用：** 当质量比最大程度节省费用更重要时

### 高级模型（谨慎使用！）

#### GLM-5 — 推理专家

- **模型 ID：** `glm-5`
- **费用：** **每 $12 可处理 1,150 次请求**（比 Qwen3.5 Plus 贵 9 倍！）
- **上下文：** ~200K tokens
- **质量：** ★★★★☆（优秀）
- **最适合：**
  - 多步推理
  - 复杂规划
  - 算法设计
  - 困难调试
- **何时使用：** 当需要推理/规划且经济型模型失败时

#### GLM-5.1 — 最高质量

- **模型 ID：** `glm-5.1`
- **费用：** **每 $12 可处理 880 次请求**（比 Qwen3.5 Plus 贵 11.6 倍！）
- **上下文：** ~200K tokens
- **质量：** ★★★★★（最佳可用）
- **速度：** 中等
- **最适合：**
  - 关键架构决策
  - 复杂多文件重构
  - 生产代码审查
  - 当你需要绝对最佳质量时
- **何时使用：** 仅当更便宜的模型无法处理任务时

## 使用限制

OpenCode Go 的限制：

- **5 小时限制：** $12 的使用量
- **每周限制：** $30 的使用量
- **每月限制：** $60 的使用量

### 费用对比示例

**场景：** 你这个月想做 5,000 次请求。

| 模型          | 费用    | 能做到吗？              |
| ------------- | ------- | ----------------------- |
| Qwen3.5 Plus  | ~$6     | ✅ 是的，很轻松          |
| MiniMax M2.5  | ~$10    | ✅ 是的                  |
| Qwen3.6 Plus  | ~$18    | ✅ 是的                  |
| Kimi K2.5     | ~$32    | ❌ 超过每周 $30 限制     |
| GLM-5         | ~$52    | ❌ 超过限制              |
| GLM-5.1       | ~$68    | ❌ 超过限制              |

### 优化你的使用

**策略 1：分层方法**

```
1. 从 Qwen3.6 Plus 开始（便宜，质量好）
2. 如果失败，尝试 Kimi K2.5（质量更好）
3. 仍然失败，使用 GLM-5（推理）
4. 仅关键任务：GLM-5.1（高级）
```

**策略 2：基于任务的选择**

```
后台操作（grep、ls、cat）→ Qwen3.5 Plus
通用编码 → Qwen3.6 Plus 或 Kimi K2.5
复杂功能 → Kimi K2.5
架构/规划 → GLM-5
关键审查 → GLM-5.1（很少使用）
```

## 费用优化的回退链

```json
{
  "fallbacks": {
    "background": [
      { "model_id": "qwen3.6-plus" },
      { "model_id": "minimax-m2.5" }
    ],
    "long_context": [{ "model_id": "minimax-m2.5" }],
    "default": [{ "model_id": "mimo-v2-pro" }, { "model_id": "qwen3.6-plus" }],
    "think": [{ "model_id": "kimi-k2.6" }],
    "complex": [{ "model_id": "glm-5" }],
    "fast": [{ "model_id": "qwen3.5-plus" }, { "model_id": "minimax-m2.5" }]
  }
}
```

**经验法则：** 如果一个任务用便宜模型能成功，就不需要贵模型。仅在必要时回退到昂贵模型。

## 快速参考

| 任务类型                | 推荐模型       | 费用（req/$12） | 回退模型      |
| ----------------------- | ------------- | -------------- | ------------- |
| 读文件、ls、grep         | Qwen3.5 Plus  | 10,200         | Qwen3.6 Plus  |
| 通用编码                 | Qwen3.6 Plus  | 3,300          | Kimi K2.5     |
| 复杂功能                 | Kimi K2.6     | 1,850          | Kimi K2.5     |
| 长上下文（>80K）         | MiniMax M2.5  | 6,300          | MiniMax M2.7  |
| 推理/规划                | GLM-5         | 1,150          | Kimi K2.5     |
| 关键架构                 | GLM-5.1       | 880            | GLM-5         |
| 批量操作                 | Qwen3.5 Plus  | 10,200         | MiniMax M2.5  |

## 节省费用小贴士

1. **默认使用 Qwen3.6 Plus** — 3,300 req/$12 对大多数任务来说足够了
2. **仅在关键任务使用 GLM-5.1** — 880 req/$12 消耗预算很快
3. **简单操作使用 Qwen3.5 Plus** — 10,200 req/$12 无可匹敌
4. **长上下文使用 MiniMax M2.5** — 6,300 req/$12 外加 100万上下文，性价比惊人
5. **在 [OpenCode 控制台](https://opencode.ai/auth) 监控你的使用量**

## 相关链接

- [OpenCode Go 文档](https://opencode.ai/docs/go/)
- [oc-go-cc 配置](../configs/config.example.json)
- [README.md](../README.md) 安装说明
