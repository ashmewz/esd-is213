from app.clients.event_client import EventClient
from app.clients.seat_client import SeatClient
from app.clients.order_client import OrderClient
from app.clients.payment_client import PaymentClient
from app.clients.notification_client import NotificationClient
from app.messaging.rabbitmq import publish_event

class BookingService:
    def __init__(self):
        self.event_client = EventClient()
        self.seat_client = SeatClient()
        self.order_client = OrderClient()
        self.payment_client = PaymentClient()
        self.notification_client = NotificationClient()

    def create_booking(self, user_id, event_id, seat_id):
        seat = self.event_client.validate_seat(event_id, seat_id)
        if not seat:
            raise Exception("Invalid or unavailable seat")

        order_resp = self.order_client.create_order(user_id, event_id, seat_id, price=seat["price"])
        order = order_resp.get("data", order_resp)
        order_id = order["orderId"]

        hold_resp = self.seat_client.create_hold(order_id, event_id, seat_id)
        hold = hold_resp.get("data", hold_resp)
        hold_id = hold["holdId"]

        payment = self.payment_client.process_payment(
            order_id=order_id,
            user_id=user_id,
            amount=seat["price"],
        )

        if payment["status"] != "SUCCESS":
            self.seat_client.cancel_hold(hold_id)
            raise Exception("Payment failed")

        self.seat_client.confirm_seat(hold_id, payment["transactionId"])
        self.order_client.confirm_order(order_id)
        publish_event("ticket.purchased", {
            "orderId": order_id,
            "userId": user_id
        })

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