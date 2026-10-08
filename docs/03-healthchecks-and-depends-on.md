# 03 — Health Checks and Startup Order

Author: Christian Aryee

## Health-check method for each service

| Service | Health check | What "healthy" proves |
|---|---|---|
| database | mysqladmin ping -h 127.0.0.1 (every 10s, 10 retries, 40s start period) | MySQL accepts real TCP connections, the same path the backend uses. Using 127.0.0.1 instead of localhost avoids a false "healthy" from the temporary socket-only server MySQL runs during first-boot initialisation. |
| backend | wget http://127.0.0.1:8080/health (every 10s, 5 retries, 20s start period) | /health runs sequelize.authenticate(): 200 only when the database answers, 503 otherwise. The app only starts listening after its database sync succeeds. |
| frontend | wget --spider http://127.0.0.1/assets/css/style.css (every 10s) | Nginx is up AND serving a real static file, not just a running process. |
| reverse-proxy | wget http://127.0.0.1/health (every 15s) | Nginx is up AND can route to a healthy backend end to end. |

No extra packages were installed for health checks: busybox wget already ships in node:20-alpine and nginx:alpine, and mysqladmin ships in mysql:8.0.

## Startup dependency order (depends_on: condition: service_healthy)

1. database starts first and must become healthy.
2. backend waits for database to be healthy, then starts and must become healthy.
3. frontend has no dependencies and becomes healthy on its own.
4. reverse-proxy waits until BOTH frontend and backend are healthy, so the public entry point never opens in front of a half-ready app.

Observed on first start: database healthy at ~16s, frontend ~17s, backend ~22s, then reverse-proxy started.

## Why not a plain depends_on list?

A plain depends_on only waits for a container to START. A started MySQL container can still be initialising and refusing connections, which would crash the backend on boot. service_healthy waits for the real readiness checks above.

## Recovery

All services use restart: unless-stopped, so crashed containers restart automatically, while a deliberate operator stop is respected.
