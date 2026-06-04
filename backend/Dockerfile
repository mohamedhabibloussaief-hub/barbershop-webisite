# ════════════════════════════════════════════════════════════════
#  Hazem Coiff — Backend Dockerfile
#  Multi-stage: builder compiles deps, runtime is lean & non-root
# ════════════════════════════════════════════════════════════════

# ── Stage 1: dependency builder ──────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /build

# Build tools needed only to compile psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip \
 && pip install --prefix=/install --no-cache-dir -r requirements.txt


# ── Stage 2: runtime ─────────────────────────────────────────────
FROM python:3.12-slim AS runtime

# Runtime PostgreSQL library only (no compiler)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
 && rm -rf /var/lib/apt/lists/*

# Copy compiled packages from builder
COPY --from=builder /install /usr/local

WORKDIR /app

COPY . .

# Create static files dir with correct ownership
RUN mkdir -p /app/staticfiles

# ── Security: non-root user ───────────────────────────────────────
RUN addgroup --system django \
 && adduser --system --ingroup django --no-create-home django \
 && chown -R django:django /app

USER django

EXPOSE 8000

# Default: production Gunicorn. docker-compose.yml overrides with runserver.
CMD ["gunicorn", "config.wsgi:application", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "3", \
     "--threads", "2", \
     "--timeout", "60", \
     "--access-logfile", "-", \
     "--error-logfile", "-"]
