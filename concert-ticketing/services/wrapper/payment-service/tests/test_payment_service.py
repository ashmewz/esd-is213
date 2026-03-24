"""
Tests for the Payment Service — Scenario A: Ticket Purchase.

Uses an in-memory SQLite database so no real Postgres/Supabase connection is needed.
The mock payment provider is used by default (amount > 10,000 triggers a decline).
"""
import pytest

from app import create_app, db as _db
from app.models.payment_models import Transaction


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture()
def app():
    """Create a Flask app wired to an in-memory SQLite database."""
    test_app = create_app()
    test_app.config.update({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
    })

    with test_app.app_context():
        # SQLite doesn't support schemas — strip them so create_all works
        for table in _db.metadata.tables.values():
            table.schema = None
        _db.create_all()
        yield test_app
        _db.session.remove()
        _db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _purchase_payload(**overrides):
    base = {
        "orderId": "O3001",
        "userId": "U1001",
        "amount": 188.0,
        "currency": "SGD",
        "type": "PURCHASE",
        "idempotencyKey": "test-key-001",
    }
    base.update(overrides)
    return base


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestSuccessfulPurchase:
    def test_returns_201_with_success_body(self, client):
        resp = client.post("/payments", json=_purchase_payload())
        assert resp.status_code == 201
        data = resp.get_json()
        assert data["status"] == "SUCCESS"
        assert data["amount"] == 188.0
        assert data["currency"] == "SGD"
        assert "transactionId" in data
        assert "providerTxnId" in data

    def test_transaction_persisted_as_success(self, app, client):
        client.post("/payments", json=_purchase_payload(idempotencyKey="persist-test"))
        with app.app_context():
            txn = _db.session.query(Transaction).filter_by(
                idempotency_key="persist-test"
            ).first()
            assert txn is not None
            assert txn.status == "SUCCESS"
            assert txn.external_ref_id is not None


class TestFailedPurchase:
    def test_returns_402_when_amount_exceeds_limit(self, client):
        # Mock provider declines amounts > 10,000
        resp = client.post("/payments", json=_purchase_payload(
            amount=15000.0,
            idempotencyKey="decline-test"
        ))
        assert resp.status_code == 402
        data = resp.get_json()
        assert data["status"] == "FAILED"
        assert "reason" in data

    def test_transaction_persisted_as_failed(self, app, client):
        client.post("/payments", json=_purchase_payload(
            amount=99999.0,
            idempotencyKey="fail-persist-test"
        ))
        with app.app_context():
            txn = _db.session.query(Transaction).filter_by(
                idempotency_key="fail-persist-test"
            ).first()
            assert txn is not None
            assert txn.status == "FAILED"
            assert txn.failure_reason is not None


class TestIdempotency:
    def test_duplicate_key_returns_same_transaction(self, client):
        payload = _purchase_payload(idempotencyKey="idem-key-001")

        resp1 = client.post("/payments", json=payload)
        resp2 = client.post("/payments", json=payload)

        assert resp1.status_code == 201
        assert resp2.status_code == 201
        assert resp1.get_json()["transactionId"] == resp2.get_json()["transactionId"]

    def test_duplicate_key_does_not_create_second_transaction(self, app, client):
        payload = _purchase_payload(idempotencyKey="idem-key-002")
        client.post("/payments", json=payload)
        client.post("/payments", json=payload)

        with app.app_context():
            count = _db.session.query(Transaction).filter_by(
                idempotency_key="idem-key-002"
            ).count()
            assert count == 1


class TestValidation:
    def test_missing_field_returns_400(self, client):
        payload = _purchase_payload()
        del payload["amount"]
        resp = client.post("/payments", json=payload)
        assert resp.status_code == 400
        assert "amount" in resp.get_json()["error"]

    def test_negative_amount_returns_400(self, client):
        resp = client.post("/payments", json=_purchase_payload(
            amount=-50.0,
            idempotencyKey="neg-amount"
        ))
        assert resp.status_code == 400

    def test_zero_amount_returns_400(self, client):
        resp = client.post("/payments", json=_purchase_payload(
            amount=0,
            idempotencyKey="zero-amount"
        ))
        assert resp.status_code == 400

    def test_unsupported_currency_returns_400(self, client):
        resp = client.post("/payments", json=_purchase_payload(
            currency="JPY",
            idempotencyKey="bad-currency"
        ))
        assert resp.status_code == 400

    def test_unsupported_type_returns_400(self, client):
        resp = client.post("/payments", json=_purchase_payload(
            type="REFUND",
            idempotencyKey="bad-type"
        ))
        assert resp.status_code == 400

    def test_empty_body_returns_400(self, client):
        resp = client.post("/payments", content_type="application/json", data="")
        assert resp.status_code == 400
