# ════════════════════════════════════════════════════════════════
#  Hazem Coiff — Frontend Dockerfile
#  Stage "dev"  → Vite dev server (used by docker-compose.yml)
#  Stage "prod" → Built dist served by Nginx (docker-compose.prod.yml)
# ════════════════════════════════════════════════════════════════

# ── Base: Node 20 ────────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --silent


# ── Stage: dev ───────────────────────────────────────────────────
FROM base AS dev
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]


# ── Stage: build ─────────────────────────────────────────────────
FROM base AS builder
COPY . .
RUN npm run build


# ── Stage: prod (Nginx) ──────────────────────────────────────────
FROM nginx:1.27-alpine AS prod
COPY --from=builder /app/dist /usr/share/nginx/html
# Nginx config is volume-mounted by docker-compose.prod.yml
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
