import express, { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import compression from "compression";
import cors from "cors";
import morgan from "morgan";
import limiter from "./middlewares/rateLimiter";
import { auth } from "./middlewares/auth";
import authRoutes from "./routes/v1/auth"
import userRoutes from "./routes/v1/admin/user"
import cookieParser from "cookie-parser";

export const app = express();

app.set("view engine", "ejs");
app.set("views", "src/views");

var whitelist = ['http://example1.com', 'http://localhost:5173']
var corsOptions = {
  origin: function (origin: any, callback: (err: Error | null, origin?: any) => void ) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true); // allow requests with no origin (like mobile apps or curl requests)
    if (whitelist.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true, // allow credentials (cookies, authorization headers, etc.) to be sent with requests
}
app
  .use(morgan("dev"))
  .use(express.urlencoded({ extended: true }))
  .use(express.json())
  .use(cookieParser())
  .use(cors())
  .use(helmet())
  .use(compression())
  .use(limiter);
app.use(express.static("public"))

app.use("/api/v1", authRoutes)
app.use("/api/v1/admin", auth, userRoutes)

// app.use(viewRoutes)


app.use((error: any, req: Request, res: Response, next: NextFunction) => {
  const status = error.status || 500;
  const message = error.message || "Server Error";
  const errorCode = error.errorCode || "Error_Code";
  res.status(status).json({ message, error: errorCode });
});
