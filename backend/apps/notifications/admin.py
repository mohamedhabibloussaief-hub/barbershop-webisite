"""
apps/notifications/admin.py
"""
from django.contrib import admin
from .models import NotificationsLog


@admin.register(NotificationsLog)
class NotificationsLogAdmin(admin.ModelAdmin):
    list_display   = (
        "notification_type", "recipient_email",
        "status", "sent_at", "appointment_link",
    )
    list_filter    = ("notification_type", "status")
    search_fields  = ("recipient_email",)
    readonly_fields = (
        "id", "appointment", "notification_type",
        "recipient_email", "status", "error_message", "sent_at",
    )
    ordering       = ("-sent_at",)

    # Disable add/delete — this is a read-only audit log.
    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def appointment_link(self, obj):
        if obj.appointment:
            return str(obj.appointment.id)[:8] + "..."
        return "—"
    appointment_link.short_description = "Appointment"
