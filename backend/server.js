import express from "express";
import cors from "cors";
import userRouter from "./routes/userRouter.js"
import dotenv from "dotenv";
import scheduleRouter from "./routes/scheduleRouter.js"
import doseLogRouter from "./routes/doseLogRouter.js"
import chatbotRouter from "./routes/chatbotRouter.js"
import notificationRouter from "./routes/notificationRouter.js"
import webScraperRouter from "./routes/webScraperRouter.js"
import statsRouter from "./routes/statsRouter.js"
import { setupCronJobs } from './workers/queue.js';
import passport from "passport";
import passportSetup from "./config/passport.js";
import session from "express-session";
import reportRouter from "./routes/reportRouter.js"
import prescriptionRouter from "./routes/prescriptionRouter.js"

dotenv.config();

const app = express();
const PORT = process.env.PORT;

app.use(express.json());

passportSetup();

app.use(cors({
  origin: [process.env.FRONTEND_URL, process.env.BACKEND_URL],
  credentials: true
}));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());


app.get('/', (req, res) => {
  res.send('Welcome to the Medical\'s Grand MedKnock API! 🧪');
});

app.use('/api/v1/user', userRouter);
app.use('/api/v1/schedules', scheduleRouter);
app.use('/api/v1/doseLogs', doseLogRouter);
app.use('/api/v1/chatbot', chatbotRouter);
app.use('/api/v1/notifications', notificationRouter);
app.use("/api/v1/webScrape", webScraperRouter);
app.use('/api/v1/stats', statsRouter);
app.use("/api/v1/reports", reportRouter);
app.use("/api/v1/prescriptions", prescriptionRouter);

setupCronJobs().catch(console.error);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});


