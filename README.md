# Dada Mani Enterprise Operations Management System (ERP / OMS)

A production-ready, full-stack Enterprise Resource Planning & Operations Management System designed for heavy logistics, mining operations, civil construction, transport fleets, and government contracting enterprise environments.

---

## 🏛️ Architecture Overview

```
                      +-----------------------------------+
                      |      React 19 + TypeScript        |
                      |   Vite + Tailwind CSS + MUI       |
                      +-----------------+-----------------+
                                        |
                                        v  (REST API / JWT)
                      +-----------------+-----------------+
                      |    Nginx Reverse Proxy / Load Balancer |
                      +-----------------+-----------------+
                                        |
                                        v
                      +-----------------+-----------------+
                      |    Node.js + Express + TypeScript |
                      |    (Modular Layered Architecture) |
                      +----+-----------+-------------+----+
                           |           |             |
           +---------------+           |             +---------------+
           v                           v                             v
  +-----------------+        +------------------+          +------------------+
  |  MongoDB        |        |  PDF & Excel     |          | Nodemailer       |
  |  Mongoose ORM   |        |  Engines         |          | (Email & OTP)    |
  +-----------------+        +------------------+          +------------------+
```

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 19, TypeScript, Vite
- **UI Components & Styling**: Material UI (MUI), Tailwind CSS, Framer Motion
- **State & Data Fetching**: Axios with Automatic JWT Interceptors & Refresh Token Flow
- **Data Visualization**: Recharts (Interactive Area, Bar, Line & Pie Charts)
- **Forms & Validation**: React Hook Form, Zod
- **Tables & Filtering**: Custom Enterprise Data Table with Column Sorting, Status Filtering, and Pagination

### Backend
- **Runtime & Language**: Node.js, Express.js, TypeScript (`NodeNext` Resolution)
- **Database**: MongoDB with Mongoose ORM
- **Authentication**: JWT Access Token (15m), Refresh Token (7d), Bcrypt hashing, Email OTP Verification for Administrators
- **File & Document Processing**: ExcelJS, XLSX, PDFKit, PDFKit-Table, Multer
- **API Documentation**: Swagger UI (`/api-docs`), OpenAPI 3.0
- **Logging & Monitoring**: Winston Daily Rotate File Logger

---

## 🚀 Key Feature Modules

1. **Enterprise Dashboard**: Real-time KPI summary cards, revenue/expense trends, fleet status gauge, contract distribution, and urgent compliance alerts.
2. **Tender Management**: End-to-end tender lifecycle tracking (Preparation, Submitted, Awarded, Lost, Rejected), EMD deposit tracking, technical/financial bid evaluations, and document attachments.
3. **Awarded Contracts**: Contract value tracking, LOA generation, PBG (Performance Bank Guarantee) management, milestone monitoring, and execution timelines.
4. **Fleet & Vehicle Operations**: Vehicle registration, maintenance schedules, insurance/permit compliance expiry tracking, vehicle assignment, and fuel logs.
5. **Work Order Management**: Operations task allocation, site location mapping, budget vs actual cost tracking, resource allocation, and milestone sign-offs.
6. **Bulk Data Import / Export**: Standardized Excel template generation, validation engine, bulk record insertion, error report generation, and CSV/Excel/PDF exports.
7. **Document Management**: Centralized repository for agreements, compliance certificates, blueprints, and tax records with search & tag filtering.
8. **Audit Trail & System Logs**: Immutable system-wide activity logging capturing user actions, IP addresses, resource mutations, and timestamps.
9. **Role-Based Security**: RBAC with Granular Permissions (Admin, Manager, Operator, Viewer) and Admin OTP authentication.

---

## 🏁 Quick Start & Local Setup

### Prerequisites
- Node.js >= 20.x
- npm >= 10.x
- MongoDB Server running locally on `mongodb://localhost:27017` or MongoDB Atlas URI

### 1. Clone & Configure Environment

```bash
# Navigate to project directory
cd dada_mani_models

# Configure Backend Environment
cp backend/.env.example backend/.env
```

Ensure `backend/.env` has valid configuration settings:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/dada_mani_db
JWT_SECRET=super-secret-enterprise-jwt-key
JWT_REFRESH_SECRET=super-secret-enterprise-refresh-key
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=admin@dadamani.com
EMAIL_PASS=smtp_app_password
```

### 2. Install Dependencies & Seed Initial Data

```bash
# Install backend dependencies & build
cd backend
npm install
npm run seed     # Ingests initial admin user, sample tenders, vehicles, work orders & settings
npm run build

# Install frontend dependencies & build
cd ../frontend
npm install
npm run build
```

### 3. Run Development Servers

```bash
# Terminal 1: Backend Dev Server
cd backend
npm run dev

# Terminal 2: Frontend Dev Server
cd frontend
npm run dev
```

The application will be accessible at:
- **Frontend App**: `http://localhost:5173`
- **Backend API**: `http://localhost:5000/api/v1`
- **Swagger Documentation**: `http://localhost:5000/api-docs`

---

## 🔑 Default Administrator Credentials

After running `npm run seed`:

- **Email**: `admin@dadamani.com`
- **Password**: `Admin@123456`
- **Role**: `Admin`

---

## 🐳 Docker Production Deployment

To launch the full production environment with MongoDB, Node.js API, and Nginx reverse proxy:

```bash
docker-compose up -d --build
```

Services exposed:
- **Web Portal**: `http://localhost:80`
- **API Endpoint**: `http://localhost:80/api/v1`
- **Swagger Docs**: `http://localhost:80/api-docs`

---

## 📄 Postman Collection & Swagger API

- **Interactive Swagger Spec**: Available at `/api-docs` on running backend server.
- **Postman Collection**: Located at `./POSTMAN_COLLECTION.json` in root directory. Import into Postman for ready-to-test endpoint suites.

---

## 🧪 Running Unit & Integration Tests

```bash
# Run backend tests with Jest
cd backend
npm test
```

---

## 📜 License & Ownership
Copyright © 2026 Dada Mani Enterprise Infrastructure. All rights reserved. Enterprise Proprietary Software.
