# Git 与协作

> 承上：[系统设计](./06-系统设计) —— 多服务协作离不开分支策略与 Code Review 流程，先懂架构再看协作

---

## Git 工作流

### 常见工作流

| 工作流 | 说明 | 适用场景 |
|--------|------|---------|
| GitHub Flow | main + feature 分支，PR 合并 | 小型团队、持续部署 |
| Git Flow | main + develop + feature + release 分支 | 中大型项目、版本发布 |
| Trunk-Based | 所有人在 main 上开发，短命分支 | 高频发布、CI/CD 成熟 |

### GitHub Flow 示例

```bash
# 1. 从 main 创建功能分支
git checkout -b feature/user-login

# 2. 开发和提交
git add .
git commit -m "feat: add user login API"

# 3. 推送并创建 PR
git push origin feature/user-login
# 在 GitHub 上创建 Pull Request

# 4. 代码审查通过后合并到 main
git checkout main
git merge feature/user-login
```

## 合并策略

| 策略 | 命令 | 特点 |
|------|------|------|
| Merge | `git merge feature` | 保留完整历史，有合并提交 |
| Rebase | `git rebase main` | 线性历史，无合并提交 |
| Squash | 合并时选择 | 将多个提交压缩为一个 |

### 提交信息规范

```bash
# Conventional Commits 规范
<type>(<scope>): <subject>

feat: add user login API
fix: fix token expiration bug
docs: update README
refactor: extract auth middleware
test: add user service tests
chore: update dependencies
```

## Code Review 实践

### 审查清单

- [ ] 代码是否符合项目规范？
- [ ] 是否有不必要的复杂性？
- [ ] 异常处理是否完善？
- [ ] 是否有安全漏洞？
- [ ] 测试是否覆盖？

### 好的 Review 习惯

- 每次 PR 不要太大（200-300 行以内）
- 先理解整体逻辑，再看细节
- 指出问题，同时给出建议
- 尊重作者，用"建议"代替"要求"

---

## 参考

- 上一篇：[系统设计](./06-系统设计)