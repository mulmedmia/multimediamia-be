import multer from "multer";

// Configure multer for image upload
const storage = multer.memoryStorage();

const maxFileSize = Number(process.env.MAX_THUMBNAIL_SIZE_BYTES) || 2 * 1024 * 1024; // 2MB limit per SUBMISSION_OPTIMIZATION_SPEC

const allowedMimetypes = ["image/jpeg", "image/png", "image/webp"];

const upload = multer({
  storage,
  limits: { fileSize: maxFileSize },
  fileFilter: (req, file, cb) => {
    if (allowedMimetypes.includes(file.mimetype) || file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Hanya format gambar JPG, PNG, atau WebP yang diperbolehkan"), false);
    }
  },
});

export default upload;
