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
        seat = self.event_client.validate_seat(event_id, seat_id)
        if not seat:
            raise Exception("Invalid or unavailable seat")

        seat_price = seat.get("basePrice") or seat.get("price")

        order_resp = self.order_client.create_order(
            user_id, event_id, seat_id, price=seat_price
        )
        order_id = order_resp["orderId"]

        hold_resp = self.seat_client.create_hold(order_id, event_id, seat_id)
        hold = hold_resp.get("data", hold_resp)
        hold_id = hold["holdId"]

        payment = self.payment_client.process_payment(
            order_id=order_id,
            user_id=user_id,
            amount=seat_price,
            card_last4=card_last4,
        )

        if payment.get("status") != "SUCCESS":
            self.seat_client.cancel_hold(hold_id)
            self.order_client.cancel_order(order_id)
            raise RuntimeError(
                "Payment failed; hold cancelled and order status set to CANCELLED."
            )

        event_res = self.event_client.update_seat_status(event_id, seat_id, "sold")
        if event_res.status_code != 200:
            self.seat_client.cancel_hold(hold_id)
            self.order_client.cancel_order(order_id)
            raise RuntimeError("Failed to update seat status; hold cancelled and order cancelled.")

        self.seat_client.confirm_seat(hold_id, payment["transactionId"])

        try:
            self.order_client.confirm_order(order_id)
        except Exception:
            pass

        event = self.event_client.get_event(event_id)
        user = self.user_client.get_user(user_id)

        try:
            publish_event("ticket.purchased", {
                "orderId": order_id,
                "userId": user_id,
                "seatId": seat_id,
                "eventName": event.get("name") if event else None,
                "venue": event.get("venueName") if event else None,
                "eventDate": event.get("date") if event else None,
                "email": user.get("email") if user else None,
            })
        except Exception:
            pass

        try:
            self.notification_client.send_notification({
                "userId": user_id,
                "message": "Booking confirmed!"
            })
        except Exception:
            pass

        return {
            "status": "SUCCESS",
            "orderId": order_id
        }