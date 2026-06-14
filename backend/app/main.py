import time
from typing import List
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError

from .database import engine, Base, get_db
from . import crud, schemas, models

app = FastAPI(
    title="Inventory & Order Management System API",
    description="Backend API for managing products, customers, and orders.",
    version="1.0.0"
)

# Enable CORS for the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to the frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup event to verify connection and auto-create tables
@app.on_event("startup")
def on_startup():
    retries = 10
    while retries > 0:
        try:
            Base.metadata.create_all(bind=engine)
            print("PostgreSQL tables successfully verified/created.")
            break
        except OperationalError as e:
            retries -= 1
            print(f"PostgreSQL connection failed. Retrying in 3 seconds... ({10 - retries}/10)")
            print(f"Error details: {e}")
            time.sleep(3)
    if retries == 0:
        print("Could not connect to PostgreSQL. App may fail on DB queries.")

# Helper to map Order models to OrderResponse schemas
def map_order_to_response(order: models.Order) -> schemas.OrderResponse:
    items_response = []
    for item in order.items:
        items_response.append(
            schemas.OrderItemResponse(
                id=item.id,
                product_id=item.product_id,
                product_name=item.product.name if item.product else "Deleted Product",
                quantity=item.quantity,
                unit_price=item.unit_price
            )
        )
    return schemas.OrderResponse(
        id=order.id,
        customer_id=order.customer_id,
        customer_name=order.customer.name if order.customer else "Deleted Customer",
        total_amount=order.total_amount,
        created_at=order.created_at,
        items=items_response
    )

# --- Root endpoint ---
@app.get("/")
def read_root():
    return {"message": "Welcome to the Inventory & Order Management System API!"}

# --- Product Endpoints ---
@app.post("/products", response_model=schemas.ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(product: schemas.ProductCreate, db: Session = Depends(get_db)):
    return crud.create_product(db=db, product=product)

@app.get("/products", response_model=List[schemas.ProductResponse])
def read_products(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_products(db=db, skip=skip, limit=limit)

@app.get("/products/{id}", response_model=schemas.ProductResponse)
def read_product(id: int, db: Session = Depends(get_db)):
    db_product = crud.get_product(db=db, product_id=id)
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    return db_product

@app.put("/products/{id}", response_model=schemas.ProductResponse)
def update_product(id: int, product: schemas.ProductUpdate, db: Session = Depends(get_db)):
    return crud.update_product(db=db, product_id=id, product_update=product)

@app.delete("/products/{id}", response_model=schemas.ProductResponse)
def delete_product(id: int, db: Session = Depends(get_db)):
    return crud.delete_product(db=db, product_id=id)


# --- Customer Endpoints ---
@app.post("/customers", response_model=schemas.CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(customer: schemas.CustomerCreate, db: Session = Depends(get_db)):
    return crud.create_customer(db=db, customer=customer)

@app.get("/customers", response_model=List[schemas.CustomerResponse])
def read_customers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_customers(db=db, skip=skip, limit=limit)

@app.get("/customers/{id}", response_model=schemas.CustomerResponse)
def read_customer(id: int, db: Session = Depends(get_db)):
    db_customer = crud.get_customer(db=db, customer_id=id)
    if not db_customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return db_customer

@app.delete("/customers/{id}", response_model=schemas.CustomerResponse)
def delete_customer(id: int, db: Session = Depends(get_db)):
    return crud.delete_customer(db=db, customer_id=id)


# --- Order Endpoints ---
@app.post("/orders", response_model=schemas.OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(order: schemas.OrderCreate, db: Session = Depends(get_db)):
    db_order = crud.create_order(db=db, order_in=order)
    return map_order_to_response(db_order)

@app.get("/orders", response_model=List[schemas.OrderResponse])
def read_orders(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    orders = crud.get_orders(db=db, skip=skip, limit=limit)
    return [map_order_to_response(o) for o in orders]

@app.get("/orders/{id}", response_model=schemas.OrderResponse)
def read_order(id: int, db: Session = Depends(get_db)):
    db_order = crud.get_order(db=db, order_id=id)
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")
    return map_order_to_response(db_order)

@app.delete("/orders/{id}", response_model=schemas.OrderResponse)
def delete_order(id: int, db: Session = Depends(get_db)):
    db_order = crud.delete_order(db=db, order_id=id)
    return map_order_to_response(db_order)


# --- Dashboard Stats Endpoint ---
@app.get("/dashboard/stats", response_model=schemas.DashboardStats)
def read_dashboard_stats(low_stock_threshold: int = 5, db: Session = Depends(get_db)):
    return crud.get_dashboard_stats(db=db, low_stock_threshold=low_stock_threshold)
