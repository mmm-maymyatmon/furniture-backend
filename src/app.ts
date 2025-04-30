import express, { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import compression from "compression";
import cors from "cors";
import morgan from "morgan";
import limiter from "./middlewares/rateLimiter";
import authRoutes from "./routes/v1/auth"
import viewRoutes from "./routes/v1/web/view"

export const app = express();

app.set("view engine", "ejs");
app.set("views", "src/views");

app
  .use(morgan("dev"))
  .use(express.urlencoded({ extended: true }))
  .use(express.json())
  .use(cors())
  .use(helmet())
  .use(compression())
  .use(limiter);
app.use(express.static("public"))

app.use("/api/v1", authRoutes)
app.use(viewRoutes)


app.use((error: any, req: Request, res: Response, next: NextFunction) => {
  const status = error.status || 500;
  const message = error.message || "Server Error";
  const errorCode = error.errorCode || "Error_Code";
  res.status(status).json({ message, error: errorCode });
});
