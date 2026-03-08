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
5. After deploy, open the generated public URL.

## Visitor count

The visitor count is based on unique IP addresses seen by the server.
Behind a proxy/CDN, `server.js` reads `x-forwarded-for` and `x-real-ip` first.

## Important note

If your host uses ephemeral disk storage, `analytics.json` may reset on redeploy or restart.
For durable counts, move analytics storage to a database or persistent disk.

## Local run with Node

```bash
node server.js
```

## Local run with PowerShell

```powershell
powershell -ExecutionPolicy Bypass -File .\server.ps1 -Port 8080
```