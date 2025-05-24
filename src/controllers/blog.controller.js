import { getAllBlogs, getBlogById, createBlog, updateBlog, deleteBlog } from "../services/blog.service.js";
import { response } from "../utils/response.js";
import { createBlogSchema, updateBlogSchema } from "../models/blog.model.js";
import multer from "multer";
import imagekit from "../lib/imagekit.js";

// Konfigurasi multer untuk penyimpanan sementara
const storage = multer.memoryStorage();
export const upload = multer({ 
  storage, 
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    // Hanya menerima file gambar
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Hanya file gambar yang diperbolehkan'), false);
    }
  }
});

// Mengambil semua blog dengan filter
export const getBlogs = async (req, res) => {
  try {
    const filters = {
      page: req.query.page,
      limit: req.query.limit,
      category: req.query.category,
      search: req.query.search,
      active: req.query.active,
    };
    
    const result = await getAllBlogs(filters);
    
    return response.success(
      res,
      result,
      "Blogs retrieved successfully"
    );
  } catch (error) {
    return response.error(res, "Failed to retrieve blogs", 500, error.message);
  }
};

// Mengambil blog berdasarkan ID
export const getBlog = async (req, res) => {
  try {
    const blog = await getBlogById(req.params.id);
    
    return response.success(
      res,
      blog,
      "Blog retrieved successfully"
    );
  } catch (error) {
    if (error.message === "Blog not found") {
      return response.error(res, error.message, 404);
    }
    return response.error(res, "Failed to retrieve blog", 500, error.message);
  }
};

// Membuat blog baru
export const createNewBlog = async (req, res) => {
  try {
    // Validasi input
    const validation = createBlogSchema.safeParse(req.body);
    if (!validation.success) {
      return response.validation(res, validation.error.format());
    }
    
    const blog = await createBlog(req.body);
    
    return response.success(
      res,
      blog,
      "Blog created successfully",
      201
    );
  } catch (error) {
    return response.error(res, "Failed to create blog", 500, error.message);
  }
};

// Mengupdate blog yang ada
export const updateExistingBlog = async (req, res) => {
  try {
    // Validasi input
    const validation = updateBlogSchema.safeParse(req.body);
    if (!validation.success) {
      return response.validation(res, validation.error.format());
    }
    
    const updatedBlog = await updateBlog(req.params.id, req.body);
    
    return response.success(
      res,
      updatedBlog,
      "Blog updated successfully"
    );
  } catch (error) {
    if (error.message === "Blog not found") {
      return response.error(res, error.message, 404);
    }
    return response.error(res, "Failed to update blog", 500, error.message);
  }
};

// Menghapus blog berdasarkan ID
export const deleteBlogById = async (req, res) => {
  try {
    await deleteBlog(req.params.id);
    
    return response.success(
      res,
      null,
      "Blog deleted successfully"
    );
  } catch (error) {
    if (error.message === "Blog not found") {
      return response.error(res, error.message, 404);
    }
    return response.error(res, "Failed to delete blog", 500, error.message);
  }
};

// Upload thumbnail blog
export const uploadThumbnail = async (req, res) => {
  try {
    if (!req.file) {
      return response.error(res, "Tidak ada file yang diupload", 400);
    }

    // Konversi buffer file ke base64
    const fileBuffer = req.file.buffer;
    const base64Image = fileBuffer.toString("base64");

    // Upload ke ImageKit
    const result = await imagekit.upload({
      file: base64Image,
      fileName: `${Date.now()}_${req.file.originalname}`,
      folder: "/blog-thumbnails",
    });

    return response.success(
      res,
      {
        url: result.url,
        fileId: result.fileId,
        name: result.name
      },
      "Gambar berhasil diupload"
    );
  } catch (error) {
    return response.error(res, "Gagal mengupload gambar", 500, error.message);
  }
};