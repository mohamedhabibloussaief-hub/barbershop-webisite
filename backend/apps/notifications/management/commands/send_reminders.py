"""
apps/notifications/management/commands/send_reminders.py
----------------------------------------------------------
Management command that sends 24-hour reminder emails.

Run manually:
    python manage.py send_reminders

Schedule with cron (add to server crontab -e):
    0 10 * * * cd /app && python manage.py send_reminders >> /var/log/reminders.log 2>&1

The command runs once daily. It finds all appointments that:
  1. Have status = pending or confirmed
  2. Start between 23 and 25 hours from now
     (2-hour window handles cron timing drift)
  3. Have NOT already received a reminder_24h notification

The "already sent" check prevents duplicate reminders if the
cron job runs twice due to server issues.
"""

import logging
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

logger = logging.getLogger("barbershop")


class Command(BaseCommand):
    help = "Send 24-hour reminder emails for upcoming appointments."

    def handle(self, *args, **options):
        from apps.appointments.models import Appointment
        from apps.notifications.models import NotificationsLog
        from apps.notifications.emails import send_reminder_24h

        now         = timezone.now()
        window_start = now + timedelta(hours=23)
        window_end   = now + timedelta(hours=25)

        # Find upcoming appointments in the 23–25 hour window.
        upcoming = Appointment.objects.filter(
            status__in = ["pending", "confirmed"],
            start_time__gte = window_start,
            start_time__lte = window_end,
        ).select_related("client", "employee__user", "service")

        self.stdout.write(
            f"[send_reminders] Found {upcoming.count()} appointments "
            f"in window {window_start:%Y-%m-%d %H:%M} → {window_end:%H:%M}"
        )

        sent = skipped = failed = 0

        for appointment in upcoming:
            # Skip if a reminder was already sent for this appointment.
            already_sent = NotificationsLog.objects.filter(
                appointment       = appointment,
                notification_type = NotificationsLog.NotificationType.REMINDER_24H,
                status            = NotificationsLog.Status.SENT,
            ).exists()

            if already_sent:
                skipped += 1
                continue

            try:
                send_reminder_24h(appointment)
                sent += 1
            except Exception as exc:
                failed += 1
                logger.error(
                    "send_reminders: failed for appointment %s: %s",
                    appointment.id, exc,
                )

        summary = (
            f"[send_reminders] Done — sent: {sent}, "
            f"skipped (already sent): {skipped}, failed: {failed}"
        )
        self.stdout.write(self.style.SUCCESS(summary))
        logger.info(summary)
