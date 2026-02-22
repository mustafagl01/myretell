---
description: Automatically push all changes to GitHub after every code modification
---

# Auto Push Workflow

After EVERY code change or set of related changes, automatically commit and push to GitHub.

## Steps

// turbo-all

1. Stage all changes:
```
git add -A
```

2. Commit with a descriptive message:
```
git commit -m "<descriptive message about the changes>"
```

3. Push to main:
```
git push origin main
```

## Notes
- If push fails due to remote changes, run `git pull origin main --no-rebase` first, resolve any conflicts by keeping our local version (`git checkout --ours <files>`), then commit and push again.
- Always use PowerShell-compatible syntax (use `;` instead of `&&` for chaining commands).
- The commit message should briefly describe what was changed.
