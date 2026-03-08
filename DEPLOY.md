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

## Keep the current visitor count on Render

The app now supports an `ANALYTICS_PATH` environment variable. On first startup, if that file does not exist yet, the server seeds it from the bundled `analytics.json` file in this repo. That lets you carry the current count forward once instead of starting over.

To make the count survive future deploys and restarts on Render:

1. Upgrade the service to a plan that supports persistent disks.
2. Attach a persistent disk in Render and mount it at `/var/data`.
3. Set the environment variable `ANALYTICS_PATH=/var/data/analytics.json`.
4. Deploy once. The server will copy the current analytics data into that disk-backed file the first time it starts.
5. After that, future deploys will keep using the same file on the persistent disk.

If you deploy without a persistent disk, the count can still reset because the service filesystem is ephemeral.

## Visitor count

The visitor count is based on unique IP addresses seen by the server.
Behind a proxy/CDN, `server.js` reads `x-forwarded-for` and `x-real-ip` first.

## Important note

If your host uses ephemeral disk storage, analytics may reset on redeploy or restart unless `ANALYTICS_PATH` points to persistent storage.

## Local run with Node

```bash
node server.js
```

## Local run with PowerShell

```powershell
powershell -ExecutionPolicy Bypass -File .\server.ps1 -Port 8080
```
