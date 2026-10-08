# 04 — Reverse Proxy Routing and CORS

Author: Christian Aryee

## Single entry point
- Only the reverse-proxy (nginx:alpine) publishes a port: 80:80.
- frontend (80), backend (8080) and database (3306) are reachable only on the internal Docker networks.
- Public URL: http://54.195.77.105

## Routing rules (proxy/nginx.conf)

| Path | Goes to | Why |
|---|---|---|
| /assets/ | frontend:80 | Static CSS, images and JS served by Nginx |
| = /health | backend:8080 | Health endpoint (access log off to avoid probe noise) |
| /api/ | backend:8080 | JSON API (cart routes) |
| / | backend:8080 | Server-rendered Handlebars pages |

Headers passed upstream: Host, X-Real-IP, X-Forwarded-For, X-Forwarded-Proto.

## CORS decision
- CORS was NOT required.
- The browser loads the pages, the /api calls and the /assets files from the same origin: http://54.195.77.105 (same scheme, host and port).
- Browsers only enforce CORS on cross-origin requests, so no Access-Control-Allow-* headers were added.
- Leaving CORS headers out keeps the attack surface smaller. A wildcard Access-Control-Allow-Origin: * would let any website call the API.
- If the frontend ever moved to its own domain, I would allow only that exact origin in the proxy, never *.

## Verification (results from my VM)
- curl -sI http://54.195.77.105/ returned HTTP/1.1 200 OK (backend page)
- curl -s http://54.195.77.105/api/cart returned {"cart":[],"book":null} (backend API)
- curl -sI http://54.195.77.105/assets/css/style.css returned 200 OK, Content-Type: text/css (frontend)
- curl -s http://54.195.77.105/health returned {"status":"ok","database":"connected"}
- Browser at http://54.195.77.105 shows the styled EpicBook page.
