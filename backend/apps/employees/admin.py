"""
apps/employees/admin.py
"""
from django.contrib import admin
from .models import Employee, Schedule, TimeOff


class ScheduleInline(admin.TabularInline):
    model      = Schedule
    extra      = 1
    fields     = ("day_of_week", "start_time", "end_time", "is_active")


class TimeOffInline(admin.TabularInline):
    model   = TimeOff
    extra   = 0
    fields  = ("date", "reason", "note")


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display   = ("user", "years_experience", "is_active", "created_at")
    list_filter    = ("is_active",)
    search_fields  = ("user__full_name", "user__email", "specialties")
    readonly_fields = ("id", "created_at", "updated_at")
    inlines        = [ScheduleInline, TimeOffInline]

    fieldsets = (
        (None, {"fields": ("id", "user")}),
        ("Profile", {"fields": ("bio", "specialties", "years_experience")}),
        ("Status", {"fields": ("is_active",)}),
        ("Timestamps", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )


@admin.register(Schedule)
class ScheduleAdmin(admin.ModelAdmin):
    list_display  = ("employee", "day_of_week", "start_time", "end_time", "is_active")
    list_filter   = ("day_of_week", "is_active")
    search_fields = ("employee__user__full_name",)


@admin.register(TimeOff)
class TimeOffAdmin(admin.ModelAdmin):
    list_display  = ("employee", "date", "reason")
    list_filter   = ("reason",)
    search_fields = ("employee__user__full_name",)
