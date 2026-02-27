# IdentixHR Time Keeper

A full-stack employee time tracking and attendance management system built with **React + Vite** (frontend) and **Express + MySQL** (backend).

## Features

- 🕒 **Check-In / Check-Out** — Real-time punch clock with break tracking
- 📊 **Admin Dashboard** — Live attendance feed, stats, and upcoming anniversaries
- 📅 **Attendance Management** — Daily logs, summaries, reprocessing, and reset tools
- 🏢 **Department Management** — Create and manage departments
- 👥 **Employee Management** — Profiles, shifts, and role assignments
- ⏰ **Shift Configuration** — Configurable working hours and break limits
- 🏖️ **Leave Requests** — Apply for and manage leave approvals
- 💰 **Payroll & Payslips** — Generate payroll and download payslips (PDF export)
- 🎨 **Company Branding** — Customize company logo and appearance

---

## Tech Stack

| Layer    | Technology                                              |
| -------- | ------------------------------------------------------- |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui     |
| Backend  | Node.js, Express 5, MySQL (via mysql2)                  |
| Auth     | JWT (jsonwebtoken), bcrypt                              |
| Other    | Axios, Recharts, jsPDF, date-fns, React Router, Zod    |

---

## Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- **MySQL** ≥ 8.0

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/Harishpsy/identix-time-keeper.git
cd identix-time-keeper
```

### 2. Setup the Backend

```bash
cd backend
npm install
```

Create a `.env` file inside the `backend/` folder:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=your_mysql_password
DB_NAME=identix
JWT_SECRET=your_jwt_secret_key
NODE_ENV=development
```

> [!IMPORTANT]
> Make sure a MySQL database named `identix` exists before starting the backend. Create it with:
> ```sql
> CREATE DATABASE identix;
> ```

Start the backend server:

```bash
node server.js
```

The API will be running at **http://localhost:5000**.

### 3. Setup the Frontend

Open a new terminal, navigate to the project root:

```bash
cd identix-time-keeper
npm install
```

Create a `.env` file in the project root:

```env
VITE_SUPABASE_PROJECT_ID=your_supabase_project_id
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
VITE_SUPABASE_URL=https://your-project.supabase.co
```

Start the development server:

```bash
npm run dev
```

The app will be running at **http://localhost:5173** (default Vite port).

---

## Available Scripts

### Frontend (project root)

| Command           | Description                          |
| ----------------- | ------------------------------------ |
| `npm run dev`     | Start the Vite dev server            |
| `npm run build`   | Build for production                 |
| `npm run preview` | Preview production build locally     |
| `npm run lint`    | Run ESLint                           |
| `npm run test`    | Run tests with Vitest                |
| `npm run test:watch` | Run tests in watch mode           |

### Backend (`/backend`)

| Command           | Description                          |
| ----------------- | ------------------------------------ |
| `node server.js`  | Start the Express server             |
| `npx nodemon server.js` | Start with auto-reload (dev)  |

---

## Project Structure

```
identix-time-keeper/
├── backend/                # Express API server
│   ├── config/             # Database configuration
│   ├── controllers/        # Route handlers / business logic
│   ├── database/           # DB setup & migrations
│   ├── middleware/          # Auth & other middleware
│   ├── routes/             # API route definitions
│   ├── server.js           # Entry point
│   └── .env                # Backend environment variables
│
├── src/                    # React frontend
│   ├── components/         # Reusable UI components
│   │   ├── dashboard/      # Dashboard widgets
│   │   ├── attendance/     # Attendance-related components
│   │   └── ui/             # shadcn/ui primitives
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utilities (API client, helpers)
│   ├── pages/              # Route-level page components
│   ├── App.tsx             # Root app component with routing
│   └── main.tsx            # Entry point
│
├── .env                    # Frontend environment variables
├── index.html              # HTML entry point
├── vite.config.ts          # Vite configuration
├── tailwind.config.ts      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
└── package.json            # Frontend dependencies & scripts
```

---

## API Endpoints

| Prefix              | Description              |
| -------------------- | ------------------------ |
| `/api/auth`          | Authentication (login, register) |
| `/api/attendance`    | Punch records & reports  |
| `/api/leaves`        | Leave requests           |
| `/api/payroll`       | Payroll generation       |
| `/api/profiles`      | Employee profiles & shifts |
| `/api/settings`      | App settings & branding  |
| `/api/dashboard`     | Dashboard statistics     |

---

## License

This project is private and proprietary.
