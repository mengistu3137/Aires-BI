import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import multer from "multer";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Upload a file to the server
 * @param {Object} file - Multer file object
 * @param {Object} options - Upload options
 * @param {string} options.folder - Destination folder
 * @param {string} options.filename - Custom filename (optional)
 * @returns {Promise<string|Object>} File URL or upload result object
 */
export const uploadFile = async (file, options = {}) => {
  const {
    folder = "uploads",
    filename = file.originalname,
    returnFullObject = false,
  } = options;

  // Ensure upload directory exists in src/uploads
  const uploadDir = path.join(__dirname, "../uploads", folder);
  await fs.mkdir(uploadDir, { recursive: true });

  // Generate unique filename with timestamp and random string
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(4).toString("hex");
  const fileExtension = path.extname(filename);
  const baseName = path.basename(filename, fileExtension).replace(/[^\w-]/g, "_");
  const uniqueFilename = `${timestamp}-${randomString}-${baseName}${fileExtension}`;
  const filePath = path.join(uploadDir, uniqueFilename);

  // Write file to disk
  await fs.writeFile(filePath, file.buffer);

  // Generate URL
  const url = `/uploads/${folder}/${uniqueFilename}`;

  if (returnFullObject) {
    return {
      url,
      fileId: uniqueFilename,
      path: filePath,
      size: file.size,
      mimetype: file.mimetype,
      originalName: file.originalname,
    };
  }

  return url;
};

/**
 * Delete a file from the server
 */
export const deleteFile = async (filePath) => {
  try {
    const fullPath = path.join(__dirname, "../", filePath);
    await fs.unlink(fullPath);
    return true;
  } catch (error) {
    console.error("Failed to delete file:", error);
    return false;
  }
};

// Multer memory storage
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/gif",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `File type ${file.mimetype} is not supported. Please upload a JPEG, PNG, WEBP, HEIC, or GIF image.`,
      ),
      false,
    );
  }
};

// Configured with up to 10 files and 10MB per file
export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 10,                   // <-- CRITICAL FIX: Raised from 1 to 10!
  },
  fileFilter,
});

export const uploadMiddleware = upload.single("proof");

// Resilient middleware that accepts both "proofs" and "proof" array fields
export const uploadMultipleMiddleware = upload.fields([
  { name: "proofs", maxCount: 10 },
  { name: "proof", maxCount: 10 },
]);