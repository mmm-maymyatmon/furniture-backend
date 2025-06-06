import express, { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import compression from "compression";
import cors from "cors";
import morgan from "morgan";
import limiter from "./middlewares/rateLimiter";
import cookieParser from "cookie-parser";
import i18next from "i18next";
import Backend from "i18next-fs-backend";
import * as middleware from "i18next-http-middleware";
import path from "path";
import routes from "./routes/v1";
import cron from "node-cron";
import { createOrUpdateSettingStatus, getSettingStatus } from "./services/settingService";

export const app = express();

app.set("view engine", "ejs");
app.set("views", "src/views");

var whitelist = ["http://example1.com", "http://localhost:5173"];
var corsOptions = {
  origin: function (
    origin: any,
    callback: (err: Error | null, origin?: any) => void
  ) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true); // allow requests with no origin (like mobile apps or curl requests)
    if (whitelist.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true, // allow credentials (cookies, authorization headers, etc.) to be sent with requests
};
app
  .use(morgan("dev"))
  .use(express.urlencoded({ extended: true }))
  .use(express.json())
  .use(cookieParser())
  .use(cors(corsOptions))
  .use(helmet())
  .use(compression())
  .use(limiter);

i18next
  .use(Backend)
  .use(middleware.LanguageDetector)
  .init({
    backend: {
      loadPath: path.join(
        process.cwd(),
        "src/locales",
        "{{lng}}",
        "{{ns}}.json"
      ),
    },
    detection: {
      order: ["querystring", "cookie", "header"],
      caches: ["cookie"],
    },
    fallbackLng: "en",
    preload: ["en", "mm"],
  });

app.use(middleware.handle(i18next));

app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Resource-Policy", "same-site");
  next();
})

app.use(express.static("public"));
app.use(express.static("uploads"));

app.use("/api/v1", routes);

app.use((error: any, req: Request, res: Response, next: NextFunction) => {
  const status = error.status || 500;
  const message = error.message || "Server Error";
  const errorCode = error.errorCode || "Error_Code";
  res.status(status).json({ message, error: errorCode });
});

cron.schedule("*/5 * * * *", async () => {
  console.log("Running a task every 5 minutes");
  const setting = await getSettingStatus("maintenance");
  if (setting?.value === "true") {
    await createOrUpdateSettingStatus("maintenance", "false");
    console.log("Now maintenance mode is off");
  }
});


