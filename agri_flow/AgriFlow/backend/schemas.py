from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


# ---------- Crops ----------
class CropCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    crop_name: str = Field(..., min_length=1)
    quantity: int = Field(..., gt=0)
    price: float = Field(..., gt=0)
    farmer_name: str = Field(..., min_length=1)


class CropOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    crop_name: str
    quantity: int
    price: float
    farmer_name: str


# ---------- Orders ----------
class OrderCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    crop_id: int
    buyer_name: str = Field(..., min_length=1)
    quantity: int = Field(..., gt=0)


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    crop_id: int
    crop_name: str
    farmer_name: str
    buyer_name: str
    quantity: int
    total_price: float
    created_at: datetime


# ---------- Dashboard ----------
class DashboardOut(BaseModel):
    total_crops: int
    total_orders: int
    total_stock: int
