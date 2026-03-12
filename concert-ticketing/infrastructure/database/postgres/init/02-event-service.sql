CREATE TABLE Event (
    eventId SERIAL PRIMARY KEY,
    venueId INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    seatmap NVARCHAR(MAX),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    CHECK (status IN ('ACTIVE','CANCELLED','COMPLETED'))
);

CREATE TABLE Seat (
    seatId SERIAL PRIMARY KEY,
    eventId INT NOT NULL,
    tier VARCHAR(20) NOT NULL,
    sectionNo INT NOT NULL,
    rowNo INT NOT NULL,
    seatNo INT NOT NULL,
    basePrice DOUBLE PRECISION NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
    CHECK (tier IN ('VIP','PREMIUM','STANDARD')),
    CHECK (status IN ('AVAILABLE','HELD','RESERVED'))
);

CREATE INDEX idx_seat_event ON Seat(eventId);