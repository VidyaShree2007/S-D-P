from typing import List

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func
from sqlalchemy.orm import Session

import models
import schemas
from database import engine, get_db

# Create the tables in SQLite if they don't exist yet
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="AgriFlow API")

# Allow the frontend (HTML files) to talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {"message": "Welcome to AgriFlow API 🌾"}


# ---------------- CROPS ----------------
@app.get("/crops", response_model=List[schemas.CropOut])
def get_crops(available_only: bool = False, db: Session = Depends(get_db)):
    """
    available_only=true  -> only crops with stock > 0 (used by buyers)
    available_only=false -> every crop, including sold-out ones (used by farmers)
    """
    query = db.query(models.Crop)
    if available_only:
        query = query.filter(models.Crop.quantity > 0)
    return query.order_by(models.Crop.id.desc()).all()


@app.post("/crops", response_model=schemas.CropOut, status_code=201)
def add_crop(crop: schemas.CropCreate, db: Session = Depends(get_db)):
    new_crop = models.Crop(**crop.model_dump())
    db.add(new_crop)
    db.commit()
    db.refresh(new_crop)
    return new_crop


# ---------------- ORDERS ----------------
@app.get("/orders", response_model=List[schemas.OrderOut])
def get_orders(db: Session = Depends(get_db)):
    return db.query(models.Order).order_by(models.Order.id.desc()).all()


@app.post("/orders", response_model=schemas.OrderOut, status_code=201)
def create_order(order: schemas.OrderCreate, db: Session = Depends(get_db)):
    crop = db.query(models.Crop).filter(models.Crop.id == order.crop_id).first()

    if crop is None:
        raise HTTPException(status_code=404, detail="Crop not found.")

    if crop.quantity <= 0:
        raise HTTPException(status_code=400, detail="This crop is out of stock.")

    if order.quantity > crop.quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Not enough stock. Only {crop.quantity} kg available.",
        )

    # Create the order and decrease the stock (saved together in one commit)
    new_order = models.Order(
        crop_id=crop.id,
        crop_name=crop.crop_name,
        farmer_name=crop.farmer_name,
        buyer_name=order.buyer_name,
        quantity=order.quantity,
        total_price=round(order.quantity * crop.price, 2),
    )
    crop.quantity -= order.quantity

    db.add(new_order)
    db.commit()
    db.refresh(new_order)
    return new_order


# ---------------- DASHBOARD ----------------
@app.get("/dashboard", response_model=schemas.DashboardOut)
def dashboard(db: Session = Depends(get_db)):
    total_crops = db.query(func.count(models.Crop.id)).scalar() or 0
    total_orders = db.query(func.count(models.Order.id)).scalar() or 0
    total_stock = db.query(func.coalesce(func.sum(models.Crop.quantity), 0)).scalar()
    return {
        "total_crops": total_crops,
        "total_orders": total_orders,
        "total_stock": int(total_stock),
    }
