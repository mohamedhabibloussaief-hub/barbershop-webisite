"""
config/settings/base.py
-----------------------
Settings that are identical across ALL environments.
Nothing here should ever be environment-specific.
Environment-specific values live in dev.py / prod.py and are read
from the .env file through python-decouple.
"""

from pathlib import Path
from datetime import timedelta
from decouple import config, Csv

# ─── Paths ────────────────────────────────────────────────────────────────────
# BASE_DIR points to the backend/ directory (where manage.py lives).
BASE_DIR = Path(__file__).resolve().parent.parent.parent


# ─── Security ─────────────────────────────────────────────────────────────────
SECRET_KEY = config("SECRET_KEY")

ALLOWED_HOSTS = config("ALLOWED_HOSTS", cast=Csv())


# ─── Application definition ───────────────────────────────────────────────────
DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
]

LOCAL_APPS = [
    "apps.core",
    "apps.users",
    "apps.services",
    "apps.employees",
    "apps.appointments",
    "apps.notifications",
    "apps.reviews",
    "apps.analytics",
    # Added here as each app is created in Phase 2 steps 3–10.
    # e.g. "apps.services", "apps.appointments"
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS


# ─── Middleware ───────────────────────────────────────────────────────────────
# CorsMiddleware MUST come before CommonMiddleware.
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]


# ─── URL & WSGI ───────────────────────────────────────────────────────────────
ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"


# ─── Templates ────────────────────────────────────────────────────────────────
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]


# ─── Database ─────────────────────────────────────────────────────────────────
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": config("DB_NAME"),
        "USER": config("DB_USER"),
        "PASSWORD": config("DB_PASSWORD"),
        "HOST": config("DB_HOST", default="db"),
        "PORT": config("DB_PORT", default="5432"),
        "OPTIONS": {
            # Enforce UTF-8 client encoding at the connection level.
            "client_encoding": "UTF8",
        },
        "CONN_MAX_AGE": 60,  # Reuse DB connections for 60 s (improves throughput).
    }
}


# ─── Password validation ──────────────────────────────────────────────────────
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]


# ─── Internationalisation ─────────────────────────────────────────────────────
LANGUAGE_CODE = "en-us"
TIME_ZONE = "Africa/Tunis"
USE_I18N = True
USE_TZ = True          # All datetimes stored in UTC in the database.


# ─── Static files ─────────────────────────────────────────────────────────────
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"   # collectstatic writes here for Nginx.


# ─── Default primary key ──────────────────────────────────────────────────────
# We use UUIDField on every model explicitly, but this guards any model
# that accidentally omits a primary key definition.
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# ─── Django REST Framework ────────────────────────────────────────────────────
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        # Every endpoint requires a valid JWT unless overridden at the view level.
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "DEFAULT_PARSER_CLASSES": [
        "rest_framework.parsers.JSONParser",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "EXCEPTION_HANDLER": "config.exceptions.custom_exception_handler",
}


# ─── Simple JWT ───────────────────────────────────────────────────────────────
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(
        minutes=config("JWT_ACCESS_TOKEN_LIFETIME", default=15, cast=int)
    ),
    "REFRESH_TOKEN_LIFETIME": timedelta(
        days=config("JWT_REFRESH_TOKEN_LIFETIME", default=7, cast=int)
    ),
    "ROTATE_REFRESH_TOKENS": True,
    # Blacklist rotated tokens — requires rest_framework_simplejwt.token_blacklist in INSTALLED_APPS.
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "ALGORITHM": "HS256",
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_TOKEN_CLASSES": ("rest_framework_simplejwt.tokens.AccessToken",),
}


# ─── CORS ─────────────────────────────────────────────────────────────────────
# Populated per-environment (dev.py / prod.py).
CORS_ALLOWED_ORIGINS = config("CORS_ALLOWED_ORIGINS", cast=Csv(), default="")
CORS_ALLOW_CREDENTIALS = True


# ─── Email ────────────────────────────────────────────────────────────────────
DEFAULT_FROM_EMAIL = config("DEFAULT_FROM_EMAIL", default="noreply@barbershop.com")


# ─── Custom user model ────────────────────────────────────────────────────────
# MUST be set before the first migration is run.
# Tells every Django subsystem (auth, admin, JWT, DRF) which model is "the user".
AUTH_USER_MODEL = "users.User"
