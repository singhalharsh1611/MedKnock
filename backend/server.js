import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import userRouter from "./routes/userRouter.js"
import dotenv from "dotenv";


dotenv.config();
const app = express();

const PORT = process.env.PORT;

app.use(cors({
  origin: [process.env.FRONTEND_URL, process.env.BACKEND_URL],
  credentials: true
}));

app.use(express.json());

connectDB();




app.get('/', (req, res) => {
  res.send('Welcome to the Alchemist\'s Grand Grimoire API! 🧪');
});

app.use('/api/v1/user', userRouter);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});