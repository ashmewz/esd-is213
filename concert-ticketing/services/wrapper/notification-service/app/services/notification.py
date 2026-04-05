import smtplib
import requests
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from config import (
    TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID,
    SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, EMAIL_FROM
)

APP_NAME = "StagePass"
FROM_DISPLAY = f"{APP_NAME} <{EMAIL_FROM}>"


def _format_date(raw: str) -> str:
    """Convert ISO date string to human-readable format, e.g. 'Monday, 15 June 2026'."""
    if not raw:
        return "N/A"
    for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(raw[:len(fmt)], fmt).strftime("%A, %d %B %Y")
        except ValueError:
            continue
    return raw  # already human-readable or unrecognised


def send_notification(event_type: str, data: dict):
    subject = _build_subject(event_type)
    html = _build_html(event_type, data)
    plain = _build_plain(event_type, data)
    recipient_email = data.get("email")

    if recipient_email:
        _send_email(recipient_email, subject, plain, html)
    else:
        print(f"[!] No email address in payload for event '{event_type}'. Skipping email.")


def _build_subject(event_type: str) -> str:
    subjects = {
        "ticket.purchased":      f"Your Ticket is Confirmed! | {APP_NAME}",
        "seat.reassigned":       f"Your Seat Has Been Reassigned | {APP_NAME}",
        "payment.refund.issued": f"Refund Issued for Your Order | {APP_NAME}",
        "swap.completed":        f"Your Seat Swap is Complete | {APP_NAME}",
    }
    return subjects.get(event_type, f"Notification | {APP_NAME}")


def _build_plain(event_type: str, data: dict) -> str:
    if event_type == "ticket.purchased":
        return (
            f"Your ticket has been confirmed!\n\n"
            f"Order ID:   {data.get('orderId')}\n"
            f"Event:      {data.get('eventName', 'N/A')}\n"
            f"Venue:      {data.get('venue', 'N/A')}\n"
            f"Date:       {_format_date(data.get('eventDate', ''))}\n"
            f"Seat:       {data.get('seatLabel', data.get('seatId', 'N/A'))}\n\n"
            f"Thank you for your purchase. See you at the show!\n\n"
            f"— The {APP_NAME} Team"
        )
    elif event_type == "seat.reassigned":
        return (
            f"Your seat has been reassigned due to a venue update.\n\n"
            f"Order ID:   {data.get('orderId')}\n"
            f"Event:      {data.get('eventName', 'N/A')}\n"
            f"Venue:      {data.get('venue', 'N/A')}\n"
            f"Date:       {data.get('eventDate', 'N/A')}\n"
            f"Old Seat:   {data.get('oldSeatLabel', data.get('oldSeatId', 'N/A'))}\n"
            f"New Seat:   {data.get('newSeatLabel', data.get('newSeatId', 'N/A'))}\n\n"
            f"Please use your new seat details when entering the venue.\n\n"
            f"— The {APP_NAME} Team"
        )
    elif event_type == "payment.refund.issued":
        return (
            f"A refund has been issued for your order.\n\n"
            f"Order ID:   {data.get('orderId')}\n"
            f"Amount:     ${data.get('amount')}\n\n"
            f"Please allow 3-5 business days for processing.\n\n"
            f"— The {APP_NAME} Team"
        )
    elif event_type == "swap.completed":
        return (
            f"Your seat swap has been completed!\n\n"
            f"Order ID:   {data.get('orderId')}\n"
            f"New Seat:   {data.get('newSeatId', 'N/A')}\n\n"
            f"— The {APP_NAME} Team"
        )
    else:
        return f"Notification: {event_type}\nDetails: {data}"


def _build_html(event_type: str, data: dict) -> str:
    if event_type == "ticket.purchased":
        rows = [
            ("Order ID",  data.get("orderId", "N/A")),
            ("Event",     data.get("eventName", "N/A")),
            ("Venue",     data.get("venue", "N/A")),
            ("Date",      _format_date(data.get("eventDate", ""))),
            ("Seat",      data.get("seatLabel", data.get("seatId", "N/A"))),
        ]
        title = "Your Ticket is Confirmed!"
        subtitle = "Thank you for your purchase. We can't wait to see you at the show!"
        icon = "🎟️"
        color = "#7C3AED"

    elif event_type == "seat.reassigned":
        rows = [
            ("Order ID",  data.get("orderId", "N/A")),
            ("Event",     data.get("eventName", "N/A")),
            ("Venue",     data.get("venue", "N/A")),
            ("Date",      data.get("eventDate", "N/A")),
            ("Old Seat",  data.get("oldSeatLabel", data.get("oldSeatId", "N/A"))),
            ("New Seat",  data.get("newSeatLabel", data.get("newSeatId", "N/A"))),
        ]
        title = "Your Seat Has Been Reassigned"
        subtitle = "Your seat has been updated due to a venue change. Please use your new seat details when entering the venue."
        icon = "📍"
        color = "#D97706"

    elif event_type == "payment.refund.issued":
        rows = [
            ("Order ID", data.get("orderId", "N/A")),
            ("Amount",   f"${data.get('amount', 'N/A')}"),
        ]
        title = "Refund Issued"
        subtitle = "Your refund is being processed. Please allow 3-5 business days."
        icon = "💰"
        color = "#059669"

    elif event_type == "swap.completed":
        rows = [
            ("Order ID", data.get("orderId", "N/A")),
            ("New Seat", data.get("newSeatId", "N/A")),
        ]
        title = "Seat Swap Complete!"
        subtitle = "Your seat swap has been finalized."
        icon = "🔄"
        color = "#2563EB"

    else:
        return f"<p>{event_type}: {data}</p>"

    rows_html = "".join(
        f"""
        <tr>
          <td style="padding:10px 16px;color:#6B7280;font-size:14px;border-bottom:1px solid #F3F4F6;">{label}</td>
          <td style="padding:10px 16px;color:#111827;font-size:14px;font-weight:600;border-bottom:1px solid #F3F4F6;">{value}</td>
        </tr>"""
        for label, value in rows
    )

    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#F9FAFB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F9FAFB;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

        <!-- Header -->
        <tr>
          <td style="background:{color};padding:32px 40px;text-align:center;">
            <p style="margin:0;font-size:32px;">{icon}</p>
            <h1 style="margin:12px 0 0;color:#ffffff;font-size:22px;font-weight:700;">{title}</h1>
          </td>
        </tr>

        <!-- Subtitle -->
        <tr>
          <td style="padding:28px 40px 8px;text-align:center;">
            <p style="margin:0;color:#6B7280;font-size:15px;line-height:1.6;">{subtitle}</p>
          </td>
        </tr>

        <!-- Details table -->
        <tr>
          <td style="padding:16px 40px 28px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;">
              {rows_html}
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#F9FAFB;padding:20px 40px;text-align:center;border-top:1px solid #E5E7EB;">
            <p style="margin:0;color:#9CA3AF;font-size:12px;">This email was sent by <strong style="color:{color};">{APP_NAME}</strong>. Please do not reply to this email.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""


def _send_telegram(message: str):
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        print("[Telegram] Not configured — set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env")
        return
    try:
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        response = requests.post(
            url,
            json={"chat_id": TELEGRAM_CHAT_ID, "text": message},
            timeout=10
        )
        response.raise_for_status()
        print("[✓] Telegram message sent.")
    except requests.RequestException as e:
        print(f"[!] Telegram send failed: {e}")


def _send_email(recipient: str, subject: str, plain: str, html: str):
    if not SMTP_USER or not SMTP_PASSWORD:
        print("[Email] Not configured — set SMTP_USER and SMTP_PASSWORD in .env")
        return
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = FROM_DISPLAY
        msg["To"] = recipient
        msg.attach(MIMEText(plain, "plain"))
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(EMAIL_FROM, recipient, msg.as_string())

        print(f"[✓] Email sent to {recipient}.")
    except smtplib.SMTPException as e:
        print(f"[!] Email send failed to {recipient}: {e}")
