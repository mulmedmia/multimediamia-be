import { Router } from "express";
import { 
  getBlogs, 
  getBlog, 
  createNewBlog, 
  updateExistingBlog, 
  deleteBlogById,
  uploadThumbnail,
  upload
} from "../controllers/blog.controller.js";

const router = Router();

// Blog routes - no middleware authentication
router.get("/", getBlogs);
router.get("/:id", getBlog);
router.post("/", createNewBlog);
router.put("/:id", updateExistingBlog);
router.delete("/:id", deleteBlogById);

// Route untuk upload thumbnail
router.post("/upload-thumbnail", upload.single('image'), uploadThumbnail);

export default router;