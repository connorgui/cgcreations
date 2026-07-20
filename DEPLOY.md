# Deployment

This project can be deployed as a Node web service.

## Render

1. Push this folder to a GitHub repository.
2. In Render, create a new Web Service from that repo.
3. Render should detect `render.yaml` automatically.
4. If prompted manually:
   - Runtime: Node
   - Build command: `npm install`
   - Start command: `node server.js`
5. In Render, add the environment variable `DATABASE_URL` with your Neon connection string.
6. If you want country logging, also add `IPINFO_TOKEN`.
7. To enable the AI Assistant with Groq's free plan, add `GROQ_API_KEY`. You can optionally set `GROQ_MODEL`; the default is `openai/gpt-oss-20b`.
8. After deploy, open the generated public URL.

Never put `GROQ_API_KEY` in an HTML or browser JavaScript file. The server reads it from Render Environment and sends AI requests without exposing it to visitors.

## Keep the current visitor count with Neon

When `DATABASE_URL` is set, the server stores visitor IPs in Postgres instead of `analytics.json`.
On the first startup against an empty database, the server seeds the table from the bundled `analytics.json` file in this repo. That lets you carry the current count forward once instead of starting over.

To make the count survive future deploys and restarts:

1. Create a Neon project.
2. Copy the Neon connection string.
3. In Render, add `DATABASE_URL` with that connection string.
4. Deploy once. The server will create the `visitor_ips` table automatically.
5. If the table is empty, the server will seed it from this repo's `analytics.json`.
6. After that, future deploys will keep using the same Postgres data.

If `DATABASE_URL` is not set, the app falls back to file storage and the count can still reset on hosts with ephemeral filesystems.

## Optional file-based fallback

The app still supports `ANALYTICS_PATH` for file-based storage.
Use that only if you are intentionally storing analytics in a file instead of Neon/Postgres.

## Visitor logs with country

The app can log visitor visits to the Render logs with timestamp, IP address, country, visit type, and total unique user count.

To enable country logging:

1. Create an IPinfo Lite token.
2. In Render, add the environment variable `IPINFO_TOKEN` with that token value.
3. Redeploy the service.

If `IPINFO_TOKEN` is not set, the app still logs visits, but country will show as `Unknown`.

## Visitor count

The visitor count is based on unique IP addresses seen by the server.
When `DATABASE_URL` is set, those IPs are stored in Postgres.
Behind a proxy/CDN, `server.js` reads `x-forwarded-for` and `x-real-ip` first.

## Important note

If you use file storage on a host with ephemeral disk storage, analytics may reset on redeploy or restart.
Using Neon/Postgres avoids that reset.

## Local run with Node

```bash
node server.js
```

## Local run with PowerShell

```powershell
powershell -ExecutionPolicy Bypass -File .\server.ps1 -Port 8080
```
