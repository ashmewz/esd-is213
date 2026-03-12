CREATE TABLE SwapRequest (
    requestId SERIAL PRIMARY KEY,
    orderId INT NOT NULL,
    desiredTier VARCHAR(20) NOT NULL,
    swapStatus VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    CHECK (swapStatus IN ('PENDING','MATCHED','COMPLETED','CANCELLED'))
);

CREATE TABLE SwapMatch (
    swapId SERIAL PRIMARY KEY,
    requestA INT NOT NULL,
    requestB INT NOT NULL,
    matchStatus VARCHAR(20) NOT NULL DEFAULT 'MATCHED',
    CHECK (matchStatus IN ('MATCHED','COMPLETED','CANCELLED'))
);

CREATE INDEX idx_swap_request_order ON SwapRequest(orderId);