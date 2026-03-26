## 安装

```
// 全局安装
npm install -g @anthropic-ai/claude-code

// 更新
npm update -g @anthropic-ai/claude-code

// 验证
claude --version
```



## 配置模型

- 常用国内模型

| 模型             | API地址                                         | 模型名称                | 获取API Key                                                  |
| ---------------- | ----------------------------------------------- | ----------------------- | ------------------------------------------------------------ |
| **智谱 GLM-4.7** | `https://open.bigmodel.cn/api/anthropic`        | `glm-4.7`               | [open.bigmodel.cn/](https://link.juejin.cn?target=https%3A%2F%2Fopen.bigmodel.cn%2F) |
| **Kimi K2**      | `https://api.moonshot.cn/anthropic`             | `kimi-k2-turbo-preview` | [platform.moonshot.cn/console/acc…](https://link.juejin.cn?target=https%3A%2F%2Fplatform.moonshot.cn%2Fconsole%2Faccount) |
| **通义千问**     | `https://dashscope.aliyuncs.com/apps/anthropic` | `qwen-coder-plus`       | [bailian.console.aliyun.com/](https://link.juejin.cn?target=https%3A%2F%2Fbailian.console.aliyun.com%2F) |
| **DeepSeek**     | `https://api.deepseek.com/anthropic`            | `deepseek-chat`         | [platform.deepseek.com/](https://link.juejin.cn?target=https%3A%2F%2Fplatform.deepseek.com%2F) |

- 配置示例

```
 // .claude/settings.json(glm)
{
    "env": {
        "ANTHROPIC_AUTH_TOKEN": "xxxxxx",
        "ANTHROPIC_BASE_URL": "https://open.bigmodel.cn/api/anthropic",
        "ANTHROPIC_MODEL": "glm-4.7",
        "ANTHROPIC_SMALL_FAST_MODEL": "glm-4.5-air"
    }
}
```

## 核心概念
### 扩展 claude code
| **CLAUDE.md**                                                | 每次对话加载的持久上下文            | 项目约定、“始终执行 X” 规则                | ”使用 pnpm，而不是 npm。提交前运行测试。“                 |
| ------------------------------------------------------------ | ----------------------------------- | ------------------------------------------ | --------------------------------------------------------- |
| **Skill**                                                    | Claude 可以使用的说明、知识和工作流 | 可重用内容、参考文档、可重复的任务         | `/deploy` 运行您的部署清单；包含端点模式的 API 文档 skill |
| **Subagent**                                                 | 返回摘要结果的隔离执行上下文        | 上下文隔离、并行任务、专门的工作者         | 读取许多文件但仅返回关键发现的研究任务                    |
| **[Agent teams](https://code.claude.com/docs/zh-CN/agent-teams)** | 协调多个独立的 Claude Code 会话     | 并行研究、新功能开发、使用竞争假设进行调试 | 生成审查者同时检查安全性、性能和测试                      |
| **MCP**                                                      | 连接到外部服务                      | 外部数据或操作                             | 查询您的数据库、发布到 Slack、控制浏览器                  |
| **Hook**                                                     | 在事件上运行的确定性脚本            | 可预测的自动化，不涉及 LLM                 | 每次文件编辑后运行 ESLint                                 |


## 常用资源
[claude code 官方文档](https://code.claude.com/docs/zh-CN/)
[claude code 中文文档](https://claudecn.com/docs/claude-code/)