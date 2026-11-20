"""
apps/notifications/apps.py
---------------------------
The ready() hook is the correct place to import signal handlers.
Importing them at module level would cause circular import errors
because handlers.py imports from apps.appointments.models, which
may not be fully loaded at module import time.
"""

from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name         = "apps.notifications"
    label        = "notifications"
    verbose_name = "Notifications"

    def ready(self):
        # Importing here registers all @receiver decorators in handlers.py.
        import apps.notifications.handlers  # noqa: F401
