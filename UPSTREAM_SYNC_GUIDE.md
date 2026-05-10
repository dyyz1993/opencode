# Upstream 同步指南

## 当前状态

### ✅ Fork 基于最新版本

你的 Fork **不是旧版本**！它基于 OpenCode 原仓库的最新 `dev` 分支：

```
origin/dev:     fee3c196c (最新)
fork分支:       36b7d1e54 (基于 fee3c196c + 4 个新提交)
```

### 分支结构

```
origin/dev (upstream)
  ↓
  fee3c196c - 6c047391b - 350df0b26 - ...
  ↓
  a9ec99ab5 - 151b767b9 - 3e0e66541 - 36b7d1e54
  ↓
fork/feature/auto-continue-event (your changes)
```

## 如何保持同步

### 方法 1: 定期同步到 feature 分支

```bash
# 1. 切换到你的功能分支
git checkout feature/auto-continue-event

# 2. 获取上游最新更改
git fetch origin

# 3. 合并上游的 dev 分支（如果有冲突需要解决）
git merge origin/dev

# 4. 推送到你的 fork
git push fork feature/auto-continue-event
```

### 方法 2: 使用 rebase（保持线性历史）

```bash
# 1. 切换到功能分支
git checkout feature/auto-continue-event

# 2. 获取上游最新
git fetch origin

# 3. Rebase 你的提交到最新的 dev
git rebase origin/dev

# 4. 如果有冲突，解决后：
git add .
git rebase --continue

# 5. 强制推送到 fork（因为 rebase 改变了历史）
git push fork feature/auto-continue-event --force-with-lease
```

### 方法 3: 定期创建新的同步分支

如果不想修改现有分支，可以创建新的同步分支：

```bash
# 1. 从最新的 origin/dev 创建新分支
git checkout -b feature/auto-continue-event-v2 origin/dev

# 2. Cherry-pick 你的更改
git cherry-pick a9ec99ab5 151b767b9 3e0e66541 36b7d1e54

# 3. 推送新分支
git push fork feature/auto-continue-event-v2
```

## 自动化同步脚本

创建 `scripts/sync-upstream.sh`:

```bash
#!/bin/bash

set -e

echo "========================================"
echo "同步 OpenCode Upstream"
echo "========================================"

# 获取上游最新
echo "1. 获取上游最新代码..."
git fetch origin

# 检查是否有新提交
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/dev)

if [ "$LOCAL" = "$REMOTE" ]; then
  echo "✓ 已经是最新版本，无需同步"
  exit 0
fi

echo "2. 检测到新提交，准备同步..."
git log --oneline HEAD..origin/dev | head -5

# 询问是否继续
read -p "是否继续同步？(y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "取消同步"
  exit 0
fi

# 合并上游
echo "3. 合并上游更改..."
git merge origin/dev --no-edit

# 检查冲突
if [ -n "$(git status --porcelain)" ]; then
  echo "⚠ 检测到冲突，请手动解决后继续"
  echo "  解决冲突后运行:"
  echo "  git add ."
  echo "  git commit"
  exit 1
fi

echo "4. 推送到 fork..."
git push fork feature/auto-continue-event

echo ""
echo "✅ 同步完成！"
echo "  本地分支: $(git branch --show-current)"
echo "  最新提交: $(git log -1 --oneline)"
```

使用方法：

```bash
chmod +x scripts/sync-upstream.sh
./scripts/sync-upstream.sh
```

## 验证同步状态

```bash
# 查看本地和上游的差异
git log --oneline HEAD..origin/dev

# 查看上游和本地的差异
git log --oneline origin/dev..HEAD

# 查看完整的分支图
git log --oneline --graph --all --decorate | head -30
```

## 推荐的同步频率

- **主动开发时**: 每天或每次提交前同步
- **维护时**: 每周同步一次
- **发布前**: 必须同步并测试

## 处理冲突

如果合并/Rebase 时出现冲突：

```bash
# 1. 查看冲突文件
git status

# 2. 手动解决冲突（编辑文件）
# <<<<<<< HEAD
# 你的更改
# =======
# 上游的更改
# >>>>>>> origin/dev

# 3. 标记为已解决
git add <冲突文件>

# 4. 继续 rebase/merge
git rebase --continue
# 或
git commit

# 5. 推送
git push fork feature/auto-continue-event
```

## 创建 PR 到上游

当功能稳定后，可以创建 PR 到原仓库：

```bash
# 使用 GitHub CLI
gh pr create \
  --title "feat: add Session.Event.AssistantFinished event" \
  --body "描述你的更改..." \
  --base dev \
  --head dyyz1993:feature/auto-continue-event
```

或手动在 GitHub 上创建：
1. 访问 https://github.com/sst/opencode
2. 点击 "Pull requests" → "New pull request"
3. 选择 `dev` (base) 和 `dyyz1993:feature/auto-continue-event` (compare)

## 总结

- ✅ 你的 Fork **已经是最新版本**（基于 origin/dev 的最新提交）
- ✅ 可以安全使用，不用担心版本过时
- ✅ 建议定期同步以获取上游更新
- ✅ 使用脚本可以自动化同步过程
- ✅ 同步不会丢失你的更改（会合并或 rebase）

## 相关资源

- **Fork 地址**: https://github.com/dyyz1993/opencode
- **原仓库**: https://github.com/sst/opencode
- **当前分支**: feature/auto-continue-event
- **同步脚本**: `scripts/sync-upstream.sh`（待创建）
