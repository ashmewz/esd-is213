from sqlalchemy import Column, Integer, String, Date, Float, ForeignKey, Text
from sqlalchemy.orm import relationship, declarative_base

Base = declarative_base()

class Event(Base):
    __tablename__ = "events"

    eventId = Column(Integer, primary_key=True, autoincrement=True)
    venueId = Column(Integer, nullable=False)
    name = Column(String(255), nullable=False)
    date = Column(Date, nullable=False)
    seatmap = Column(Text)
    status = Column(String(50))

    seats = relationship("Seat", back_populates="event", cascade="all, delete")

class Seat(Base):
    __tablename__ = "seats"

    seatId = Column(Integer, primary_key=True, autoincrement=True)
    eventId = Column(Integer, ForeignKey("events.eventId"), nullable=False)
    tier = Column(String(50))
    sectionNo = Column(Integer)
    rowNo = Column(Integer)
    basePrice = Column(Float)
    status = Column(String(50))

    event = relationship("Event", back_populates="seats")