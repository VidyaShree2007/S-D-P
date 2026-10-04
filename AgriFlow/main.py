from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import os

from database import Base, engine, get_db
from models import Crop, Order, User, ContactMessage
from schemas import (
    CropCreate, CropResponse,
    OrderCreate, OrderResponse,
    UserRegister, UserLogin, UserResponse,
    ContactCreate, ContactResponse
)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="AgriFlow API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static frontend files
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "frontend", "AgriFlow")
if os.path.isdir(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")


@app.get("/")
def home():
    """Serve the login page as the entry point"""
    login_path = os.path.join(FRONTEND_DIR, "login.html")
    if os.path.exists(login_path):
        return FileResponse(login_path)
    return {"message": "AgriFlow API is working!"}


# ==========================================
# AUTH ENDPOINTS
# ==========================================

@app.post("/register", response_model=UserResponse)
def register(user: UserRegister, db: Session = Depends(get_db)):
    # Check if email already exists
    existing = db.query(User).filter(User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = User(
        name=user.name,
        email=user.email,
        password=user.password,  # In production, hash this!
        role=user.role,
        phone=user.phone
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@app.post("/login", response_model=UserResponse)
def login(creds: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == creds.email).first()
    if not user or user.password != creds.password:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return user


@app.get("/users/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# ==========================================
# CROP ENDPOINTS
# ==========================================

@app.post("/crops", response_model=CropResponse)
def add_crop(crop: CropCreate, db: Session = Depends(get_db)):
    new_crop = Crop(**crop.model_dump())
    db.add(new_crop)
    db.commit()
    db.refresh(new_crop)
    return new_crop


@app.get("/crops", response_model=list[CropResponse])
def get_crops(db: Session = Depends(get_db)):
    return db.query(Crop).order_by(Crop.id.desc()).all()


@app.get("/crops/{crop_id}", response_model=CropResponse)
def get_crop(crop_id: int, db: Session = Depends(get_db)):
    crop = db.query(Crop).filter(Crop.id == crop_id).first()
    if not crop:
        raise HTTPException(status_code=404, detail="Crop not found")
    return crop


@app.delete("/crops/{crop_id}")
def delete_crop(crop_id: int, db: Session = Depends(get_db)):
    crop = db.query(Crop).filter(Crop.id == crop_id).first()
    if not crop:
        raise HTTPException(status_code=404, detail="Crop not found")
    db.delete(crop)
    db.commit()
    return {"message": "Crop deleted"}


# ==========================================
# ORDER ENDPOINTS
# ==========================================

@app.post("/orders", response_model=OrderResponse)
def add_order(order: OrderCreate, db: Session = Depends(get_db)):
    crop = db.query(Crop).filter(Crop.id == order.crop_id).first()

    if crop is None:
        raise HTTPException(status_code=404, detail="Crop not found")

    if order.quantity > crop.quantity:
        raise HTTPException(status_code=400, detail="Not enough stock")

    crop.quantity -= order.quantity
    new_order = Order(**order.model_dump())
    db.add(new_order)
    db.commit()
    db.refresh(new_order)
    return new_order


@app.get("/orders", response_model=list[OrderResponse])
def get_orders(db: Session = Depends(get_db)):
    return db.query(Order).order_by(Order.id.desc()).all()


@app.get("/orders/buyer/{buyer_id}", response_model=list[OrderResponse])
def get_buyer_orders(buyer_id: int, db: Session = Depends(get_db)):
    return db.query(Order).filter(Order.buyer_id == buyer_id).order_by(Order.id.desc()).all()


@app.get("/orders/farmer/{farmer_name}")
def get_farmer_orders(farmer_name: str, db: Session = Depends(get_db)):
    """Get orders for crops belonging to a farmer"""
    farmer_crops = db.query(Crop).filter(Crop.farmer == farmer_name).all()
    crop_ids = [c.id for c in farmer_crops]
    orders = db.query(Order).filter(Order.crop_id.in_(crop_ids)).order_by(Order.id.desc()).all()
    result = []
    for order in orders:
        crop = db.query(Crop).filter(Crop.id == order.crop_id).first()
        result.append({
            "id": order.id,
            "crop_id": order.crop_id,
            "crop_name": crop.name if crop else "Unknown",
            "quantity": order.quantity,
            "buyer": order.buyer,
            "status": order.status
        })
    return result


@app.put("/orders/{order_id}/status")
def update_order_status(order_id: int, status: str, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.status = status
    db.commit()
    return {"message": "Order status updated", "status": status}


# ==========================================
# CONTACT MESSAGE ENDPOINTS
# ==========================================

@app.post("/messages", response_model=ContactResponse)
def send_message(msg: ContactCreate, db: Session = Depends(get_db)):
    new_msg = ContactMessage(**msg.model_dump())
    db.add(new_msg)
    db.commit()
    db.refresh(new_msg)
    return new_msg


@app.get("/messages/{user_id}")
def get_messages(user_id: int, db: Session = Depends(get_db)):
    """Get all messages where user is sender or receiver"""
    messages = db.query(ContactMessage).filter(
        (ContactMessage.sender_id == user_id) |
        (ContactMessage.receiver_id == user_id)
    ).order_by(ContactMessage.id.desc()).all()
    return messages


# ==========================================
# DASHBOARD ENDPOINTS
# ==========================================

@app.get("/dashboard")
def dashboard(db: Session = Depends(get_db)):
    crops = db.query(Crop).all()
    orders = db.query(Order).all()

    return {
        "total_crops": len(crops),
        "total_orders": len(orders),
        "total_stock": sum(c.quantity for c in crops),
        "total_order_value": round(
            sum(
                order.quantity * (
                    db.query(Crop.price)
                    .filter(Crop.id == order.crop_id)
                    .scalar() or 0
                )
                for order in orders
            ),
            2
        )
    }


@app.get("/dashboard/buyer/{buyer_id}")
def buyer_dashboard(buyer_id: int, db: Session = Depends(get_db)):
    orders = db.query(Order).filter(Order.buyer_id == buyer_id).all()
    total_spent = 0
    for order in orders:
        price = db.query(Crop.price).filter(Crop.id == order.crop_id).scalar()
        if price:
            total_spent += order.quantity * price

    return {
        "total_orders": len(orders),
        "total_spent": round(total_spent, 2),
        "pending_orders": len([o for o in orders if o.status == "Placed"]),
        "completed_orders": len([o for o in orders if o.status == "Completed"])
    }


@app.get("/dashboard/farmer/{farmer_id}")
def farmer_dashboard(farmer_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == farmer_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Farmer not found")

    crops = db.query(Crop).filter(Crop.farmer_id == farmer_id).all()
    crop_ids = [c.id for c in crops]
    orders = db.query(Order).filter(Order.crop_id.in_(crop_ids)).all() if crop_ids else []

    total_revenue = 0
    for order in orders:
        price = db.query(Crop.price).filter(Crop.id == order.crop_id).scalar()
        if price:
            total_revenue += order.quantity * price

    return {
        "total_crops": len(crops),
        "total_orders": len(orders),
        "total_stock": sum(c.quantity for c in crops),
        "total_revenue": round(total_revenue, 2)
    }