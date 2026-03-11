from sqlalchemy import Column, Integer, String, ForeignKey, TIMESTAMP
from sqlalchemy.orm import declarative_base
from sqlalchemy.sql import func

Base = declarative_base()

class SeatAssignment(Base):
    __tablename__ = "seat_assignments"

    seatAssignId = Column(Integer, primary_key=True, autoincrement=True)
    orderId = Column(Integer, nullable=False)
    seatId = Column(Integer, nullable=False)
    lastUpdated = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())


class Hold(Base):
    __tablename__ = "holds"

    holdId = Column(Integer, primary_key=True, autoincrement=True)
    orderId = Column(Integer, nullable=False)
    expiry = Column(TIMESTAMP, nullable=False)
    status = Column(String(50))