# MedKnock

MedKnock is a full-stack medication management application designed to help users track, log, and manage their medication schedules. It features dose logging, reminders, reporting, and integration with various APIs for notifications and scheduling.

## Features

- User authentication and authorization
- Medication scheduling and reminders
- Dose logging (taken/missed)
- Streak and risk score tracking
- Reports and analytics
- Google Calendar integration
- Push notifications (Firebase, Twilio)
- Web scraping for medicine data
- Responsive frontend with React and Tailwind CSS
- Whatsapp Notification Integrated

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS
- **Backend:** Node.js, Express, MongoDB, Mongoose
- **Notifications:** Firebase, Twilio
- **Other Integrations:** Google Calendar, Cloudinary

## Project Structure

```
backend/
  config/           # Configuration files (DB, Cloudinary, etc.)
  controller/       # Express controllers (business logic)
  cron/             # Scheduled jobs
  middlewares/      # Express middlewares
  models/           # Mongoose models
  routes/           # Express routes
  scrapers/         # Medicine data scrapers
  server.js         # Entry point for backend
frontend/
  public/           # Static files
  src/              # React source code
    components/     # Reusable UI components
    contexts/       # React context providers
    hooks/          # Custom React hooks
    lib/            # Utility functions
    pages/          # Page components
    App.jsx         # Main app component
    main.jsx        # Entry point for frontend
```

## Getting Started

### Prerequisites
- Node.js (v16+ recommended)
- MongoDB

### Backend Setup
1. Navigate to the `backend` folder:
   ```sh
   cd backend
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Create a `.env` file based on `.env.example` and set your environment variables.
4. Start the backend server:
   ```sh
   npm start
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
3. Start the frontend development server:
   ```sh
   npm run dev
   ```

### Environment Variables
- Configure your MongoDB URI, API keys, and other secrets in the `.env` files for both backend and frontend as needed.

## API Endpoints
- See backend `routes/` and controller files for available endpoints (dose logging, user, schedule, reports, etc).

## Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

