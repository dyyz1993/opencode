# AssistantFinished 事件 - 验证报告

## 概述

本报告总结了 AssistantFinished 事件的实现和验证结果。

## 验证日期

2026-05-10

## 验证方法

1. **静态验证**: 检查源码修改是否正确
2. **事件定义验证**: 验证事件 schema 和类型
3. **Git 验证**: 确认提交和分支状态

## 验证结果

### ✅ 1. 事件定义 (packages/opencode/src/session/index.ts)

```typescript
AssistantFinished: BusEvent.define(
  "session.assistant.finished",
  z.object({
    sessionID: SessionID.zod,
    messageID: MessageID.zod,
    finish: MessageV2.Assistant.shape.finish.optional(),
  }),
),
```

**验证项目**:
- ✅ 事件类型名称: `session.assistant.finished`
- ✅ 包含 sessionID 属性
- ✅ 包含 messageID 属性
- ✅ 包含 finish 属性（可选）

### ✅ 2. 事件发布 (packages/opencode/src/session/processor.ts)

```typescript
input.assistantMessage.finish = value.finishReason
input.assistantMessage.cost += usage.cost
input.assistantMessage.tokens = usage.tokens
await Session.updatePart({ /* ... */ })
await Session.updateMessage(input.assistantMessage)

// Publish event when assistant finishes (excluding tool-calls and unknown)
if (value.finishReason && !["tool-calls", "unknown"].includes(value.finishReason)) {
  Bus.publish(Session.Event.AssistantFinished, {
    sessionID: input.sessionID,
    messageID: input.assistantMessage.id,
    finish: value.finishReason as any,
  })
}
```

**验证项目**:
- ✅ 在 AI 消息保存后发布事件
- ✅ 正确过滤 `tool-calls` 和 `unknown` finish reasons
- ✅ 事件包含正确的 sessionID、messageID、finish
- ✅ 发布位置合理（在 updateMessage 之后）

### ✅ 3. 插件示例 (.opencode/plugins/auto-continue.ts)

**功能**:
- ✅ 监听 `session.assistant.finished` 事件
- ✅ 提供 3 个工具: `auto_continue_create`, `auto_continue_list`, `auto_continue_delete`
- ✅ 使用 `/session/{id}/prompt_async` 端点自动发送新消息
- ✅ 支持多种触发条件（always, assistant_finished, message_created）

### ✅ 4. 文档

- ✅ `AUTO_CONTINUE_README.md` - 详细使用说明
- ✅ `install-auto-continue.sh` - 安装脚本
- ✅ 代码注释清晰

### ✅ 5. Git 状态

- ✅ 源码文件已提交
- ✅ 最新提交: `3e0e66541 chore: add installation script for auto-continue feature`
- ✅ 远程分支: `fork/feature/auto-continue-event` 已推送
- ✅ Fork 地址: https://github.com/dyyz1993/opencode

## 功能说明

### 工作原理

1. 用户向 AI 发送消息
2. AI 处理并生成回答
3. 在 `processor.ts` 中，AI 回答保存到数据库时：
   - 设置 `assistantMessage.finish` 为 finish reason
   - 保存消息到数据库
   - **如果 finish reason 有效**（非 "tool-calls"/"unknown"），发布 `AssistantFinished` 事件
4. 插件监听到事件，可以：
   - 自动发送新消息让 AI 继续
   - 记录会话状态
   - 触发其他自动化流程

### Finish Reason 处理

| Finish Reason | 触发事件 | 说明 |
|--------------|---------|------|
| `stop` | ✅ | AI 正常完成回答 |
| `length` | ✅ | 回答达到最大长度 |
| `content-filter` | ✅ | 内容被过滤 |
| `tool-calls` | ❌ | AI 需要调用工具（不触发） |
| `unknown` | ❌ | 未知原因（不触发） |

### 使用示例

```bash
# 安装修改后的 OpenCode
npm install -g https://github.com/dyyz1993/opencode.git#feature/auto-continue-event

# 启动 OpenCode
opencode serve

# 在会话中创建自动继续规则
auto_continue_create \
  sessionID="你的会话ID" \
  prompt="请总结刚才的对话并继续下一步任务" \
  triggerCondition="assistant_finished"

# 列出所有规则
auto_continue_list

# 删除规则
auto_continue_delete id="规则ID"
```

### 插件开发示例

```typescript
import { Hooks } from "@opencode-ai/plugin"

const MyPlugin = async (input): Promise<Hooks> => {
  return {
    event: async ({ event }) => {
      if (event.payload?.type === "session.assistant.finished") {
        const { sessionID, messageID, finish } = event.payload.properties

        // AI 回答完成，执行你的逻辑
        console.log(`Assistant ${sessionID} finished: ${finish}`)

        // 例如：自动发送新消息
        await fetch(`${input.serverUrl.origin}/session/${sessionID}/prompt_async`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            parts: [{ type: "text", text: "请继续..." }]
          })
        })
      }
    }
  }
}
```

## 测试状态

### 已完成的测试

1. ✅ **静态验证**: 源码修改正确
2. ✅ **事件定义验证**: Schema 和类型正确
3. ✅ **Git 验证**: 提交和分支正常
4. ✅ **插件示例验证**: 可以导入，结构正确

### 待完成的测试

以下测试需要在实际运行的 OpenCode 实例中进行：

1. ⏳ **端到端测试**:
   - 启动修改后的 OpenCode
   - 创建会话并让 AI 回答
   - 验证事件是否触发
   - 验证插件是否收到事件

2. ⏳ **插件功能测试**:
   - 使用 `auto_continue_create` 创建规则
   - 让 AI 回答完成
   - 验证是否自动发送新消息

3. ⏳ **多场景测试**:
   - 测试不同的 finish reason（stop, length, content-filter）
   - 验证 tool-calls 不触发事件
   - 测试多个会话同时进行

## 结论

### ✅ 代码实现已完成并通过验证

- 事件定义正确
- 事件发布逻辑正确
- 插件示例可用
- 文档完整
- Git 状态正常

### ✅ 可以进行实际使用测试

修改后的代码已推送到 Fork，可以安装使用：

```bash
npm install -g https://github.com/dyyz1993/opencode.git#feature/auto-continue-event
```

### 📋 下一步建议

1. **安装测试**: 在本地安装并实际测试
2. **场景测试**: 测试不同的使用场景
3. **性能测试**: 验证事件发布不影响性能
4. **文档完善**: 根据实际使用情况补充文档
5. **PR 提交**: 如果功能稳定，考虑向原仓库提交 PR

## 相关资源

- **Fork 地址**: https://github.com/dyyz1993/opencode
- **分支**: feature/auto-continue-event
- **验证脚本**:
  - `scripts/verify-assistant-finished-event.ts` - 事件定义验证
  - `scripts/verify-static.ts` - 静态代码验证
- **文档**: `AUTO_CONTINUE_README.md`
- **安装脚本**: `install-auto-continue.sh`

---

**验证人**: OpenCode AI Assistant
**验证状态**: ✅ 通过
**最后更新**: 2026-05-10
