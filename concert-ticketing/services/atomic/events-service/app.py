from flask import Flask, jsonify
from temp_data import events, seats

app = Flask(__name__)

@app.route("/")
def hello():
    return "Hello from events service"

@app.route("/events")
def getAllEvents():
    return jsonify(events), 200

@app.route("/events/<int:event_id>/seats")
def getSeatsByEvent(event_id): #Gets all the seats in event, for seat-selection
    event_seats = [s for s in seats if s["eventId"] == event_id]
    if not event_seats:
        return jsonify({"error": "No seats found for this event"}), 404
    return jsonify(event_seats), 200

@app.route("/events/<int:event_id>/seats/<int:seat_id>")
def getSeat(event_id, seat_id): #gets specific seat, after seat is selected, checks for validity
    seat = next((s for s in seats if s["seatId"] == seat_id and s["eventId"] == event_id), None)
    if not seat:
        return jsonify({"error": "Seat not found"}), 404
    return jsonify(seat), 200

if __name__ == "__main__":
    app.run(debug=True, port=5000)

