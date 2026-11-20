"""
apps/notifications/emails.py
-----------------------------
All email construction and sending lives here.
Nothing in this file knows about Django signals or models
beyond the Appointment object it receives — pure email logic.

Three public functions:
  send_booking_confirmed(appointment)
  send_booking_cancelled(appointment)
  send_reminder_24h(appointment)

Each function:
  1. Builds a plain-text body
  2. Builds an HTML body
  3. Sends via EmailMultiAlternatives (multipart/alternative)
  4. Logs the result to NotificationsLog

The HTML uses inline styles throughout — no external CSS, no linked
stylesheets. Many email clients (Outlook, Gmail) strip <style> blocks
so inline styles are the only reliable approach.
"""

import logging
from django.core.mail           import EmailMultiAlternatives
from django.conf                import settings
from django.utils               import timezone

logger = logging.getLogger("barbershop")

# ── Helpers ────────────────────────────────────────────────────────────────────

def _log(appointment, notification_type: str, status: str, error: str = "") -> None:
    """Write one NotificationsLog row — import inside function to avoid circular."""
    from .models import NotificationsLog
    try:
        NotificationsLog.objects.create(
            appointment       = appointment,
            notification_type = notification_type,
            recipient_email   = appointment.client.email,
            status            = status,
            error_message     = error,
        )
    except Exception as log_exc:
        # Never let logging failure propagate — just warn.
        logger.warning("Failed to write notifications log: %s", log_exc)


def _send(*, subject: str, text_body: str, html_body: str, to_email: str) -> None:
    """
    Send a multipart/alternative email.
    Raises on failure so callers can catch and log.
    """
    msg = EmailMultiAlternatives(
        subject      = subject,
        body         = text_body,
        from_email   = settings.DEFAULT_FROM_EMAIL,
        to           = [to_email],
    )
    msg.attach_alternative(html_body, "text/html")
    msg.send()


def _format_dt(dt) -> str:
    """Format a UTC-aware datetime to local time string for email display."""
    local_dt = timezone.localtime(dt)
    return local_dt.strftime("%A, %B %d %Y at %H:%M")


# ── Shared HTML shell ─────────────────────────────────────────────────────────

def _html_wrap(content: str) -> str:
    """Wrap content in a minimal responsive email shell with inline styles."""
    return f"""
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:8px;overflow:hidden;
                    box-shadow:0 1px 4px rgba(0,0,0,.08);">
        <!-- Header -->
        <tr>
          <td style="background:#18181b;padding:24px 32px;">
            <p style="margin:0;color:#ffffff;font-size:20px;font-weight:bold;
                      letter-spacing:.5px;">✂ BarberShop</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            {content}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f4f4f5;padding:16px 32px;text-align:center;">
            <p style="margin:0;color:#71717a;font-size:12px;">
              © BarberShop · You received this because you have an appointment with us.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
""".strip()


def _detail_row(label: str, value: str) -> str:
    return f"""
    <tr>
      <td style="padding:6px 0;color:#71717a;font-size:14px;width:140px;">{label}</td>
      <td style="padding:6px 0;color:#18181b;font-size:14px;font-weight:600;">{value}</td>
    </tr>"""


# ── Booking confirmed ─────────────────────────────────────────────────────────

def send_booking_confirmed(appointment) -> None:
    """
    Sent immediately when a client books an appointment.
    Triggered by the post_save signal in handlers.py.
    """
    NOTIF_TYPE = "booking_confirmed"
    client     = appointment.client
    employee   = appointment.employee
    service    = appointment.service

    subject = f"✂ Booking confirmed — {service.name} on {appointment.start_time.strftime('%b %d')}"

    text_body = (
        f"Hi {client.full_name},\n\n"
        f"Your appointment has been confirmed.\n\n"
        f"  Service:   {service.name}\n"
        f"  Barber:    {employee.user.full_name}\n"
        f"  Date/time: {_format_dt(appointment.start_time)}\n"
        f"  Duration:  {service.duration_minutes} minutes\n"
        f"  Price:     {service.price} TND\n\n"
        f"If you need to cancel, please do so at least 24 hours in advance.\n\n"
        f"See you soon,\nThe BarberShop Team"
    )

    details = (
        _detail_row("Service",   service.name) +
        _detail_row("Barber",    employee.user.full_name) +
        _detail_row("Date/time", _format_dt(appointment.start_time)) +
        _detail_row("Duration",  f"{service.duration_minutes} min") +
        _detail_row("Price",     f"{service.price} TND")
    )

    html_body = _html_wrap(f"""
        <h2 style="margin:0 0 8px;color:#18181b;font-size:22px;">Booking Confirmed ✓</h2>
        <p style="margin:0 0 24px;color:#52525b;font-size:15px;">
          Hi {client.full_name}, your appointment is booked. Here are your details:
        </p>
        <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:24px;">
          {details}
        </table>
        <p style="margin:0;color:#71717a;font-size:13px;">
          Need to cancel? Please do so at least 24 hours in advance through the app.
        </p>
    """)

    try:
        _send(subject=subject, text_body=text_body, html_body=html_body,
              to_email=client.email)
        _log(appointment, NOTIF_TYPE, "sent")
        logger.info("booking_confirmed email sent to %s (appt=%s)", client.email, appointment.id)
    except Exception as exc:
        _log(appointment, NOTIF_TYPE, "failed", str(exc))
        logger.error("booking_confirmed email FAILED for %s: %s", client.email, exc)


# ── Booking cancelled ─────────────────────────────────────────────────────────

def send_booking_cancelled(appointment) -> None:
    """
    Sent when an appointment is cancelled by any party.
    Triggered by the post_save signal in handlers.py.
    """
    NOTIF_TYPE  = "booking_cancelled"
    client      = appointment.client
    cancelled_by = (
        appointment.cancelled_by.full_name
        if appointment.cancelled_by else "the salon"
    )

    subject = f"✂ Appointment cancelled — {appointment.service.name}"

    text_body = (
        f"Hi {client.full_name},\n\n"
        f"Your appointment has been cancelled by {cancelled_by}.\n\n"
        f"  Service:   {appointment.service.name}\n"
        f"  Date/time: {_format_dt(appointment.start_time)}\n"
    )
    if appointment.cancellation_reason:
        text_body += f"  Reason:    {appointment.cancellation_reason}\n"
    text_body += "\nYou can book a new appointment at any time.\n\nThe BarberShop Team"

    reason_row = (
        _detail_row("Reason", appointment.cancellation_reason)
        if appointment.cancellation_reason else ""
    )

    html_body = _html_wrap(f"""
        <h2 style="margin:0 0 8px;color:#ef4444;font-size:22px;">Appointment Cancelled</h2>
        <p style="margin:0 0 24px;color:#52525b;font-size:15px;">
          Hi {client.full_name}, your appointment has been cancelled by
          <strong>{cancelled_by}</strong>.
        </p>
        <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:24px;">
          {_detail_row("Service",   appointment.service.name)}
          {_detail_row("Date/time", _format_dt(appointment.start_time))}
          {reason_row}
        </table>
        <p style="margin:0;color:#52525b;font-size:14px;">
          You can book a new appointment at any time through the app.
        </p>
    """)

    try:
        _send(subject=subject, text_body=text_body, html_body=html_body,
              to_email=client.email)
        _log(appointment, NOTIF_TYPE, "sent")
        logger.info("booking_cancelled email sent to %s (appt=%s)", client.email, appointment.id)
    except Exception as exc:
        _log(appointment, NOTIF_TYPE, "failed", str(exc))
        logger.error("booking_cancelled email FAILED for %s: %s", client.email, exc)


# ── 24-hour reminder ──────────────────────────────────────────────────────────

def send_reminder_24h(appointment) -> None:
    """
    Sent ~24 hours before the appointment start time.
    Called by the send_reminders management command (not a signal).
    """
    NOTIF_TYPE = "reminder_24h"
    client     = appointment.client
    service    = appointment.service
    employee   = appointment.employee

    subject = f"✂ Reminder: {service.name} tomorrow at {timezone.localtime(appointment.start_time).strftime('%H:%M')}"

    text_body = (
        f"Hi {client.full_name},\n\n"
        f"Just a reminder — you have an appointment tomorrow.\n\n"
        f"  Service:   {service.name}\n"
        f"  Barber:    {employee.user.full_name}\n"
        f"  Date/time: {_format_dt(appointment.start_time)}\n"
        f"  Duration:  {service.duration_minutes} minutes\n\n"
        f"See you tomorrow!\nThe BarberShop Team"
    )

    html_body = _html_wrap(f"""
        <h2 style="margin:0 0 8px;color:#18181b;font-size:22px;">See You Tomorrow! 👋</h2>
        <p style="margin:0 0 24px;color:#52525b;font-size:15px;">
          Hi {client.full_name}, here's a reminder about your upcoming appointment:
        </p>
        <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:24px;">
          {_detail_row("Service",   service.name)}
          {_detail_row("Barber",    employee.user.full_name)}
          {_detail_row("Date/time", _format_dt(appointment.start_time))}
          {_detail_row("Duration",  f"{service.duration_minutes} min")}
        </table>
        <p style="margin:0;color:#71717a;font-size:13px;">
          Need to cancel? Please do so as soon as possible through the app.
        </p>
    """)

    try:
        _send(subject=subject, text_body=text_body, html_body=html_body,
              to_email=client.email)
        _log(appointment, NOTIF_TYPE, "sent")
        logger.info("reminder_24h email sent to %s (appt=%s)", client.email, appointment.id)
    except Exception as exc:
        _log(appointment, NOTIF_TYPE, "failed", str(exc))
        logger.error("reminder_24h email FAILED for %s: %s", client.email, exc)
