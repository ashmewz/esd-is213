CREATE TABLE SeatAssignment (
    seatAssignId SERIAL PRIMARY KEY,
    orderId INT NOT NULL,
    seatId INT NOT NULL,
    lastUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Hold (
    holdId SERIAL PRIMARY KEY,
    orderId INT NOT NULL,
    expiry TIMESTAMP NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    CHECK (status IN ('ACTIVE','EXPIRED','CANCELLED'))
);

CREATE INDEX idx_assignment_order ON SeatAssignment(orderId);
CREATE INDEX idx_assignment_seat ON SeatAssignment(seatId);
CREATE INDEX idx_hold_order ON Hold(orderId);