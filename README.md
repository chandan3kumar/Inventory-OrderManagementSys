# Stellar Inventory & Order Management System

A production-ready, containerized full-stack Inventory & Order Management System built with a **React frontend**, a **Python FastAPI backend**, and a **PostgreSQL database**. 

The entire system is orchestrable locally using **Docker Compose** and ready for deployment online.

---

## 1. System Architecture

```mermaid
graph TD
    subgraph Frontend [React App Container (Port 80)]
        UI[Vite + React UI]
        CSS[Vanilla Custom CSS]
    end

    subgraph Backend [FastAPI Container (Port 8000)]
        API[FastAPI Router]
        CRUD[Business & Transaction CRUD]
        ORM[SQLAlchemy ORM]
    end

    subgraph Database [PostgreSQL Container (Port 5432)]
        DB[(PostgreSQL 15 Engine)]
        VOL[(Named Volume: postgres_data)]
    end

    UI -->|JSON REST HTTP| API
    API --> CRUD
    CRUD --> ORM
    ORM --> DB
    DB --> VOL
```

---

## 2. Key Features & Business Logic

### Unique Constraints
- **SKU Code**: Enforced unique SKU validation inside `backend/app/crud.py` during product registration and updates. Returns `HTTP 400 Bad Request` if a duplicate exists.
- **Customer Email**: Enforced unique email validation inside `backend/app/crud.py`. Returns `HTTP 400 Bad Request` if a duplicate email is entered.

### Transaction-Safe Order Placement
- When an order request is received, the backend opens a single transaction block.
- It iterates through each line item, checks the current catalog stock, and deducts the inventory.
- If **any** item fails the stock availability check, the entire transaction rolls back (`db.rollback()`), and stock counts remain untouched.
- Unit prices are locked at the time of purchase (`OrderItem.unit_price`), isolating orders from subsequent price changes.
- Total amount is calculated automatically on the server.

### Stock Restoration on Cancel
- Deleting/cancelling an order (`DELETE /orders/{id}`) automatically restores the stock of all line items back to the product database before discarding the order record.

---

## 3. Local Execution Guide

To run this application locally, ensure you have **Docker** and **Docker Compose** installed.

### Step 1: Clone the repository
Clone the repository using Git:
```bash
git clone https://github.com/chandan3kumar/Inventory-OrderManagementSys.git
cd Inventory-OrderManagementSys
```

### Step 2: Build & Start Services
From the root directory, run:
```bash
docker compose up --build
```
This command builds the frontend static package, builds the backend Python app, downloads PostgreSQL, configures the database, and boots all services.

### Step 3: Access the Applications
- **Frontend Panel**: [http://localhost:80](http://localhost:80)
- **Backend API Docs (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 4. Docker Hub Image Publishing (Backend)
To publish the backend image to Docker Hub:
1. Open terminal inside the `/backend` directory.
2. Build the image with your Docker Hub handle tag:
   ```bash
   docker login
   docker build -t <your-dockerhub-username>/inventory-backend:latest .
   ```
3. Push the image to Docker Hub:
   ```bash
   docker push <your-dockerhub-username>/inventory-backend:latest
   ```

---

## 5. Production Deployment Guidelines

The application is structured to allow quick, free deployments using standard cloud hosting providers.

### 5.1 Backend & Database Deployment (Render / Railway / Fly.io)

We recommend using **Render** or **Railway**:

1. **PostgreSQL Database Setup**:
   - Provision a PostgreSQL database on your hosting provider (e.g., Render's free PG database tier).
   - Copy the database connection string (`postgresql://...`).

2. **Backend Web Service Setup**:
   - Link your GitHub repository (`chandan3kumar/Inventory-OrderManagementSys`).
   - Set the build context or **Root Directory** to `backend/`.
   - Set the runtime environment to **Docker** (it will automatically find the backend Dockerfile).
   - Configure the following environment variables:
     - `DATABASE_URL`: Your production PostgreSQL connection string.
   - Deploy the service. Take note of the live URL (e.g., `https://my-inventory-api.onrender.com`).

---

### 5.2 Frontend Deployment (Vite + Vercel / Netlify)

We recommend using **Vercel**:

1. **Vercel / Netlify Configuration**:
   - Create a new project in Vercel and import your GitHub repository (`chandan3kumar/Inventory-OrderManagementSys`).
   - Set the **Root Directory** to `frontend/`.
   - Set the **Framework Preset** to `Vite`.
   - Add the following environment variable:
     - `VITE_API_URL`: Your live backend API URL (e.g., `https://my-inventory-api.onrender.com`).
   - Click **Deploy**. Vercel will compile the React code and host it on a globally fast CDN.
