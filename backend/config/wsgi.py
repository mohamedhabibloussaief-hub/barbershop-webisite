"""
config/wsgi.py
--------------
WSGI entry point consumed by Gunicorn:
  gunicorn config.wsgi:application --bind 0.0.0.0:8000

DJANGO_SETTINGS_MODULE is set inside the container via the .env file
(read by Docker Compose env_file directive), so this file never hard-codes
an environment name.
"""

import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")

application = get_wsgi_application()
