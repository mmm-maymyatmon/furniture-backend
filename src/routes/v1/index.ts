import express from "express";

import { auth } from "../../middlewares/auth";

import { authorize } from "../../middlewares/authorize";
import { maintenance } from "../../middlewares/maintenance";
import authRoutes from "./auth";
import adminRoutes from "./admin";
import userRoutes from "./api";

const router = express.Router();

// router.use("/", maintenance, authRoutes);
// router.use("/user", maintenance, userRoutes);
// router.use("/admin", maintenance, auth, authorize(true, "ADMIN"), adminRoutes);

router.use("/", authRoutes);
router.use("/user", userRoutes);
router.use("/admin", auth, authorize(true, "ADMIN"), adminRoutes);


export default router;
