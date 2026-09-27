# MedKnock

MedKnock is a full-stack medication management application designed to help users track, log, and manage their medication schedules. It features dose logging, reminders, reporting, and integration with various APIs for notifications and scheduling.

## 🚀 Features & Major Optimizations

- **Intelligent Medication Scheduling & Google Calendar Sync:** Set up complex medication schedules with automated synchronization to Google Calendar, ensuring users never miss a dose by integrating directly into their daily schedules.
- **Real-Time Price Comparison via Web Scraping:** Integrated an automated web scraping engine to fetch and compare up-to-date medicine prices across various top pharmacy platforms, empowering users to find the best deals instantly.
- **AI-Powered Prescription & Report Analysis:**
  - **AI Prescription Reader:** Users can upload scanned medical prescriptions, and the system automatically extracts medication details (name, dosage, frequency) using local LLMs (Ollama with Gemma 4 31B).
  - **AI Report Analyzer:** Generates personalized health insights and actionable feedback based on the user's medication adherence and uploaded health reports.
- **Multi-Channel Automated Notifications:** Built a robust background worker architecture using Redis and BullMQ to handle time-delayed, asynchronous notifications across multiple channels, including Firebase (Web Push) and Twilio (WhatsApp alerts).
- **Advanced Adherence Tracking & Health Insights:**
  - **Dose Logging:** Meticulously track taken, missed, or skipped doses with timestamped logs.
  - **Health Risk Assessment:** Dynamic tracking that calculates health risk scores to motivate users and maintain consistency.
- **Secure Authentication System:** Comprehensive security featuring JWT-based authorization, seamless Google OAuth 2.0 integration, and Email OTP verification for account recovery.
- **Performant & Responsive UI:** A modern, accessible single-page application built with React, Vite, and Tailwind CSS, featuring interactive charts and dynamic data visualization.

## Screenshots

<div align="center">
  <img src="assets/landing.png" alt="MedKnock Landing Page" width="45%" />
  <img src="assets/login.png" alt="MedKnock Login" width="45%" />
  <img src="assets/dashboard.png" alt="MedKnock Dashboard" width="45%" />
  <img src="assets/medications.png" alt="MedKnock Medications" width="45%" />
  <img src="assets/profile.png" alt="MedKnock Profile" width="45%" />
  <img src="assets/compare.png" alt="MedKnock Compare" width="45%" />
  <img src="assets/stats.png" alt="MedKnock Stats" width="45%" />
  <img src="assets/reports.png" alt="MedKnock Reports" width="45%" />
  <img src="assets/add_by_image.png" alt="MedKnock Add by Image" width="45%" />
  <img src="assets/logs.png" alt="MedKnock Logs" width="45%" />
</div>

## Architecture

MedKnock uses a modern decoupled microservice-like architecture to ensure scalability, reliability, and responsiveness.

1. **Frontend (Vite + React):** 
   A fast, responsive single-page application (SPA) that interacts with the backend via RESTful APIs.
2. **Backend API (Node.js + Express):** 
   Handles incoming HTTP requests, business logic, and authentication. It directly interfaces with the primary database for fast synchronous operations.
3. **Database (PostgreSQL via Prisma ORM):** 
   The primary relational database storing users, schedules, doses, and reports.
4. **Queue & Cache (Redis):** 
   Used by BullMQ to securely queue background jobs, manage delays (like sending a reminder at a specific time), and cache temporary data.
5. **Background Worker (Node.js + BullMQ):** 
   A dedicated Node.js process that constantly polls Redis for background jobs. It executes time-consuming or scheduled tasks (like sending out WhatsApp notifications, processing AI reports, and triggering emails) behind the scenes, ensuring the main API never hangs or blocks user requests.

### High-Level Flow
```mermaid
flowchart TD
    Client["Frontend (React/Vite)"] -->|"HTTP Requests & SSE"| API["Backend API (Express)"]
    API <-->|"Prisma"| DB[("PostgreSQL")]
    API -->|"Enqueue Jobs"| Redis[("Redis")]
    Redis <-->|"Dequeue Jobs"| Worker["Background Worker (BullMQ)"]
    Worker -->|"Send Notifications"| Twilio["Twilio / Firebase"]
    Worker -->|"AI Nudges"| Ollama["Ollama API (Gemma 4 31B)"]
    API -->|"Chatbot & Prescriptions"| Ollama
    API -->|"Uploads"| Cloudinary["Cloudinary"]
```

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS
- **Backend:** Node.js, Express, Prisma ORM
- **Databases:** PostgreSQL (Primary), Redis (Queue/Cache)
- **Background Jobs:** BullMQ
- **AI & ML:** Ollama (Gemma 4 31B model)
- **Authentication (OTP):** Nodemailer (Gmail SMTP)
- **Notifications:** Firebase (Push), Twilio (WhatsApp)
- **File Storage:** Cloudinary

## Project Structure

```text
MedKnock/
├── frontend/             # React source code
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Page components
│   │   └── hooks/        # Custom React hooks
│   └── .env              # Frontend environment variables
│
├── backend/              # Node.js API & Worker
│   ├── server.js         # Entry point for Backend API
│   ├── worker.js         # Entry point for Background Worker
│   ├── prisma/           # PostgreSQL schema and migrations
│   ├── controller/       # Express route controllers
│   ├── services/         # Core business logic (UserService, ScheduleService, etc.)
│   ├── routes/           # API route definitions
│   ├── middlewares/      # Express middlewares (Authentication, Uploads)
│   ├── config/           # App and external service configs (Prisma, Firebase, Passport)
│   ├── workers/          # BullMQ job processors & queues
│   ├── utils/            # Third-party integration clients (Ollama, Twilio, Nodemailer)
│   └── .env              # Backend environment variables
│
└── docker-compose.yml    # Local Docker setup for PostgreSQL & Redis
```

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- Docker & Docker Compose (for running local databases)

### Backend Setup
1. Start the required databases (PostgreSQL & Redis) locally:
   ```sh
   docker-compose up -d
   ```
2. Navigate to the `backend` folder:
   ```sh
   cd backend
   ```
3. Install dependencies:
   ```sh
   npm install
   ```
4. Set up the database:
   Create a `.env` file based on `.env.example` (which includes local `DATABASE_URL` and `REDIS_URL` defaults) and push the schema:
   ```sh
   npx prisma generate
   npx prisma db push
   ```
5. Start the API server:
   ```sh
   npm run dev
   ```
6. Start the Background Worker (in a separate terminal):
   ```sh
   npm run worker
   ```

### Frontend Setup
1. Navigate to the `frontend` folder:
   ```sh
   cd ../frontend
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Configure the `.env` file with `VITE_BACKEND_URL=http://localhost:5000` (or your chosen API port).
4. Start the development server:
   ```sh
   npm run dev
   ```

## Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.
