"""
apps/appointments/admin.py
---------------------------
Full admin configuration replacing the minimal registration from Step 6.
"""

from django.contrib import admin
from django.utils.html import format_html
from .models import Appointment, Payment


class PaymentInline(admin.StackedInline):
    model         = Payment
    extra         = 0
    readonly_fields = ("id", "amount", "status", "method", "paid_at", "created_at")
    can_delete    = False


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display    = (
        "id_short", "client", "employee", "service",
        "start_time", "coloured_status", "payment_status",
    )
    list_filter     = ("status", "service", "employee")
    search_fields   = (
        "client__full_name", "client__email",
        "employee__user__full_name",
    )
    readonly_fields = ("id", "created_at", "updated_at", "end_time")
    ordering        = ("-start_time",)
    inlines         = [PaymentInline]

    fieldsets = (
        ("Booking", {
            "fields": ("id", "client", "employee", "service", "start_time", "end_time", "notes"),
        }),
        ("Status", {
            "fields": ("status", "cancelled_by", "cancellation_reason"),
        }),
        ("Timestamps", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",),
        }),
    )

    def id_short(self, obj):
        return str(obj.id)[:8] + "..."
    id_short.short_description = "ID"

    def coloured_status(self, obj):
        colours = {
            "pending"   : "#f59e0b",
            "confirmed" : "#3b82f6",
            "arrived"   : "#8b5cf6",
            "completed" : "#10b981",
            "no_show"   : "#ef4444",
            "cancelled" : "#6b7280",
        }
        colour = colours.get(obj.status, "#000")
        return format_html(
            '<span style="color:{}; font-weight:bold;">{}</span>',
            colour,
            obj.get_status_display(),
        )
    coloured_status.short_description = "Status"

    def payment_status(self, obj):
        try:
            return obj.payment.get_status_display()
        except Payment.DoesNotExist:
            return "-"
    payment_status.short_description = "Payment"


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display    = ("appointment", "amount", "status", "method", "paid_at")
    list_filter     = ("status", "method")
    search_fields   = ("appointment__client__full_name",)
    readonly_fields = ("id", "appointment", "amount", "created_at", "updated_at")
