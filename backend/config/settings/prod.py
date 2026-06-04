"""
config/settings/prod.py
-----------------------
Production overrides.
Activated by setting DJANGO_SETTINGS_MODULE=config.settings.prod in the
production .env file on the OVH server.

Key differences from dev:
  - DEBUG=False (no stack traces exposed to the public)
  - HTTPS enforcement via HSTS and secure cookies
  - Real SMTP backend (SendGrid / Mailgun)
  - Tighter security headers
  - Structured JSON logging (easier to parse in log aggregators)
"""

from .base import *  # noqa: F401, F403
from decouple import config

DEBUG = False

# ─── Security headers ─────────────────────────────────────────────────────────
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000         # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"

# ─── CORS ─────────────────────────────────────────────────────────────────────
# Only the production domain is allowed. No wildcard.
CORS_ALLOWED_ORIGINS = config("CORS_ALLOWED_ORIGINS", default="").split(",")

# ─── Logging ──────────────────────────────────────────────────────────────────
# Structured JSON logs are easier to ingest into a log aggregator (ELK, Loki).
# SQL query logging is OFF in production — never log queries in prod.
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {
            "format": '{"time":"%(asctime)s","level":"%(levelname)s","module":"%(module)s","message":"%(message)s"}',
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "json",
        },
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": "WARNING",
        },
        "barbershop": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
    },
}

# ─── Email ────────────────────────────────────────────────────────────────────
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = config("EMAIL_HOST", default="smtp.sendgrid.net")
EMAIL_PORT = config("EMAIL_PORT", default=587, cast=int)
EMAIL_USE_TLS = True
EMAIL_HOST_USER = config("EMAIL_HOST_USER", default="apikey")
EMAIL_HOST_PASSWORD = config("EMAIL_HOST_PASSWORD")
