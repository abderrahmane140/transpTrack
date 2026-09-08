# transpTrack

A transport tracking system with a **Laravel 12** REST API (`transport-api/`) and a **React 19 / Vite** frontend (`transport-frontend/`), plus real-time updates via Laravel Reverb.

This repo ships a full Docker setup so the whole stack (DB + API + Web) comes up with one command.

---

## Architecture

```
┌──────────────┐    HTTP    ┌────────────────┐    FastCGI    ┌────────────┐
│   web (Nginx)│ ─────────► │ webapi (Nginx) │ ────────────► │ api (PHP-FPM)│
│  React SPA   │            │   /api proxy   │               │   Laravel   │
│  port 5173   │            │   port 8080    │               │             │
└──────────────┘            └────────────────┘               └─────┬──────┘
                                                                   │ TCP 3306
                                                              ┌────▼─────┐
                                                              │   db      │
                                                              │  MySQL 8  │
                                                              │  port 3306│
                                                              └──────────┘
```

Inside Docker, the frontend calls the API at the host port `8080` (i.e. `http://localhost:8080`). If you want the SPA to call the API through the same origin instead, add a `/api` location to `transport-api/docker/nginx.conf` and a `VITE_API_URL=/api` build arg.

---

## Quick start

```bash
# 1. Copy the example env files
cp .env.docker.example .env
cp transport-api/.env.example transport-api/.env

# 2. Generate an APP_KEY (or let the container do it on first boot)
#    The entrypoint auto-generates one if .env has no APP_KEY.

# 3. Build and start the stack
docker compose up -d --build

# 4. Visit
#    Frontend:  http://localhost:5173
#    API:       http://localhost:8080
#    MySQL:     localhost:3307  (user: transptrack / pass: secret)
```

First boot runs `php artisan migrate --force` automatically (set `RUN_MIGRATIONS=false` in `.env` to skip).

---

## Common tasks

```bash
# Tail logs
docker compose logs -f

# Run artisan commands
docker compose exec api php artisan migrate
docker compose exec api php artisan tinker

# Open a shell in the API container
docker compose exec api sh

# Rebuild only one service
docker compose build api
docker compose up -d api

# Tear it all down (keeps DB volume)
docker compose down

# Nuke everything including the DB
docker compose down -v
```

---

## Environment variables

The root `.env` controls the Docker stack (DB creds, host ports, Vite build args). See `.env.docker.example` for the full list.

`transport-api/.env` is loaded into the API container so anything you set there (mail, broadcasting, etc.) is respected. The compose file overrides only the DB connection values to point at the `db` service.

---

## Production notes

- `APP_DEBUG=false` and `APP_ENV=production` are recommended in `.env`.
- The entrypoint runs `config:cache`, `route:cache`, and `view:cache` on boot.
- The React build is fully static and served by a minimal Nginx.
- The MySQL data lives in a named volume (`dbdata`).
- For HTTPS, put a reverse proxy (Caddy / Traefik / Cloudflare) in front of `web` and `webapi` — don't add TLS to the app containers.
- To change ports: edit `API_PORT` and `WEB_PORT` in the root `.env`.
