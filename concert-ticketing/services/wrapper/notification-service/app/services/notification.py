import smtplib
import requests
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from config import (
    TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID,
    SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, EMAIL_FROM
)


def send_notification(event_type: str, data: dict):
    """
    Entry point called by the RabbitMQ consumer.
    Builds a message and dispatches it via Telegram and Email.

    event_type options:
      - "ticket.purchased"      -> order confirmed, ticket booked
      - "seat.reassigned"       -> seat changed due to seatmap update
      - "payment.refund.issued" -> refund issued after seatmap change
      - "swap.matched"          -> match found — notify BOTH users to accept/decline
      - "swap.completed"        -> seat swap finalized
      - "swap.failed"           -> swap declined by one or both users
    """
    # swap.matched has two recipients — handle separately
    if event_type == "swap.matched":
        _send_swap_matched(data)
        return

    subject = _build_subject(event_type)
    message = _build_message(event_type, data)
    recipient_email = data.get("email")

    _send_telegram(message)

    if recipient_email:
        _send_email(recipient_email, subject, message)
    else:
        print(f"[!] No email address in payload for event '{event_type}'. Skipping email.")


def _send_swap_matched(data: dict):
    """
    Notify both parties that a match was found and they need to accept or decline.
    Always includes the $2 surcharge note; also shows any price difference.
    """
    match_id       = data.get("matchId", "N/A")
    request_a      = data.get("requestADetails", {})
    request_b      = data.get("requestBDetails", {})
    price_diff     = data.get("priceDifference", 0)
    surcharge      = data.get("surcharge", 2.0)

    subject = "🔄 Seat Swap Match Found — Action Required"

    price_note = (
        f"\n💰 Price difference: ${price_diff:.2f} (paid by the user upgrading to a higher tier)."
        if price_diff else ""
    )

    for party_label, req in [("User A", request_a), ("User B", request_b)]:
        message = (
            f"🔄 A seat swap match has been found!\n"
            f"Match ID:     {match_id}\n"
            f"Your Seat:    tier {req.get('currentTier', 'N/A')}\n"
            f"Offered Seat: tier {req.get('desiredTier', 'N/A')}\n"
            f"{price_note}\n"
            f"💳 Surcharge: ${surcharge:.2f} per participant (charged to both parties).\n"
            f"Please accept or decline via the app."
        )
        _send_telegram(message)

        email = req.get("email")
        if email:
            _send_email(email, subject, message)
        else:
            print(f"[!] No email for {party_label} (userId={req.get('userId')}). Skipping email.")


def _build_subject(event_type: str) -> str:
    subjects = {
        "ticket.purchased":      "🎟️ Your Ticket is Confirmed!",
        "seat.reassigned":       "📍 Your Seat Has Been Reassigned",
        "payment.refund.issued": "💰 Refund Issued for Your Order",
        "swap.matched":          "🔄 Seat Swap Match Found — Action Required",
        "swap.payment_required": "💳 Seat Swap — Payment Required",
        "swap.completed":        "🔄 Your Seat Swap is Complete",
        "swap.failed":           "❌ Your Seat Swap Was Declined",
    }
    return subjects.get(event_type, "Concert Ticketing Notification")


def _build_message(event_type: str, data: dict) -> str:
    if event_type == "ticket.purchased":
        return (
            f"🎟️ Your ticket has been confirmed!\n"
            f"Order ID:   {data.get('orderId')}\n"
            f"Seat:       {data.get('seatId')}\n"
            f"Event:      {data.get('eventName', 'N/A')}\n"
            f"Venue:      {data.get('venue', 'N/A')}\n"
            f"Date:       {data.get('eventDate', 'N/A')}"
        )
    elif event_type == "seat.reassigned":
        return (
            f"📍 Your seat has been reassigned due to a venue update.\n"
            f"Order ID:   {data.get('orderId')}\n"
            f"Old Seat:   {data.get('oldSeatId', 'N/A')}\n"
            f"New Seat:   {data.get('newSeatId')}"
        )
    elif event_type == "payment.refund.issued":
        return (
            f"💰 A refund has been issued for your order.\n"
            f"Order ID:   {data.get('orderId')}\n"
            f"Amount:     ${data.get('amount')}\n"
            f"Please allow 3-5 business days for processing."
        )
    elif event_type == "swap.payment_required":
        payer     = data.get("payer", {})
        payee     = data.get("payee", {})
        diff      = data.get("priceDifference", 0)
        surcharge = data.get("surcharge", 2.0)
        total     = diff + surcharge
        return (
            f"💳 A payment is required to complete your seat swap.\n"
            f"Swap ID:           {data.get('swapId', 'N/A')}\n"
            f"Your current tier: {payer.get('tier', 'N/A')} (${payer.get('basePrice', 0):.2f})\n"
            f"Swapping to tier:  {payee.get('tier', 'N/A')} (${payee.get('basePrice', 0):.2f})\n"
            f"Price difference:  ${diff:.2f}\n"
            f"Surcharge:         ${surcharge:.2f} (flat fee per participant)\n"
            f"Total to pay:      ${total:.2f}\n\n"
            f"Please complete the payment in the app to finalise the swap."
        )
    elif event_type == "swap.completed":
        return (
            f"🔄 Your seat swap has been completed!\n"
            f"Swap ID:    {data.get('swapId', 'N/A')}"
        )
    elif event_type == "swap.failed":
        return (
            f"❌ Your seat swap was declined by one or both parties.\n"
            f"Swap ID:    {data.get('swapId', 'N/A')}\n"
            f"No changes have been made to your seat."
        )
    else:
        return f"Notification: {event_type}\nDetails: {data}"


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


def _send_email(recipient: str, subject: str, body: str):
    if not SMTP_USER or not SMTP_PASSWORD:
        print("[Email] Not configured — set SMTP_USER and SMTP_PASSWORD in .env")
        return
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = EMAIL_FROM
        msg["To"] = recipient
        msg.attach(MIMEText(body, "plain"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(EMAIL_FROM, recipient, msg.as_string())

        print(f"[✓] Email sent to {recipient}.")
    except smtplib.SMTPException as e:
        print(f"[!] Email send failed to {recipient}: {e}")
