import express from "express";
import dotenv from "dotenv"
import proxy from "express-http-proxy";
import cors from "cors"
import cookieParser from "cookie-parser";
import protect from "./middleware/auth.middleware.js";
import { getCurrentUser } from "./controllers/user.controller.js";
import { proxyWithHeader } from "./utils/proxyWithHeader.js";
dotenv.config();
import morgan from "morgan";

const port = process.env.PORT

const app = express()
app.use(cors({
    origin:"http://localhost:5174",
    credentials:true
}))

app.use(cookieParser())
app.use(morgan("dev"))
app.use("/auth", proxy(process.env.AUTH_SERVICE))
app.use("/chat", protect, proxyWithHeader(process.env.CHAT_SERVICE))
app.use("/agent",protect, proxyWithHeader(process.env.AGENT_SERVICE))
app.use("/billing",protect, proxyWithHeader(process.env.BILLING_SERVICE))
app.get("/me", protect, getCurrentUser)
app.get("/", (req, res) => {
    res.json({message: "Gateway service is running"})
})



app.listen(port, () => {
    console.log(`Gateway services started at port: ${port}`);
    
})