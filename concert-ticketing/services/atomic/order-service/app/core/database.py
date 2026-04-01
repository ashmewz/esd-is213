"""Legacy module: SQLAlchemy models use Flask-SQLAlchemy ``db`` from ``app`` (see ``app.__init__``).
This file is kept so older references do not break; the engine/SessionLocal pattern was removed
in favor of a single ``db`` instance shared with the Flask app."""