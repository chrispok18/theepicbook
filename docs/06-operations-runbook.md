# 06 — Operations Runbook (EpicBook)

Author: Christian Aryee
Stack: reverse-proxy (nginx) -> frontend (nginx) / backend (Node 20) -> database (MySQL 8.0)
Location on VM: ~/theepicbook   Public URL: http://54.195.77.105

## Golden rules
- Always run compose commands from ~/theepicbook (check pwd first).
- Never run docker compose down -v (deletes the db_data volume).
- Never print .env or run plain docker compose config (it shows secrets). Use docker compose config -q.

## Safe restart procedure
| Service | Command | Impact |
|---|---|---|
| reverse-proxy | docker compose restart reverse-proxy | ~1-2s of refused connections; logs kept in ./logs/proxy |
| frontend | docker compose restart frontend | CSS/images missing for a few seconds; pages still served |
| backend | docker compose up -d --wait backend | Proxy returns 502 until backend is healthy (~5s) |
| database | docker compose stop database; docker compose up -d --wait | /health returns 503 until MySQL is healthy; data kept in db_data |
| whole stack | docker compose down; docker compose up -d --wait | Short full outage; data kept (no -v) |
After any restart: docker compose ps (all healthy) and curl http://54.195.77.105/health (200).

## Backup and restore
- Backup: docker compose exec -T database sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqldump -uroot --single-transaction --no-tablespaces bookstore' > backups/bookstore-$(date +%Y%m%d-%H%M%S).sql
- Accept only if tail -n 1 shows "-- Dump completed".
- Restore: cat backups/<file>.sql | docker compose exec -T database sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot bookstore'
- Verify: SELECT COUNT(*) FROM Book (expect 54 for the seed data) and /health = 200.
- Full details: docs/05-persistence-and-backup.md

## Secret rotation
1. Generate a new value: openssl rand -hex 16 (never echo it to the screen or chat).
2. Change it inside MySQL first: ALTER USER 'epicbook'@'%' IDENTIFIED BY '<new>'; (run via docker compose exec, root password read from the container env).
3. Update DB_PASSWORD in .env (git-ignored, chmod 600).
4. Recreate the backend so it reads the new value: docker compose up -d --wait backend
5. Verify /health = 200, then delete any copies of the old value.
Note: MYSQL_* variables only apply on the first boot of an empty volume, so changing .env alone does NOT change a live database password. The same steps apply to the root password (ALTER USER 'root'@...).

## Database recovery procedure
1. docker compose ps — is database running/healthy?
2. docker compose logs database --tail 50 — look for disk-full, corruption or auth errors.
3. df -h — MySQL stops if the disk is full; free space with docker builder prune / image prune (never volume prune).
4. Restart: docker compose up -d --wait database
5. If data is damaged: restore the latest verified dump (see above).
6. Verify: row counts, /health = 200, site loads in the browser.

## When the application returns an error
| Symptom | Likely cause | Check |
|---|---|---|
| Connection refused / timeout | VM, security group or proxy down | AWS console, SG port 80, docker compose ps |
| 502 Bad Gateway | Backend stopped or crashed | docker compose ps, docker compose logs backend |
| 503 from /health | Backend up, database unreachable | docker compose ps database, docker compose logs database |
| Page loads without styling | Frontend down or /assets route broken | docker compose ps frontend, curl -I /assets/css/style.css |
| 404 | Wrong path | logs/proxy/epicbook_access.log (uri, status, upstream) |
Always check: docker compose ps, proxy access/error logs in ./logs/proxy, backend logs, df -h.

## Reliability test results (2026-10-08)
| Test | Failure observed | Recovery |
|---|---|---|
| Stop backend | Proxy returned HTTP 502 Bad Gateway | docker compose up -d --wait backend -> healthy in ~6s, /health 200 |
| Stop database | /health returned 503 {"database":"unreachable"}; /api/cart returned 502 | docker compose up -d --wait -> all healthy in ~7s, /health 200, 54 books intact |

Finding: during the database outage the original /api/cart route did not handle the DB error and the backend process restarted (restart: unless-stopped recovered it). Improvement: add error handling in the cart routes so they return 503 instead of crashing.
Finding: running docker compose down in the wrong folder stopped EpicBook by mistake; no data was lost because the named volume was kept. Always check pwd.
