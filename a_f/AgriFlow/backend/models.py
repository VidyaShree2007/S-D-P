from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


def utc_now():
    return datetime.now(timezone.utc)


class User(Base):
    """Every person who logs in. role is 'farmer', 'vendor' or 'buyer'."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)
    created_at = Column(DateTime, default=utc_now)


class Crop(Base):
    """A crop listing. The owner is either a farmer or a vendor."""
    __tablename__ = "crops"

    id = Column(Integer, primary_key=True, index=True)
    crop_name = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False)     # stock in kg
    price = Column(Float, nullable=False)          # price per kg
    origin_farmer = Column(String, nullable=False) # which farm grew it
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=utc_now)

    owner = relationship("User")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    crop_id = Column(Integer, ForeignKey("crops.id"), nullable=False)
    crop_name = Column(String, nullable=False)
    origin_farmer = Column(String, nullable=False)

    seller_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    seller_name = Column(String, nullable=False)
    seller_role = Column(String, nullable=False)

    buyer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    buyer_name = Column(String, nullable=False)
    buyer_role = Column(String, nullable=False)

    quantity = Column(Integer, nullable=False)
    total_price = Column(Float, nullable=False)
    status = Column(String, nullable=False, default="Pending")
    created_at = Column(DateTime, default=utc_now)
