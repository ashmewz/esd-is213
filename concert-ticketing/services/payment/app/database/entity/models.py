from sqlalchemy import Column, Integer, String, Float
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class Transaction(Base):
    __tablename__ = "transactions"

    transactionId = Column(Integer, primary_key=True, autoincrement=True)
    orderId = Column(Integer, nullable=False)
    type = Column(String(50))
    amount = Column(Float)
    paymentStatus = Column(String(50))