# Techloom.ai Software Engineer Intern Practical Assessment

This repository contains my submission for the **Techloom.ai Software Engineer Intern Practical Assessment**.

## Links

**GitHub Repository:**  
https://github.com/Runeth04/techloom-intern-assessment

### Task 01 — POS Order & Inventory System

**Live Frontend:**  
https://techloom-pos-frontend.onrender.com

**Backend API:**  
https://techloom-intern-assessment.onrender.com

**API Documentation:**  
https://techloom-intern-assessment.onrender.com/docs

### Task 02 — E-Commerce Checkout & Payment System

**Live Frontend:**  
https://techloom-intern-assessment-1-fj4n.onrender.com

**Backend API:**  
https://techloom-intern-assessment-1-4z97.onrender.com

**API Documentation:**  
https://techloom-intern-assessment-1-4z97.onrender.com/docs

---

# Repository Structure

```text
techloom-intern-assessment/
│
├── task-01/
│   ├── backend/
│   └── frontend/
│
├── task-02/
│   ├── backend/
│   └── frontend/
│
└── README.md
```

---

# Tech Stack

## Frontend

- React
- Vite
- React Router
- Axios
- CSS

## Backend

- Python
- FastAPI
- SQLAlchemy
- Psycopg

## Database

- PostgreSQL

## Deployment

- Render Web Services
- Render Static Sites
- Render PostgreSQL

---

# Task 01 — POS Order & Inventory System

Task 01 implements a concurrency-safe Point of Sale and inventory management system.

## Features

- Product create, read, update and delete operations
- Current inventory/stock tracking
- POS cart and order creation
- Stock validation before checkout
- Concurrency-safe stock reservation
- Prevention of overselling using database row locking
- 5-minute stock reservation
- Automatic reservation expiry
- Automatic stock restoration after expiry
- Mock payment gateway
  - SUCCESS
  - FAILED
  - TIMEOUT
- Duplicate order protection using idempotency keys
- Duplicate payment protection using idempotency keys
- Order cancellation
- Stock restoration for failed, expired and cancelled orders
- Order lifecycle statuses
  - PENDING
  - RESERVED
  - PAID
  - FAILED
  - EXPIRED
  - CANCELLED
- Dashboard for inventory and order information
- Order management interface

## Concurrency Strategy

Stock is protected using PostgreSQL row-level locking through SQLAlchemy's `SELECT ... FOR UPDATE`.

When checkout begins:

1. Required product rows are locked.
2. Current stock is validated.
3. Stock is reserved inside the same database transaction.
4. Other simultaneous transactions must wait for the lock.
5. Once the first transaction finishes, the next request re-checks the updated stock.

This prevents two simultaneous customers from purchasing the same last available item.

A concurrency test was performed using two simultaneous checkout requests against a product with a stock quantity of `1`.

Expected and verified result:

```text
Request 1: 200 / successful reservation
Request 2: 409 / insufficient stock
Final stock: 0
```

No negative inventory or overselling occurs.

## Reservation Expiry

When stock is reserved, the order receives a reservation expiration time approximately five minutes in the future.

A background process checks reserved orders periodically.

If a reservation expires:

- Reserved stock is restored
- The order becomes `EXPIRED`

## Mock Payment Handling

### SUCCESS

- Order becomes `PAID`
- Reserved stock remains deducted

### FAILED

- Order becomes `FAILED`
- Reserved stock is restored

### TIMEOUT

- Order becomes `EXPIRED`
- Reserved stock is restored

Idempotency keys prevent duplicate orders and duplicate payment processing.

---

# Task 02 — E-Commerce Checkout & Payment System

Task 02 implements a customer-facing e-commerce storefront with the complete shopping and payment flow.

## Features

### Product Discovery

- Product listing
- Product search
- Category filtering
- Minimum and maximum price filtering
- Availability filtering
- Product details page

### Cart

- Add products to cart
- Update quantities
- Remove products
- Cart total calculation
- Local storage persistence

### Checkout

- Customer name and email
- Real stock reservation
- Five-minute reservation period
- Duplicate checkout protection
- Concurrency-safe inventory handling

### Mock Payments

Supported outcomes:

- SUCCESS
- FAILED
- TIMEOUT

Duplicate payment submissions are protected using payment idempotency keys.

### Order History

Customers can search their order history using their checkout email.

Each order displays:

- Current order status
- Purchased products
- Quantities
- Prices
- Total amount
- Status history/timeline
- Refund information where applicable

### Cancellation & Refunds

Reserved orders can be cancelled before payment.

Result:

```text
RESERVED → CANCELLED
```

Reserved stock is returned to inventory.

Paid orders can also be cancelled.

Result:

```text
PAID → CANCELLED → REFUNDED
```

The system:

- Restores product stock
- Creates a simulated refund record
- Records the refund in order status history

### Task 02 Concurrency Test

A temporary product with stock quantity `1` was used.

Two checkout requests were executed simultaneously.

Verified result:

```text
One request: 201 Created
One request: 409 Conflict
Final stock: 0
```

This confirms that simultaneous checkout attempts cannot oversell inventory.

---

# Local Setup

## Requirements

Install:

- Python 3
- Node.js
- npm
- PostgreSQL
- Git

Clone the repository:

```bash
git clone https://github.com/Runeth04/techloom-intern-assessment.git
cd techloom-intern-assessment
```

---

# Task 01 Local Setup

## Backend

```bash
cd task-01/backend
```

Create a Python virtual environment:

### Windows

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create a `.env` file using `.env.example` as a reference.

Example:

```env
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database_name

ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Run the backend:

```bash
python -m uvicorn app.main:app --reload
```

Backend:

```text
http://127.0.0.1:8000
```

Swagger:

```text
http://127.0.0.1:8000/docs
```

## Frontend

Open another terminal:

```bash
cd task-01/frontend
npm install
npm run dev
```

Frontend:

```text
http://localhost:5173
```

Optional frontend environment variable:

```env
VITE_API_URL=http://127.0.0.1:8000
```

---

# Task 02 Local Setup

## PostgreSQL

Create a separate PostgreSQL database:

```sql
CREATE DATABASE techloom_ecommerce;
```

## Backend

```bash
cd task-02/backend
```

Create and activate a virtual environment:

### Windows

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create:

```text
task-02/backend/.env
```

Example:

```env
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=techloom_ecommerce

ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Run:

```bash
python -m uvicorn app.main:app --reload
```

Backend:

```text
http://127.0.0.1:8000
```

Swagger:

```text
http://127.0.0.1:8000/docs
```

## Frontend

Open another terminal:

```bash
cd task-02/frontend
npm install
npm run dev
```

Frontend:

```text
http://localhost:5173
```

Optional `.env`:

```env
VITE_API_URL=http://127.0.0.1:8000
```

---

# Environment Variables

## Backend

| Variable | Description |
|---|---|
| `DB_USER` | PostgreSQL username |
| `DB_PASSWORD` | PostgreSQL password |
| `DB_HOST` | PostgreSQL host |
| `DB_PORT` | PostgreSQL port |
| `DB_NAME` | PostgreSQL database |
| `ALLOWED_ORIGINS` | Frontend URLs permitted by CORS |
| `PYTHON_VERSION` | Python version used by Render |

## Frontend

| Variable | Description |
|---|---|
| `VITE_API_URL` | URL of the deployed FastAPI backend |

No credentials or passwords are committed to the repository.

---

# How to Test Task 01

1. Create a product.
2. Update the product and verify stock changes.
3. Add products to the POS cart.
4. Create an order.
5. Reserve the order.
6. Verify inventory decreases.
7. Test SUCCESS payment.
8. Verify the order becomes `PAID`.
9. Test FAILED payment on another order.
10. Verify stock is restored.
11. Test TIMEOUT or wait for reservation expiry.
12. Verify the order becomes `EXPIRED` and stock returns.
13. Cancel a reserved order.
14. Verify stock restoration.
15. Submit the same order idempotency key twice and verify the second request receives `409 Conflict`.
16. Submit the same payment idempotency key twice and verify the second request receives `409 Conflict`.

---

# How to Test Task 02

## Product Discovery

Test:

- Search by product name
- Filter by category
- Filter by price range
- Filter by availability
- Open an individual product page

## Shopping Flow

1. Add a product to cart.
2. Change the quantity.
3. Proceed to checkout.
4. Enter customer name and email.
5. Click `Reserve & Continue`.
6. Verify the order becomes `RESERVED`.
7. Verify stock decreases.

## Payment Success

Click:

```text
Simulate Success
```

Expected:

```text
Order = PAID
Stock remains deducted
```

## Payment Failure

Create another checkout and click:

```text
Simulate Failure
```

Expected:

```text
Order = FAILED
Stock restored
```

## Payment Timeout

Create another checkout and click:

```text
Simulate Timeout
```

Expected:

```text
Order = EXPIRED
Stock restored
```

## Order History

Open the Orders page and enter the email used during checkout.

Verify:

- Current order status
- Items
- Total
- Complete status history
- Refund details when applicable

## Cancellation / Refund

For a `RESERVED` order:

```text
Cancel Order
```

Expected:

```text
RESERVED → CANCELLED
Stock restored
```

For a `PAID` order:

```text
Cancel & Refund
```

Expected:

```text
PAID → CANCELLED → REFUNDED
Stock restored
Mock refund recorded
```

---

# Design Decisions

### PostgreSQL Transactions and Row Locks

Inventory operations use database transactions and row-level locks to protect stock during simultaneous checkout requests.

### Idempotency

Unique idempotency keys protect order creation and payment processing from duplicate requests.

### Product Price Snapshot

Order items store the product price at the time of checkout so historical orders remain accurate even if product prices later change.

### Soft Product Deletion

Task 02 products are deactivated instead of permanently removed so historical order records remain valid.

### Reservation Worker

A lightweight background task periodically checks expired reservations and restores inventory.

For this assessment the services run as single Render backend instances. In a larger production system, reservation expiration would typically be moved to a dedicated background worker or queue.

### Mock Payment Gateway

The assessment does not use a real payment provider. Payment outcomes are intentionally simulated to demonstrate handling of successful payments, failures, timeouts, duplicate requests, cancellation and refunds.

---

# Deployment

Both projects are deployed on Render.

Each task uses:

```text
React Static Site
        ↓
FastAPI Web Service
        ↓
PostgreSQL Database
```

Production frontend API URLs are configured using `VITE_API_URL`.

Backend CORS origins are controlled using `ALLOWED_ORIGINS`.

---

# Author

**Runeth**

Software Engineer Intern Practical Assessment  
Techloom.ai