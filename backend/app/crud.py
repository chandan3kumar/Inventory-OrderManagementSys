from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status
from decimal import Decimal
from . import models, schemas

# --- Product CRUD ---
def get_product(db: Session, product_id: int):
    return db.query(models.Product).filter(models.Product.id == product_id).first()

def get_product_by_sku(db: Session, sku: str):
    return db.query(models.Product).filter(models.Product.sku == sku).first()

def get_products(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Product).offset(skip).limit(limit).all()

def create_product(db: Session, product: schemas.ProductCreate):
    # Check if SKU is unique
    existing = get_product_by_sku(db, product.sku)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Product with SKU '{product.sku}' already exists."
        )
    
    db_product = models.Product(
        name=product.name,
        sku=product.sku,
        price=product.price,
        quantity_in_stock=product.quantity_in_stock
    )
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

def update_product(db: Session, product_id: int, product_update: schemas.ProductUpdate):
    db_product = get_product(db, product_id)
    if not db_product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found."
        )
    
    # Check SKU uniqueness if it's being updated
    if product_update.sku is not None and product_update.sku != db_product.sku:
        existing = get_product_by_sku(db, product_update.sku)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product with SKU '{product_update.sku}' already exists."
            )
            
    # Apply updates
    update_data = product_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_product, key, value)
        
    db.commit()
    db.refresh(db_product)
    return db_product

def delete_product(db: Session, product_id: int):
    db_product = get_product(db, product_id)
    if not db_product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found."
        )
    db.delete(db_product)
    db.commit()
    return db_product


# --- Customer CRUD ---
def get_customer(db: Session, customer_id: int):
    return db.query(models.Customer).filter(models.Customer.id == customer_id).first()

def get_customer_by_email(db: Session, email: str):
    return db.query(models.Customer).filter(models.Customer.email == email).first()

def get_customers(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Customer).offset(skip).limit(limit).all()

def create_customer(db: Session, customer: schemas.CustomerCreate):
    # Check if Email is unique
    existing = get_customer_by_email(db, customer.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Customer with email '{customer.email}' already exists."
        )
    
    db_customer = models.Customer(
        name=customer.name,
        email=customer.email,
        phone=customer.phone
    )
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return db_customer

def delete_customer(db: Session, customer_id: int):
    db_customer = get_customer(db, customer_id)
    if not db_customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found."
        )
    db.delete(db_customer)
    db.commit()
    return db_customer


# --- Order CRUD ---
def get_order(db: Session, order_id: int):
    return db.query(models.Order).filter(models.Order.id == order_id).first()

def get_orders(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Order).order_by(models.Order.created_at.desc()).offset(skip).limit(limit).all()

def create_order(db: Session, order_in: schemas.OrderCreate):
    # 1. Validate Customer
    customer = get_customer(db, order_in.customer_id)
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer with ID {order_in.customer_id} does not exist."
        )
        
    # Start the order creation
    db_order = models.Order(
        customer_id=order_in.customer_id,
        total_amount=Decimal("0.00")
    )
    db.add(db_order)
    
    # We flush here to get the db_order.id
    db.flush()
    
    total_accumulated = Decimal("0.00")
    order_items = []
    
    # To handle multiple items requesting the same product in a single order,
    # track inventory locally during this transaction before commit.
    temp_stock_reductions = {}
    
    for item in order_in.items:
        # Validate Product existence
        product = get_product(db, item.product_id)
        if not product:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with ID {item.product_id} does not exist."
            )
            
        # Initialize or add to temp stock tracker
        if product.id not in temp_stock_reductions:
            temp_stock_reductions[product.id] = 0
        temp_stock_reductions[product.id] += item.quantity
        
        # Verify sufficient stock
        available = product.quantity_in_stock - temp_stock_reductions[product.id]
        if available < 0:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock for product '{product.name}'. Requested: {item.quantity}, Available: {product.quantity_in_stock}."
            )
            
        # Create OrderItem entry
        order_item = models.OrderItem(
            order_id=db_order.id,
            product_id=product.id,
            quantity=item.quantity,
            unit_price=product.price
        )
        db.add(order_item)
        order_items.append(order_item)
        
        # Deduct stock
        product.quantity_in_stock -= item.quantity
        
        # Accumulate total
        total_accumulated += product.price * Decimal(item.quantity)
        
    # Update total amount
    db_order.total_amount = total_accumulated
    
    try:
        db.commit()
        db.refresh(db_order)
        return db_order
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while creating order: {str(e)}"
        )

def delete_order(db: Session, order_id: int):
    # Cancel/Delete an order and RESTORE the stock!
    db_order = get_order(db, order_id)
    if not db_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found."
        )
        
    try:
        # Restore stock for each item in the order
        for item in db_order.items:
            product = get_product(db, item.product_id)
            if product:
                product.quantity_in_stock += item.quantity
                
        db.delete(db_order)
        db.commit()
        return db_order
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while cancelling order: {str(e)}"
        )


# --- Dashboard Stats ---
def get_dashboard_stats(db: Session, low_stock_threshold: int = 5):
    total_products = db.query(func.count(models.Product.id)).scalar() or 0
    total_customers = db.query(func.count(models.Customer.id)).scalar() or 0
    total_orders = db.query(func.count(models.Order.id)).scalar() or 0
    
    low_stock = db.query(models.Product).filter(models.Product.quantity_in_stock < low_stock_threshold).all()
    
    return {
        "total_products": total_products,
        "total_customers": total_customers,
        "total_orders": total_orders,
        "low_stock_products": low_stock
    }
