import smtplib
import requests
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from config import (
    TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID,
    SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, EMAIL_FROM
)
from app.database import SessionLocal
from app.models import Notification

APP_NAME = "StagePass"
APP_URL = "http://localhost:5173"
FROM_DISPLAY = f"{APP_NAME} <{EMAIL_FROM}>"


def _save(user_id: str, notif_type: str, title: str, message: str, route: str = "/"):
    """Persist a notification record to the DB. Non-fatal on failure."""
    if not user_id:
        return
    try:
        db = SessionLocal()
        db.add(Notification(
            user_id=str(user_id),
            type=notif_type,
            title=title,
            message=message,
            route=route,
        ))
        db.commit()
        db.close()
    except Exception as e:
        print(f"[!] Could not save notification for user {user_id}: {e}")


def _format_date(raw: str) -> str:
    """Convert ISO date string to human-readable format, e.g. 'Monday, 15 June 2026'."""
    if not raw:
        return "N/A"
    # Try full datetime first (19 chars: 2026-06-15T00:00:00), then date only (10 chars: 2026-06-15)
    for chars, fmt in [(19, "%Y-%m-%dT%H:%M:%S"), (10, "%Y-%m-%d")]:
        try:
            return datetime.strptime(raw[:chars], fmt).strftime("%A, %d %B %Y")
        except ValueError:
            continue
    return raw  # already human-readable or unrecognised


def send_notification(event_type: str, data: dict):
    # Swap events that must notify two users
    if event_type == "swap.matched":
        _send_swap_matched(data)
        return
    elif event_type == "swap.completed":
        _send_swap_completed(data)
        return
    elif event_type == "swap.failed":
        _send_swap_failed(data)
        return

    subject = _build_subject(event_type)
    html = _build_html(event_type, data)
    plain = _build_plain(event_type, data)
    recipient_email = data.get("email")
    user_id = data.get("userId")

    # Persist to DB
    _persist_single(event_type, data, user_id)

    if recipient_email:
        _send_email(recipient_email, subject, plain, html)
    else:
        print(f"[!] No email address in payload for event '{event_type}'. Skipping email.")


def _persist_single(event_type: str, data: dict, user_id: str):
    """Save a notification record for single-user events."""
    TYPE_MAP = {
        "ticket.purchased": (
            "PURCHASE_CONFIRMED",
            "Purchase confirmed",
            lambda d: f"Your booking for {d.get('eventName', 'your event')} is confirmed.",
            "/tickets",
        ),
        "seat.reassigned": (
            "SEAT_REASSIGNED",
            "Seat reassigned",
            lambda d: f"Your seat for {d.get('eventName', 'your event')} has been reassigned.",
            "/tickets",
        ),
        "payment.refund.issued": (
            "REFUND_ISSUED",
            "Refund issued",
            lambda d: f"A refund of SGD {d.get('amount', '')} has been issued for order {d.get('orderId', '')}.",
            "/tickets",
        ),
    }
    entry = TYPE_MAP.get(event_type)
    if not entry:
        return
    notif_type, title, msg_fn, route = entry
    _save(user_id, notif_type, title, msg_fn(data), route)


def _send_swap_matched(data: dict):
    price_diff = data.get("priceDiff", 0)
    platform_fee = data.get("platformFee", 0)
    currency = data.get("currency", "SGD")
    event_name = data.get("eventName", "")
    event_date = _format_date(data.get("eventDate", ""))
    swap_url = f"{APP_URL}/swap"

    subject = f"Swap Match Found for {event_name} | {APP_NAME}" if event_name else f"You Have a Seat Swap Match! | {APP_NAME}"

    for key in ("requestADetails", "requestBDetails"):
        party = data.get(key, {})
        email = party.get("email")
        user_id = party.get("userId")
        if not email:
            continue

        other_key = "requestBDetails" if key == "requestADetails" else "requestADetails"
        other = data.get(other_key, {})

        my_tier = party.get("currentTier", "—")
        my_seat_label = party.get("currentSeatLabel") or party.get("currentSeatId", "—")
        offered_tier = other.get("currentTier", "—")
        offered_seat_label = other.get("currentSeatLabel") or other.get("currentSeatId", "—")

        _save(user_id, "SWAP_MATCHED", "Swap match found",
              f"A swap offer is ready: your {my_tier} seat for a {offered_tier} seat. Log in to accept or decline.", "/swap")

        event_line_plain = f"Event: {event_name}" + (f" — {event_date}" if event_date else "") + "\n\n" if event_name else ""
        event_line_html = f'<p style="color:#6B7280;font-size:13px;margin:0 0 16px;"><strong style="color:#111827;">{event_name}</strong>' + (f'  ·  {event_date}' if event_date else '') + '</p>' if event_name else ""

        seat_info_plain = (
            f"Your seat:     {my_tier} — {my_seat_label}\n"
            f"Offered seat:  {offered_tier} — {offered_seat_label}\n"
        )
        seat_info_html = f"""
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;">
            <tr style="background:#F3F4F6;">
              <td style="padding:10px 16px;font-size:13px;color:#6B7280;font-weight:600;width:50%;border-right:1px solid #E5E7EB;">YOUR SEAT</td>
              <td style="padding:10px 16px;font-size:13px;color:#6B7280;font-weight:600;width:50%;">OFFERED SEAT</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;font-size:15px;color:#111827;border-right:1px solid #E5E7EB;">
                <strong>{my_tier}</strong><br>
                <span style="font-size:13px;color:#6B7280;">{my_seat_label}</span>
              </td>
              <td style="padding:12px 16px;font-size:15px;color:#111827;">
                <strong>{offered_tier}</strong><br>
                <span style="font-size:13px;color:#6B7280;">{offered_seat_label}</span>
              </td>
            </tr>
          </table>"""

        if price_diff and price_diff > 0:
            price_note_plain = (
                f"\nPrice Difference: {currency} {price_diff:.2f}\n"
                f"Platform Fee:     {currency} {platform_fee:.2f}\n"
                f"(The upgrading party will be charged the difference + fee upon acceptance.)\n"
            )
            price_note_html = f"""
          <p style="color:#374151;font-size:14px;line-height:1.6;margin-top:12px;padding:12px 16px;background:#FEF3C7;border-radius:8px;border-left:4px solid #D97706;">
            <strong>Price Difference:</strong> {currency} {price_diff:.2f}<br>
            <strong>Platform Fee:</strong> {currency} {platform_fee:.2f}<br>
            <span style="font-size:12px;color:#6B7280;">The upgrading party will be charged the price difference + platform fee. The downgrading party receives a refund of the price difference.</span>
          </p>"""
        else:
            price_note_plain = ""
            price_note_html = ""

        plain = (
            f"Great news! A swap match has been found for your seat.\n\n"
            f"{event_line_plain}"
            f"{seat_info_plain}\n"
            f"{price_note_plain}"
            f"Review and respond to the offer here:\n{swap_url}\n\n"
            f"— The {APP_NAME} Team"
        )
        html = f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#F9FAFB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F9FAFB;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background:#2563EB;padding:32px 40px;text-align:center;">
          <p style="margin:0;font-size:32px;">🔄</p>
          <h1 style="margin:12px 0 0;color:#ffffff;font-size:22px;font-weight:700;">Swap Match Found!</h1>
        </td></tr>
        <tr><td style="padding:28px 40px;">
          <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 4px;">A match has been found for your seat swap request.</p>
          {event_line_html}
          {seat_info_html}
          {price_note_html}
          <p style="text-align:center;margin:24px 0 0;">
            <a href="{swap_url}" style="display:inline-block;background:#2563EB;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;">Review &amp; Respond to Offer</a>
          </p>
        </td></tr>
        <tr><td style="background:#F9FAFB;padding:20px 40px;text-align:center;border-top:1px solid #E5E7EB;">
          <p style="margin:0;color:#9CA3AF;font-size:12px;">This email was sent by <strong style="color:#2563EB;">{APP_NAME}</strong>. Please do not reply to this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""
        _send_email(email, subject, plain, html)


def _send_swap_completed(data: dict):
    event_name  = data.get("eventName", "")
    event_date  = _format_date(data.get("eventDate", ""))
    venue_name  = data.get("venueName", "")
    tickets_url = f"{APP_URL}/tickets"

    subject = f"Your Seat Swap is Complete — {event_name} | {APP_NAME}" if event_name else f"Your Seat Swap is Complete | {APP_NAME}"

    for key in ("userA", "userB"):
        party = data.get(key, {})
        email = party.get("email")
        user_id = party.get("userId")
        if not email:
            continue

        old_tier        = party.get("oldTier", "—")
        new_tier        = party.get("tier", "—")
        old_seat_label  = party.get("oldSeatLabel") or party.get("oldSeatId", "—")
        new_seat_label  = party.get("newSeatLabel") or party.get("newSeatId", "—")
        price_diff      = party.get("priceDiff")
        platform_fee    = party.get("platformFee")
        total_charged   = party.get("totalCharged")
        payment_type    = party.get("paymentType")  # "charge" or "refund"

        _save(user_id, "SWAP_COMPLETED", "Swap complete — your new seat is ready",
              f"Your {old_tier} seat has been swapped for {new_tier} · {new_seat_label}. Check your tickets.", "/tickets")

        # Event header line
        event_parts = [p for p in [event_name, event_date, venue_name] if p]
        event_line_plain = "  ·  ".join(event_parts) + "\n\n" if event_parts else ""
        event_line_html = (
            f'<p style="text-align:center;color:#6B7280;font-size:13px;margin:0 0 20px;">'
            + "  ·  ".join(event_parts) +
            f'</p>'
        ) if event_parts else ""

        # Seat swap visual
        seat_swap_html = f"""
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;">
            <tr style="background:#F9FAFB;">
              <td style="padding:10px 16px;font-size:12px;font-weight:600;color:#6B7280;text-transform:uppercase;letter-spacing:0.05em;width:50%;border-right:1px solid #E5E7EB;">Previous Seat</td>
              <td style="padding:10px 16px;font-size:12px;font-weight:600;color:#059669;text-transform:uppercase;letter-spacing:0.05em;">New Seat</td>
            </tr>
            <tr>
              <td style="padding:14px 16px;border-right:1px solid #E5E7EB;vertical-align:top;">
                <p style="margin:0;font-size:13px;color:#9CA3AF;text-decoration:line-through;">{old_tier}</p>
                <p style="margin:4px 0 0;font-size:13px;color:#9CA3AF;text-decoration:line-through;">{old_seat_label}</p>
              </td>
              <td style="padding:14px 16px;vertical-align:top;background:#F0FDF4;">
                <p style="margin:0;font-size:15px;font-weight:700;color:#059669;">{new_tier}</p>
                <p style="margin:4px 0 0;font-size:13px;color:#065F46;">{new_seat_label}</p>
              </td>
            </tr>
          </table>"""

        # Payment summary
        if total_charged and payment_type == "charge":
            payment_plain = (
                f"Price Difference: SGD {price_diff:.2f}\n"
                f"Platform Fee:     SGD {platform_fee:.2f}\n"
                f"Total Charged:    SGD {total_charged:.2f}\n\n"
            )
            payment_html = f"""
          <p style="margin:0 0 8px;padding:12px 16px;background:#FEF3C7;border-radius:8px;border-left:4px solid #D97706;font-size:14px;color:#374151;">
            <strong>Charged to your card:</strong> SGD {total_charged:.2f}
            <span style="font-size:12px;color:#6B7280;display:block;margin-top:4px;">Price difference SGD {price_diff:.2f} + platform fee SGD {platform_fee:.2f}</span>
          </p>"""
        elif total_charged and payment_type == "refund":
            payment_plain = f"Refund Issued: SGD {price_diff:.2f}\n\n"
            payment_html = f"""
          <p style="margin:0 0 8px;padding:12px 16px;background:#ECFDF5;border-radius:8px;border-left:4px solid #059669;font-size:14px;color:#374151;">
            <strong>Refund issued:</strong> SGD {price_diff:.2f}
            <span style="font-size:12px;color:#6B7280;display:block;margin-top:4px;">The price difference has been refunded to your original payment method.</span>
          </p>"""
        else:
            payment_plain = ""
            payment_html = ""

        plain = (
            f"Your seat swap has been completed!\n\n"
            f"{event_line_plain}"
            f"Previous: {old_tier} · {old_seat_label}\n"
            f"New Seat: {new_tier} · {new_seat_label}\n\n"
            f"{payment_plain}"
            f"View your updated ticket: {tickets_url}\n\n"
            f"— The {APP_NAME} Team"
        )
        html = f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#F9FAFB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F9FAFB;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background:#059669;padding:32px 40px;text-align:center;">
          <p style="margin:0;font-size:32px;">✅</p>
          <h1 style="margin:12px 0 0;color:#ffffff;font-size:22px;font-weight:700;">Seat Swap Complete!</h1>
          <p style="margin:8px 0 0;color:#D1FAE5;font-size:14px;">Your new seat is confirmed and ready.</p>
        </td></tr>
        <tr><td style="padding:28px 40px 8px;">
          {event_line_html}
          {seat_swap_html}
          {payment_html}
          <p style="text-align:center;margin:20px 0 0;">
            <a href="{tickets_url}" style="display:inline-block;background:#059669;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;">View My Tickets</a>
          </p>
        </td></tr>
        <tr><td style="background:#F9FAFB;padding:20px 40px;text-align:center;border-top:1px solid #E5E7EB;margin-top:20px;">
          <p style="margin:0;color:#9CA3AF;font-size:12px;">This email was sent by <strong style="color:#2563EB;">{APP_NAME}</strong>. Please do not reply to this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""
        _send_email(email, subject, plain, html)


def _send_swap_failed(data: dict):
    subject = f"Seat Swap Declined | {APP_NAME}"
    pairs = [
        (data.get("emailA"), data.get("userIdA")),
        (data.get("emailB"), data.get("userIdB")),
    ]
    for email, user_id in pairs:
        if not email:
            continue
        _save(user_id, "SWAP_FAILED", "Swap failed",
              "Your seat swap was declined by the other party. You can submit a new request anytime.", "/swap")
        plain = (
            f"Unfortunately, your seat swap has been declined by the other party.\n\n"
            f"You can submit a new swap request any time.\n\n"
            f"— The {APP_NAME} Team"
        )
        html = f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#F9FAFB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F9FAFB;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background:#DC2626;padding:32px 40px;text-align:center;">
          <p style="margin:0;font-size:32px;">❌</p>
          <h1 style="margin:12px 0 0;color:#ffffff;font-size:22px;font-weight:700;">Swap Declined</h1>
        </td></tr>
        <tr><td style="padding:28px 40px;">
          <p style="color:#374151;font-size:15px;line-height:1.6;">Your seat swap was declined by the other party. You can submit a new swap request any time from your account.</p>
        </td></tr>
        <tr><td style="background:#F9FAFB;padding:20px 40px;text-align:center;border-top:1px solid #E5E7EB;">
          <p style="margin:0;color:#9CA3AF;font-size:12px;">This email was sent by <strong style="color:#DC2626;">{APP_NAME}</strong>. Please do not reply to this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""
        _send_email(email, subject, plain, html)


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
