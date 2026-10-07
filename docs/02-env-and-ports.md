# 02 — Environment Variables, Ports, Persistence and Health Checks

Author: Christian Aryee. Discovered from server.js, models/index.js, config/config.json, routes/ and db/.

## Components and ports

| Service | Technology | Start command | Internal port | Published to host? |
|---|---|---|---|---|
| reverse-proxy | nginx:alpine | nginx | 80 | YES (80:80), the only public port |
| frontend | nginx:alpine serving public/assets | nginx | 80 | No |
| backend | Node.js 20, Express + Handlebars | node server.js | 8080 (PORT, defaults to 8080) | No |
| database | MySQL 8.0 | mysqld | 3306 | No |

## Environment variable names (real values live only in the git-ignored .env)

Backend container:
- NODE_ENV: set to production so the app uses the production block of config/config.json
- PORT: internal listen port (8080)
- JAWSDB_URL: MySQL connection URL built from DB_USER, DB_PASSWORD and DB_NAME, host "database"

Database container:
- MYSQL_ROOT_PASSWORD, MYSQL_DATABASE, MYSQL_USER, MYSQL_PASSWORD

Keys in .env (names only, values never committed):
- DB_NAME, DB_USER, DB_PASSWORD, DB_ROOT_PASSWORD

DB_NAME must be "bookstore" because the SQL scripts in db/ hard-code USE bookstore.

## Routes and API prefix

- Pages (backend): GET /, POST /category/:categoryName, GET /cart, GET /gallery
- API prefix /api (backend): GET /api/cart, POST /api/cart, DELETE /api/cart/delete
- Static assets (frontend): /assets/css, /assets/img, /assets/js
- Health: not present in the original code. Added GET /health in Task 3. It returns 200 only when the database connection works, otherwise 503.

## Persistent data

- MySQL data directory /var/lib/mysql is stored in the named volume db_data.
- Tables: Author, Book, Cart and the cart/book join table.
- First-boot initialisation: db/BuyTheBook_Schema.sql, db/author_seed.sql and db/books_seed.sql are mounted read-only into /docker-entrypoint-initdb.d. They only run when the volume is empty.
- The app has no file uploads, so no other volume is needed.
- Reverse-proxy logs are bind-mounted to ./logs/proxy on the host (Task 6).

## Health-check methods

| Service | Method |
|---|---|
| database | mysqladmin ping over TCP (-h 127.0.0.1) |
| backend | wget http://127.0.0.1:8080/health inside the container |
| frontend | wget --spider http://127.0.0.1/assets/css/style.css |
| reverse-proxy | wget http://127.0.0.1/health, which proves the proxy can reach the backend |
