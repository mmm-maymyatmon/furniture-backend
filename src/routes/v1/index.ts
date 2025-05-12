import express from "express";

import { auth } from "../../middlewares/auth";

import { authorize } from "../../middlewares/authorize";
import authRoutes from "./auth";
import adminRoutes from "./admin";
import userRoutes from "./api";

const router = express.Router();

router.use("/", authRoutes);
router.use("/api/v1/user", userRoutes);
router.use("/api/v1/admins", auth, authorize(true, "ADMIN"), adminRoutes);


export default router;
