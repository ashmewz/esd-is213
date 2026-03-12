CREATE TABLE PaymentTransaction (
    transactionId SERIAL PRIMARY KEY,
    orderId INT NOT NULL,
    type VARCHAR(20) NOT NULL,
    amount DOUBLE PRECISION NOT NULL,
    paymentStatus VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (type IN ('PAYMENT','REFUND','ADJUSTMENT')),
    CHECK (paymentStatus IN ('PENDING','SUCCESS','FAILED'))
);

CREATE INDEX idx_transaction_order ON PaymentTransaction(orderId);