# 05 — Persistence, Backup and Restore

Author: Christian Aryee
Drill date: 2026-10-08

## Where the data lives
- MySQL data directory /var/lib/mysql is stored in the named volume epicbook_db_data.
- Host path: /var/lib/docker/volumes/epicbook_db_data/_data
- Containers can be removed and recreated; the volume is kept unless someone runs docker compose down -v (never used here).

## Backup method
- Logical backup with mysqldump, run inside the database container, saved to ./backups on the VM host.
- --single-transaction gives a consistent snapshot without locking tables.
- The password is read from the container's environment (MYSQL_PWD), so it never appears on screen or in shell history.
- backups/ is in .gitignore, so dumps are never pushed to GitHub.

Command:
    BACKUP=backups/bookstore-$(date +%Y%m%d-%H%M%S).sql
    docker compose exec -T database sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqldump -uroot --single-transaction --no-tablespaces bookstore' > "$BACKUP"

A backup is only accepted if its last line reads "-- Dump completed on ...".

## Backup plan (routine)
| Item | Plan |
|---|---|
| Frequency | Daily at 02:00 via cron on the VM, plus a manual dump before every deployment or schema change |
| Retention | 7 daily + 4 weekly dumps on the VM; older files deleted automatically |
| Off-site copy | Daily dump copied to a private, encrypted S3 bucket (survives loss of the VM or its disk) |
| Verification | Check the "Dump completed" line after each run; full test restore once a month |
| RPO / RTO | Up to 24 hours of data loss (daily dumps); restore takes a few minutes |

## Restore procedure
1. Pick the dump to restore: ls -lh backups/
2. Confirm it is complete: tail -n 1 backups/<file>.sql shows "Dump completed".
3. Make sure the database container is healthy: docker compose ps
4. Restore:
       cat backups/<file>.sql | docker compose exec -T database sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot bookstore'
5. Verify: count the rows in Book and check a known record.
6. Check the app: curl http://54.195.77.105/health returns 200, and the site loads in the browser.

## Drill results (2026-10-08)
| Step | Result |
|---|---|
| Before | 54 books; test record id 1 = "28 Summers" |
| Backup | backups/bookstore-20261008-205940.sql, 33K, 5 tables, "Dump completed" |
| Controlled loss | DELETE id 1; count 53; id 1 rows = 0 |
| Restore | Count back to 54; "28 Summers" present again |
| docker compose down then up --wait (no -v) | Volume kept; all services healthy; still 54 books |

## Lessons learned
- docker compose exec -T reads standard input; when pasting several lines it swallowed the following commands. Adding < /dev/null to non-interactive queries fixed it.
- Never run docker compose down -v on a stack with real data; -v deletes the named volume.
