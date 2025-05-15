import express from "express";
import { changeLanguage, uploadProfile } from "../../../controllers/api/profileController";
import { auth } from "../../../middlewares/auth";
import upload from "../../../middlewares/uploadFile";

const router = express.Router();

router.post("/change-language", changeLanguage);
router.patch("/profile/upload", auth, upload.single("avatar"), uploadProfile )

export default router;
