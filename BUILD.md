# Build & Deployment Guide

This guide explains how to generate a production build for the **Identix Time Keeper** application.

## Prerequisites

- **Node.js**: ≥ 18
- **npm**: ≥ 9
- **MySQL**: ≥ 8.0

---

## 1. Database Setup

Ensure your MySQL server is running and create the `identix` database:

```sql
CREATE DATABASE identix;
```

If you have any migration scripts in `backend/`, run them sequentially to set up the schema.

---

## 2. Environment Configuration

### Backend (`backend/.env`)
Create a `.env` file in the `backend/` directory:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=your_mysql_password
DB_NAME=identix
JWT_SECRET=your_jwt_secret_key
NODE_ENV=production
```

### Frontend (`.env`)
Create a `.env` file in the root directory:

```env
VITE_SUPABASE_PROJECT_ID=your_supabase_project_id
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
VITE_SUPABASE_URL=https://your-project.supabase.co
```

---

## 3. Generate Frontend Build

Navigate to the project root and run:

```bash
# Install dependencies
npm install

# Build the project
npm run build
```

The optimized production files will be generated in the `dist/` folder.

---

## 4. Production Deployment

### Serving the Frontend
You can serve the `dist/` folder using a static file server like `serve` or `nginx`:

```bash
npx serve -s dist
```

### Running the Backend
Navigate to the `backend/` directory and start the server:

```bash
cd backend
npm install --omit=dev
node server.js
```

> [!TIP]
> Use a process manager like **PM2** to keep the backend running in production:
> ```bash
> npm install -g pm2
> pm2 start server.js --name "identix-backend"
> ```

---

## 5. Verification

1. Access the frontend (e.g., `http://localhost:3000`).
2. Verify the API connection by attempting to log in.
3. Check the browser console and backend logs for any path or environment issues.
