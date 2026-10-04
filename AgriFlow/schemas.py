from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime


# ---- USER SCHEMAS ----

class UserRegister(BaseModel):
    name: str = Field(min_length=1)
    email: str = Field(min_length=3)
    password: str = Field(min_length=4)
    role: str = Field(pattern="^(farmer|buyer)$")
    phone: str = ""


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    phone: str

    model_config = ConfigDict(from_attributes=True)


# ---- CROP SCHEMAS ----

class CropCreate(BaseModel):
    name: str = Field(min_length=1)
    quantity: float = Field(gt=0)
    price: float = Field(gt=0)
    farmer: str = Field(min_length=1)
    farmer_id: Optional[int] = None
    description: str = ""
    category: str = "General"


class CropResponse(BaseModel):
    id: int
    name: str
    quantity: float
    price: float
    farmer: str
    farmer_id: Optional[int] = None
    description: str = ""
    category: str = "General"

    model_config = ConfigDict(from_attributes=True)


# ---- ORDER SCHEMAS ----

class OrderCreate(BaseModel):
    crop_id: int
    quantity: float = Field(gt=0)
    buyer: str = Field(min_length=1)
    buyer_id: Optional[int] = None


class OrderResponse(BaseModel):
    id: int
    crop_id: int
    quantity: float
    buyer: str
    buyer_id: Optional[int] = None
    status: str

    model_config = ConfigDict(from_attributes=True)


# ---- CONTACT MESSAGE SCHEMAS ----

class ContactCreate(BaseModel):
    sender_id: int
    receiver_id: int
    crop_id: Optional[int] = None
    message: str = Field(min_length=1)
    sender_name: str = Field(min_length=1)
    receiver_name: str = Field(min_length=1)


class ContactResponse(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    crop_id: Optional[int] = None
    message: str
    sender_name: str
    receiver_name: str

    model_config = ConfigDict(from_attributes=True)