# Codex Usage Dashboard

複数のChatGPTアカウントについて、Codex／Work共有利用枠を一覧表示するローカル向けダッシュボードです。OpenAI公式のCodex App Server `account/rateLimits/read` を使用し、5時間枠・週間枠の残量とリセット時刻を表示します。

## 構成

- Next.js 16 / React 19
- shadcn/ui / Tailwind CSS
- `@openai/codex` App Server
- アカウント別に隔離した `CODEX_HOME`
- ChatGPT device-code login（認証情報をブラウザへ返しません）

> 表示対象は通常のChatGPT Chat全体ではなく、CodexとWorkで共有される利用枠です。

## 開発

```bash
npm install
npm run dev
```

`http://localhost:3000` を開き、「アカウントを追加」からログインします。

## 本番実行

```bash
npm ci
npm run build
CODEX_USAGE_DATA_DIR=/var/lib/codex-usage-dashboard npm start -- --hostname 0.0.0.0
```

`CODEX_USAGE_DATA_DIR` は永続化し、実行ユーザーだけが読み書きできる権限にしてください。保存先にはCodexの認証情報が含まれます。

## Docker Compose

```bash
docker compose up -d --build
```

利用データは `codex-usage-data` ボリュームへ保存されます。

## セキュリティ

- このアプリ自体には利用者認証を実装していません。インターネットへ直接公開しないでください。
- LAN内で共有する場合も、リバースプロキシ側で認証とHTTPSを設定してください。
- アカウントごとの認証情報はサーバー内の隔離プロファイルに保存され、APIレスポンスには含まれません。

## 検証

```bash
npm test
npm run lint
npm run typecheck
npm run build
```
