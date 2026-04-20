# AI Capability Contracts

## Summary

本文定义本项目中 AI 能力接入的通用规范，用于避免以下问题：

- 把过多领域规则堆进 prompt，导致上下文膨胀
- 让模型自己猜具体目标，导致结果不稳定
- 新增后端能力后，没有同步给 AI 一份统一、可维护的能力定义

核心原则：

1. AI 负责理解自然语言和意图。
2. 系统负责确定性选择、校验、排序、游标和兜底。
3. Prompt 只描述工具用途和选择规则，不承载复杂执行逻辑。
4. 复杂规则必须落在执行层，而不是仅依赖模型“猜对”。

## Contract Layers

每个 AI 能力建议按 4 层定义：

### 1. Capability Contract

定义工具名、用途、输入输出结构。

- `tool name`
- `purpose`
- `input schema`
- `output schema`

推荐使用：

- TypeScript types
- Zod schema
- 必要时补充 Markdown 文档示例

### 2. Selection Policy

定义什么时候应该选择这个工具，而不是别的工具。

需要明确：

- 触发词和典型说法
- 相似工具之间的边界
- 缺信息时是追问、留空还是走默认值

### 3. Deterministic Execution Rules

执行层负责：

- 参数归一化
- 排序规则
- 相对选择
- 边界判断
- fallback

以下规则不应该主要放在 prompt：

- 必须长期稳定一致的规则
- 可以用代码准确表达的规则
- 错误代价高的规则
- 会被多次复用的规则

### 4. Runtime State

对话中若存在“上一篇 / 下一篇 / 再来一个 / 刚才那个”这类相对引用，必须提供系统态锚点。

建议做法：

- 对用户隐藏
- 以系统消息或内部状态形式保存
- 只保存执行层真正需要的最小上下文

## Prompt Budget Rules

为避免上下文过长，遵循以下约束：

1. 先路由，再暴露工具
   - 不要一次给模型所有工具
   - 只暴露当前 domain 的少量工具

2. Prompt 只写“选择规则”
   - 不把复杂业务分支全部写进 prompt

3. 相对选择、排序、游标写进代码
   - 如 `latest / previous / next`

4. 一个工具如果要靠很长 prompt 才能稳定工作，优先重构 schema

## Capability Example: get_post_detail

### Purpose

用于查看文章详情，支持：

- 指定文章查询
- 最新一篇文章
- 基于上一次展示结果的上一篇 / 下一篇

### Input Contract

- `tool: 'get_post_detail'`
- `postQuery: string`
- `selectionMode: 'match_query' | 'latest' | 'previous' | 'next'`
- `includeContent: boolean`
- `reason: string`

### Selection Policy

典型映射：

- “查看这篇文章”
  - `selectionMode = match_query`
- “给我最新一篇文章”
  - `selectionMode = latest`
- “给我上一篇”
  - `selectionMode = previous`
- “再给我下一篇”
  - `selectionMode = next`

规则：

- 如果用户给了明确标题、slug 或 id，优先 `match_query`
- 如果用户使用相对说法，优先 `latest / previous / next`
- 不能让模型直接猜“上一篇是哪篇”，必须让执行层基于系统锚点做选择

### Deterministic Execution Rules

排序规则：

- 使用当前用户自己的文章
- 按 `updatedAt desc` 排序

执行逻辑：

- `latest`
  - 取排序后的第 1 条
- `previous`
  - 从最近一次展示的文章锚点向后偏移 1 条
- `next`
  - 从最近一次展示的文章锚点向前偏移 1 条
- `match_query`
  - 按 `id / slug / title contains` 查找

边界处理：

- 没有锚点时，`previous / next` 需要提示用户先指定文章或先查看一篇文章
- 没有上一条或下一条时，明确返回边界提示

### Runtime State

建议保存：

- `lastShownPostId`
- `ordering = updatedAt_desc`

状态只用于执行层，不对用户显示。
