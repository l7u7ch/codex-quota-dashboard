# Codex Quota Dashboard

## Dokploy deployment

Mount a persistent Dokploy volume at `/app/data`. The application stores all durable state there:

- `auth.json`: dashboard login configuration and session signing key
- `accounts.json`: registered account index
- `profiles/<account-uuid>/`: Codex-managed ChatGPT authentication state

On the first startup, the application creates `auth.json` with the initial dashboard credentials `admin` / `admin`. Change these credentials before exposing the dashboard outside a trusted network.

`data/` is intentionally excluded from Git. Do not set `CODEX_USAGE_DATA_DIR`; the application always uses `/app/data` when run from the application root.
