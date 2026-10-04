from typing import List, Optional

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

import models
import schemas
from auth import (
    create_token,
    get_current_user,
    hash_password,
    require_role,
    verify_password,
)
from database import engine, get_db

# Create the tables in SQLite if they don't exist yet
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="AgriFlow API")

# Allow the frontend (HTML files) to talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,   # we use an Authorization header, not cookies
    allow_methods=["*"],
    allow_headers=["*"],
)

STATUS_ORDER = ["Pending", "Confirmed", "Delivered"]
VENDOR_MARKUP = 1.20   # vendors' retail price starts at wholesale + 20%


def crop_out(crop: models.Crop) -> schemas.CropOut:
    """Turns a Crop row into the JSON shape we send to the frontend."""
    return schemas.CropOut(
        id=crop.id,
        crop_name=crop.crop_name,
        quantity=crop.quantity,
        price=crop.price,
        origin_farmer=crop.origin_farmer,
        seller_id=crop.owner_id,
        seller_name=crop.owner.name,
        seller_role=crop.owner.role,
    )


@app.get("/")
def home():
    return {"message": "Welcome to AgriFlow API 🌾"}


# ---------------- AUTH ----------------
@app.post("/register", response_model=schemas.TokenOut, status_code=201)
def register(data: schemas.RegisterIn, db: Session = Depends(get_db)):
    email = data.email.lower()
    if db.query(models.User).filter(models.User.email == email).first():
        raise HTTPException(status_code=400, detail="This email is already registered.")

    user = models.User(
        name=data.name,
        email=email,
        password_hash=hash_password(data.password),
        role=data.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"access_token": create_token(user.id), "token_type": "bearer", "user": user}


@app.post("/login", response_model=schemas.TokenOut)
def login(data: schemas.LoginIn, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == data.email.lower()).first()
    if user is None or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Wrong email or password.")
    return {"access_token": create_token(user.id), "token_type": "bearer", "user": user}


@app.get("/me", response_model=schemas.UserOut)
def me(user: models.User = Depends(get_current_user)):
    return user


# ---------------- CROPS ----------------
@app.get("/crops", response_model=List[schemas.CropOut])
def get_crops(
    available_only: bool = False,
    seller_role: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Public list of crops.
    available_only=true -> hide sold-out crops (stock 0) from buyers
    seller_role=farmer|vendor -> only crops sold by that kind of seller
    search=tom -> crop name contains "tom"
    """
    query = db.query(models.Crop).options(joinedload(models.Crop.owner))
    if available_only:
        query = query.filter(models.Crop.quantity > 0)
    if seller_role in ("farmer", "vendor"):
        query = query.join(models.User, models.Crop.owner_id == models.User.id).filter(
            models.User.role == seller_role
        )
    if search:
        query = query.filter(func.lower(models.Crop.crop_name).like(f"%{search.strip().lower()}%"))
    return [crop_out(c) for c in query.order_by(models.Crop.id.desc()).all()]


@app.get("/crops/mine", response_model=List[schemas.CropOut])
def my_crops(
    user: models.User = Depends(require_role("farmer", "vendor")),
    db: Session = Depends(get_db),
):
    crops = (
        db.query(models.Crop)
        .options(joinedload(models.Crop.owner))
        .filter(models.Crop.owner_id == user.id)
        .order_by(models.Crop.id.desc())
        .all()
    )
    return [crop_out(c) for c in crops]


@app.post("/crops", response_model=schemas.CropOut, status_code=201)
def add_crop(
    crop: schemas.CropCreate,
    user: models.User = Depends(require_role("farmer")),
    db: Session = Depends(get_db),
):
    new_crop = models.Crop(
        crop_name=crop.crop_name,
        quantity=crop.quantity,
        price=crop.price,
        origin_farmer=crop.farmer_name or user.name,
        owner_id=user.id,
    )
    db.add(new_crop)
    db.commit()
    db.refresh(new_crop)
    return crop_out(new_crop)


@app.put("/crops/{crop_id}", response_model=schemas.CropOut)
def update_crop(
    crop_id: int,
    data: schemas.CropUpdate,
    user: models.User = Depends(require_role("farmer", "vendor")),
    db: Session = Depends(get_db),
):
    crop = db.query(models.Crop).filter(models.Crop.id == crop_id).first()
    if crop is None or crop.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Crop not found.")

    if data.quantity is not None:
        # A vendor's stock only comes from wholesale purchases, so it can't be typed in.
        if user.role == "vendor":
            raise HTTPException(status_code=403, detail="Vendors get stock by buying from farmers.")
        crop.quantity = data.quantity
    if data.price is not None:
        crop.price = data.price

    db.commit()
    db.refresh(crop)
    return crop_out(crop)


# ---------------- ORDERS ----------------
@app.get("/orders", response_model=List[schemas.OrderOut])
def get_orders(
    view: Optional[str] = None,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Orders that involve the logged-in user.
    view=sales      -> orders where I am the seller
    view=purchases  -> orders where I am the buyer
    (no view)       -> both
    """
    query = db.query(models.Order)
    if view == "sales":
        query = query.filter(models.Order.seller_id == user.id)
    elif view == "purchases":
        query = query.filter(models.Order.buyer_id == user.id)
    else:
        query = query.filter(or_(models.Order.seller_id == user.id, models.Order.buyer_id == user.id))
    return query.order_by(models.Order.id.desc()).all()


@app.post("/orders", response_model=schemas.OrderOut, status_code=201)
def create_order(
    order: schemas.OrderCreate,
    user: models.User = Depends(require_role("buyer", "vendor")),
    db: Session = Depends(get_db),
):
    crop = (
        db.query(models.Crop)
        .options(joinedload(models.Crop.owner))
        .filter(models.Crop.id == order.crop_id)
        .first()
    )
    if crop is None:
        raise HTTPException(status_code=404, detail="Crop not found.")

    seller = crop.owner
    if seller.id == user.id:
        raise HTTPException(status_code=400, detail="You cannot buy your own crop.")
    if user.role == "vendor" and seller.role != "farmer":
        raise HTTPException(status_code=403, detail="Vendors can only buy wholesale from farmers.")

    if crop.quantity <= 0:
        raise HTTPException(status_code=400, detail="This crop is out of stock.")
    if order.quantity > crop.quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Not enough stock. Only {crop.quantity} kg available.",
        )

    # Decrease the stock in ONE safe step: it only succeeds if enough stock is still there.
    updated = (
        db.query(models.Crop)
        .filter(models.Crop.id == crop.id, models.Crop.quantity >= order.quantity)
        .update({models.Crop.quantity: models.Crop.quantity - order.quantity}, synchronize_session=False)
    )
    if updated == 0:
        db.rollback()
        raise HTTPException(status_code=400, detail="Someone just bought this stock. Please refresh.")

    new_order = models.Order(
        crop_id=crop.id,
        crop_name=crop.crop_name,
        origin_farmer=crop.origin_farmer,
        seller_id=seller.id,
        seller_name=seller.name,
        seller_role=seller.role,
        buyer_id=user.id,
        buyer_name=user.name,
        buyer_role=user.role,
        quantity=order.quantity,
        total_price=round(order.quantity * crop.price, 2),
        status="Pending",
    )
    db.add(new_order)

    # A vendor's wholesale purchase becomes stock in the vendor's own store.
    if user.role == "vendor":
        store_item = (
            db.query(models.Crop)
            .filter(
                models.Crop.owner_id == user.id,
                func.lower(models.Crop.crop_name) == crop.crop_name.lower(),
                models.Crop.origin_farmer == crop.origin_farmer,
            )
            .first()
        )
        if store_item:
            store_item.quantity += order.quantity
        else:
            db.add(
                models.Crop(
                    crop_name=crop.crop_name,
                    quantity=order.quantity,
                    price=round(crop.price * VENDOR_MARKUP, 2),
                    origin_farmer=crop.origin_farmer,
                    owner_id=user.id,
                )
            )

    db.commit()   # order + stock change + vendor stock are saved together
    db.refresh(new_order)
    return new_order


@app.put("/orders/{order_id}/status", response_model=schemas.OrderOut)
def update_order_status(
    order_id: int,
    data: schemas.StatusUpdate,
    user: models.User = Depends(require_role("farmer", "vendor")),
    db: Session = Depends(get_db),
):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if order is None or order.seller_id != user.id:
        raise HTTPException(status_code=404, detail="Order not found.")

    if STATUS_ORDER.index(data.status) <= STATUS_ORDER.index(order.status):
        raise HTTPException(status_code=400, detail=f"Order is already {order.status}.")

    order.status = data.status
    db.commit()
    db.refresh(order)
    return order


# ---------------- DASHBOARD ----------------
@app.get("/dashboard", response_model=schemas.DashboardOut)
def dashboard(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    total_crops = db.query(func.count(models.Crop.id)).scalar() or 0
    total_orders = db.query(func.count(models.Order.id)).scalar() or 0
    total_stock = db.query(func.coalesce(func.sum(models.Crop.quantity), 0)).scalar()

    my_listings = (
        db.query(func.count(models.Crop.id)).filter(models.Crop.owner_id == user.id).scalar() or 0
    )
    my_stock = (
        db.query(func.coalesce(func.sum(models.Crop.quantity), 0))
        .filter(models.Crop.owner_id == user.id)
        .scalar()
    )
    orders_received = (
        db.query(func.count(models.Order.id)).filter(models.Order.seller_id == user.id).scalar() or 0
    )
    orders_placed = (
        db.query(func.count(models.Order.id)).filter(models.Order.buyer_id == user.id).scalar() or 0
    )
    revenue = (
        db.query(func.coalesce(func.sum(models.Order.total_price), 0))
        .filter(models.Order.seller_id == user.id)
        .scalar()
    )
    spent = (
        db.query(func.coalesce(func.sum(models.Order.total_price), 0))
        .filter(models.Order.buyer_id == user.id)
        .scalar()
    )
    pending_orders = (
        db.query(func.count(models.Order.id))
        .filter(models.Order.seller_id == user.id, models.Order.status == "Pending")
        .scalar()
        or 0
    )

    # Chart data: farmers/vendors see what they SELL most, buyers see what they BUY most
    owner_column = models.Order.buyer_id if user.role == "buyer" else models.Order.seller_id
    top_rows = (
        db.query(models.Order.crop_name, func.sum(models.Order.quantity).label("kg"))
        .filter(owner_column == user.id)
        .group_by(models.Order.crop_name)
        .order_by(func.sum(models.Order.quantity).desc())
        .limit(5)
        .all()
    )

    return {
        "total_crops": total_crops,
        "total_orders": total_orders,
        "total_stock": int(total_stock),
        "role": user.role,
        "my_listings": my_listings,
        "my_stock": int(my_stock),
        "orders_received": orders_received,
        "orders_placed": orders_placed,
        "revenue": round(float(revenue), 2),
        "spent": round(float(spent), 2),
        "pending_orders": pending_orders,
        "top_crops": [{"crop_name": name, "quantity": int(kg)} for name, kg in top_rows],
    }
