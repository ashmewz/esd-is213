from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class SwapRequest(Base):
    __tablename__ = "swap_requests"

    requestId = Column(Integer, primary_key=True, autoincrement=True)
    orderId = Column(Integer, nullable=False)
    swapStatus = Column(String(50))


class SwapMatch(Base):
    __tablename__ = "swap_matches"

    swapId = Column(Integer, primary_key=True, autoincrement=True)
    requestA = Column(Integer, nullable=False)
    requestB = Column(Integer, nullable=False)
    matchStatus = Column(String(50))