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

        order = self.order_client.create_order(user_id, event_id, seat_id)
        hold = self.seat_client.create_hold(order["orderId"], event_id, seat_id)

        payment = self.payment_client.process_payment(
            order_id=order["orderId"],
            user_id=user_id,
            amount=seat["basePrice"],
        )

        if payment["status"] != "SUCCESS":
            self.seat_client.cancel_hold(order["orderId"])
            raise Exception("Payment failed")

        self.seat_client.confirm_seat(order["orderId"], seat_id)
        self.order_client.confirm_order(order["orderId"])

        # Notification Service consumes this event from RabbitMQ directly
        # No direct HTTP call needed
        publish_event("TicketPurchased", {
            "orderId": order["orderId"],
            "userId": user_id
        })

        return {
            "status": "SUCCESS",
            "orderId": order["orderId"]
        }