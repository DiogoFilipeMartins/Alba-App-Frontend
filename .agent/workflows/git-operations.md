---
description: Git operations for Alba-App repository
---

# Git Operations Workflow

Repository: https://github.com/DiogoFilipeMartins/Alba-App

## Commit Changes

When the user asks to commit:

// turbo-all

1. Stage all changes:
```bash
git add .
```

2. Commit with the provided message (or generate an appropriate one):
```bash
git commit -m "message"
```

3. Push to origin:
```bash
git push origin main
```

## Pull Changes

When the user asks to pull:

1. Pull from origin:
```bash
git pull origin main
```

## Check Status

When the user asks for status:

1. Show git status:
```bash
git status
```

## Notes
- Always use descriptive commit messages
- If no message is provided, generate one based on the changes made
- The main branch is assumed to be `main` (adjust if different)
