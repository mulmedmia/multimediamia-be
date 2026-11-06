import multer from "multer";

// Configure multer for image upload
const storage = multer.memoryStorage();

const configuredMaxFileSize = process.env.MAX_THUMBNAIL_SIZE_BYTES;
const maxFileSize = configuredMaxFileSize === undefined ? 2 * 1024 * 1024 : Number(configuredMaxFileSize);
if (!Number.isSafeInteger(maxFileSize) || maxFileSize <= 0) {
  throw new Error("MAX_THUMBNAIL_SIZE_BYTES must be a positive safe integer");
}

const allowedMimetypes = ["image/jpeg", "image/png", "image/webp"];
export const thumbnailFileFilter = (req, file, cb) => {
  if (allowedMimetypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Hanya format gambar JPG, PNG, atau WebP yang diperbolehkan"), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: maxFileSize },
  fileFilter: thumbnailFileFilter,
});

export default upload;
