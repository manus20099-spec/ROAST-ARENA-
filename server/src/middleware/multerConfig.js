/**
 * Multer configuration for in-memory image uploads.
 *
 * Files are kept in RAM (memoryStorage) and passed to the route handler as
 * `req.file.buffer`. The route then calls `saveImage()` from services/uploads.js
 * which validates the magic bytes and writes the file to disk.
 *
 * Hard limits enforced here (before the route handler runs):
 *   - Maximum file size : 2 MB  (matches UPLOAD.maxBytes in constants.js)
 *   - Accepted mime types: image/jpeg, image/png, image/webp
 *
 * Note: The browser-supplied mimetype check here is a first line of defence.
 * services/uploads.js re-validates using the actual file magic bytes, so a
 * renamed file cannot sneak through.
 */

import multer from 'multer';
import { UPLOAD } from '../lib/constants.js';

/** Store files in memory so we can inspect the buffer in the route handler. */
const storage = multer.memoryStorage();

/**
 * File filter: reject files whose declared mimetype is not in the allow-list.
 * The real type is confirmed a second time in saveImage() via magic bytes.
 *
 * @type {multer.Options['fileFilter']}
 */
function imageFileFilter(_req, file, cb) {
  if (UPLOAD.mimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, PNG, and WebP images are accepted.'), false);
  }
}

/** Shared multer instance with global limits. */
const upload = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: UPLOAD.maxBytes, // 2 MB
  },
});

/**
 * Returns a middleware that accepts a single image file from the named field.
 *
 * Usage:
 *   router.post('/me/avatar', uploadSingle('avatar'), handler)
 *
 * @param {string} fieldName  The multipart field name to read.
 * @returns {import('express').RequestHandler}
 */
export function uploadSingle(fieldName) {
  return upload.single(fieldName);
}
