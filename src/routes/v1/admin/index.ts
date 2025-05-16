import express from "express"
import { getAllUsers } from "../../../controllers/admin/userController";
import { setMaintenance } from "../../../controllers/admin/systemController";
import upload from "../../../middlewares/uploadFile";
import { createPost, deletePost, updatePost } from "../../../controllers/admin/postController";


const router = express.Router();

router.get("/users", getAllUsers)
router.post("/maintenance", setMaintenance)

router.post("/posts", upload.single("image"), createPost)
router.patch("/posts/:id", upload.single("image"), updatePost);
router.delete("/posts", deletePost);




export default router

