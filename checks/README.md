# Standing rules (automatic checks)

One command runs every rule: `pnpm check` (full, same as CI) or `pnpm check:fast` (what the pre-commit hook runs). Install the hook once with `pnpm hooks:install`.

| Rule | Where | What it catches |
| --- | --- | --- |
| No regression | scripts/check.sh | failing tests, type errors, a broken production build |
| No spending without his OK | scripts/no-spend-check.mjs | new dependencies, paid-service names, new key variables, new external hosts, Vercel compute settings, scheduled workflows |
| No secrets | scripts/secrets-scan.mjs | keys, tokens, JWTs, private keys, passwords in URLs, .env files |
| One lockfile | scripts/pr-rules.mjs | package-lock.json present, dependencies changed without pnpm-lock.yaml |
| Prod database | scripts/pr-rules.mjs | migration in a PR without a `Prod migration:` line in the description |
| Rules are his | scripts/pr-rules.mjs | changes to scripts/, checks/, .githooks/, .github/ without `Rules change approved by Pakshiraj: yes` |

The allow-lists in `checks/allowed.json` are read from the main branch, not from the change being checked, so a change cannot approve itself. Add an approved dependency, key variable or host in its own PR that Pakshiraj merges first.

`checks/check.yml` is the GitHub Actions workflow. GitHub only runs it from `.github/workflows/check.yml`; Pakshiraj adds it there himself.

Limits: this is a tripwire for the obvious routes. It cannot see spend caused by a dashboard setting change, or by calling an already-approved paid service more often. The local hook can be skipped with `--no-verify`; CI cannot.
