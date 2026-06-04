"""
config/settings/dev.py
----------------------
Development overrides.
Activated by setting DJANGO_SETTINGS_MODULE=config.settings.dev in .env.

Key differences from prod:
  - DEBUG=True (detailed error pages, SQL query logging)
  - Email printed to the console instead of sent via SMTP
  - django-debug-toolbar available (install separately if needed)
  - Relaxed security headers (no HTTPS enforcement)
"""

from .base import *  # noqa: F401, F403
from decouple import config

DEBUG = True

# ─── Security ─────────────────────────────────────────────────────────────────
# In development the React dev server runs on a different port from Django.
# We allow all localhost origins so Vite HMR works without friction.
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",   # Vite default
    "http://localhost:3000",
    "http://127.0.0.1:5173",
]

# ─── Logging ──────────────────────────────────────────────────────────────────
# Every SQL query is printed to the console so you can see exactly what
# the ORM is generating during development.
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "[{levelname}] {asctime} {module}: {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": "INFO",
        },
        "django.db.backends": {
            "handlers": ["console"],
            "level": "DEBUG",   # Shows every SQL query.
            "propagate": False,
        },
        "barbershop": {
            "handlers": ["console"],
            "level": "DEBUG",
            "propagate": False,
        },
    },
}

# ─── Email ────────────────────────────────────────────────────────────────────
# Emails are printed to the terminal. No SMTP credentials required in dev.
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
