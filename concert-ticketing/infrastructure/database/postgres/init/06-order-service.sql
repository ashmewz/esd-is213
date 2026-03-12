CREATE TABLE Orders (
    orderId SERIAL PRIMARY KEY,
    eventId INT NOT NULL,
    userId INT NOT NULL,
    seatId INT NOT NULL,
    totalAmt DOUBLE PRECISION NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'CREATED',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (status IN ('CREATED','CONFIRMED','CANCELLED','SWAP_PENDING'))
);

CREATE INDEX idx_order_user ON Orders(userId);
CREATE INDEX idx_order_event ON Orders(eventId);