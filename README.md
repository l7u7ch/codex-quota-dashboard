# Codex Quota Dashboard

## Dokploy deployment

Mount a persistent Dokploy volume at `/app/data`. The application stores all durable state there:

- `auth-v2.json`: dashboard login configuration and session signing key
- `accounts.json`: registered account index
- `profiles/<account-uuid>/`: Codex-managed ChatGPT authentication state

On the first visit, the application redirects to `/setup` to create the administrator ID and password. Complete setup on a trusted network before exposing the dashboard: the first visitor can claim the administrator account. Setup can only succeed once. Existing `auth.json` credentials and sessions are ignored; upgrading requires creating a new account, while registered Codex accounts remain in place.

`data/` is intentionally excluded from Git. Do not set `CODEX_USAGE_DATA_DIR`; the application always uses `/app/data` when run from the application root.
