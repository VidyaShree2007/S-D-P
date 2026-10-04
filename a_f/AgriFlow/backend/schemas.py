from datetime import datetime
from typing import List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field

EMAIL_PATTERN = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"


# ---------- Auth ----------
class RegisterIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(..., min_length=2, max_length=60)
    email: str = Field(..., pattern=EMAIL_PATTERN)
    password: str = Field(..., min_length=6, max_length=100)
    role: Literal["farmer", "vendor", "buyer"]


class LoginIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=1)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    role: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------- Crops ----------
class CropCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    crop_name: str = Field(..., min_length=1)
    quantity: int = Field(..., gt=0)
    price: float = Field(..., gt=0)
    farmer_name: Optional[str] = None   # defaults to the logged-in farmer's name


class CropUpdate(BaseModel):
    price: Optional[float] = Field(None, gt=0)
    quantity: Optional[int] = Field(None, ge=0)


class CropOut(BaseModel):
    id: int
    crop_name: str
    quantity: int
    price: float
    origin_farmer: str
    seller_id: int
    seller_name: str
    seller_role: str


# ---------- Orders ----------
class OrderCreate(BaseModel):
    crop_id: int
    quantity: int = Field(..., gt=0)


class StatusUpdate(BaseModel):
    status: Literal["Pending", "Confirmed", "Delivered"]


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    crop_id: int
    crop_name: str
    origin_farmer: str
    seller_id: int
    seller_name: str
    seller_role: str
    buyer_id: int
    buyer_name: str
    buyer_role: str
    quantity: int
    total_price: float
    status: str
    created_at: datetime


# ---------- Dashboard ----------
class TopCrop(BaseModel):
    crop_name: str
    quantity: int


class DashboardOut(BaseModel):
    # whole marketplace
    total_crops: int
    total_orders: int
    total_stock: int
    # the logged-in user
    role: str
    my_listings: int
    my_stock: int
    orders_received: int
    orders_placed: int
    revenue: float
    spent: float
    pending_orders: int
    top_crops: List[TopCrop]
