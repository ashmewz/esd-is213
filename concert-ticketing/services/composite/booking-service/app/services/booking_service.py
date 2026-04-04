from app.clients.event_client import EventClient
from app.clients.seat_client import SeatClient
from app.clients.order_client import OrderClient
from app.clients.payment_client import PaymentClient
from app.clients.notification_client import NotificationClient
from app.clients.user_client import UserClient
from app.messaging.rabbitmq import publish_event


class BookingService:
    def __init__(self):
        self.event_client = EventClient()
        self.seat_client = SeatClient()
        self.order_client = OrderClient()
        self.payment_client = PaymentClient()
        self.notification_client = NotificationClient()
        self.user_client = UserClient()

    def create_booking(self, user_id, event_id, seat_id, card_last4=""):
        # ── Step A2/A3: Validate seat (client-facing + backend re-validation) ──
        seat = self.event_client.validate_seat(event_id, seat_id)
        if not seat:
            raise ValueError("Seat not found.")

        seat_status = (seat.get("status") or "").lower()
        if seat_status != "available":
            error = RuntimeError("Seat is no longer available.")
            error.code = "SEAT_UNAVAILABLE"
            raise error

        seat_price = seat.get("basePrice") or seat.get("price")
        if seat_price is None:
            raise ValueError("Seat price could not be determined.")

        event = self.event_client.get_event(event_id)

        # ── Step A5: Create order ──
        order_resp = self.order_client.create_order(
            user_id, event_id, seat_id, price=seat_price
        )
        order = order_resp.get("data", order_resp)
        order_id = order["orderId"]

        # ── Step A6: Create hold ──
        try:
            hold_resp = self.seat_client.create_hold(order_id, event_id, seat_id)
        except Exception as exc:
            self.order_client.cancel_order(order_id)
            error = RuntimeError("Could not reserve seat. Please try again.")
            error.code = "HOLD_FAILED"
            raise error from exc

        hold = hold_resp.get("data", hold_resp)
        hold_id = hold["holdId"]

        # ── Steps A8–A10: Process payment ──
        payment = self.payment_client.process_payment(
            order_id=order_id,
            user_id=user_id,
            amount=seat_price,
            card_last4=card_last4,
        )

        if payment.get("status") != "SUCCESS":
            try:
                self.seat_client.cancel_hold(hold_id)
            except Exception:
                pass  # best-effort; hold will expire via TTL if cancel fails
            self.order_client.cancel_order(order_id)
            error = RuntimeError("Payment could not be processed.")
            error.code = "PAYMENT_FAILED"
            raise error

        transaction_id = payment.get("transactionId")

        # ── Step A12: Confirm hold → seat assignment ──
        try:
            self.seat_client.confirm_seat(hold_id, transaction_id)
        except Exception as exc:
            try:
                self.payment_client.refund_payment(transaction_id, order_id)
            except Exception:
                pass  # refund attempted; manual reconciliation may be needed
            self.order_client.cancel_order(order_id)
            error = RuntimeError(
                "Seat could not be confirmed after payment. A refund has been initiated."
            )
            error.code = "REFUND_REQUIRED"
            raise error from exc

        event_update_res = self.event_client.update_seat_status(event_id, seat_id, "sold")
        if event_update_res is None or getattr(event_update_res, "status_code", 200) != 200:
            pass

        # ── Step A14: Confirm order ──
        self.order_client.confirm_order(order_id)

        # ── Fetch user for notification payload ──
        user = self.user_client.get_user(user_id)

        # ── Step A16: Publish TicketPurchased event to RabbitMQ ──
        publish_event("ticket.purchased.notify", {
            "orderId": order_id,
            "userId": user_id,
            "eventId": event_id,
            "seatId": seat_id,
            "status": "CONFIRMED",
            "eventName": event.get("name") if event else None,
            "venue": event.get("venueName") if event else None,
            "eventDate": event.get("date") if event else None,
            "email": user.get("email") if user else None,
        })

        # ── Step A18: Direct notification (best-effort) ──
        try:
            self.notification_client.send_notification({
                "userId": user_id,
                "message": f"Your booking for {event.get('name', 'the event')} is confirmed!",
            })
        except Exception:
            pass

        return {
            "status": "SUCCESS",
            "orderId": order_id,
        }