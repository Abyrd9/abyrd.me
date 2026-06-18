---
name: deploy
description: >
  Deploy the abyrd.me repo to production. Use when the user asks to deploy,
  ship, publish, push live, or land current work on main and release it. This
  skill is repo-specific: commit the intended diff, fast-forward main, push
  origin/main, and deploy the local checkout to Railway project `abyrd.me`
  production service `Bun Server`.
---

# Deploy

Use this only in the `abyrd.me` repo.

## Target

- Git remote: `origin`
- Branch to publish: `main`
- Railway project: `abyrd.me`
- Railway project id: `8a0ee622-d6db-462c-9f6d-35d9652f91e4`
- Railway environment: `production`
- Railway service: `Bun Server`
- Railway service id: `e916418d-a715-40bb-bec6-1f1438572ce2`

## Steps

1. Verify the git state.
   - Run `git status --short --branch`
   - Run `git show -s --oneline --decorate HEAD`
   - If on detached `HEAD`, create a branch before committing.

2. Commit only the intended files.
   - Stage the exact deployable diff.
   - Write one concise commit message.
   - Do not deploy from uncommitted state.

3. Land the commit on `main`.
   - If `main` is available in the current worktree, fast-forward merge normally.
   - If `main` is checked out in another dirty worktree, do not touch that checkout's files.
   - Verify `git rev-list --left-right --count main...HEAD` returns `0 1`.
   - Fast-forward the ref directly with `git update-ref refs/heads/main <head_sha> <old_main_sha>`.
   - Verify with `git show -s --oneline --decorate main`.

4. Push `main`.
   - Run `git push origin main`.

5. Deploy the local checkout to Railway.
   - Prefer the Railway CLI path for this repo.
   - Reuse one stable `RAILWAY_AGENT_SESSION` value across the deploy flow.
   - Preflight with:
     - `RAILWAY_CALLER=skill:use-railway@1.2.2 RAILWAY_AGENT_SESSION=<session> railway whoami --json`
   - This worktree may be unlinked. Do not run `railway link`.
   - If context must be rediscovered, use `railway project list --json` and target the `abyrd.me` project ids above.
   - Deploy with:

```bash
RAILWAY_CALLER=skill:use-railway@1.2.2 \
RAILWAY_AGENT_SESSION=<session> \
railway up \
  --project 8a0ee622-d6db-462c-9f6d-35d9652f91e4 \
  --environment production \
  --service "Bun Server" \
  --ci \
  -m "<release summary>"
```

6. Wait for the deploy result and report:
   - commit sha
   - push result
   - deploy result

## Guardrails

- Do not guess the Railway target from local config alone.
- Do not mutate another worktree just to move `main`.
- Do not deploy from a dirty checkout unless the user explicitly asks for that.
- If Railway or `git push` is blocked by the sandbox, rerun those commands with escalation instead of changing the flow.
