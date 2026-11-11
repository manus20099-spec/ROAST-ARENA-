import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';
import { badRequest } from '../lib/errors.js';

/**
 * Detect the real image type from the file's first bytes ("magic bytes").
 * The filename and the browser-provided mimetype are ignored: both can be faked.
 */
export function detectImageType(buffer) {
  if (!buffer || buffer.length < 12) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: 'jpg', mime: 'image/jpeg' };
  }
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (png.every((byte, i) => buffer[i] === byte)) return { ext: 'png', mime: 'image/png' };

  const riff = buffer.toString('ascii', 0, 4) === 'RIFF';
  const webp = buffer.toString('ascii', 8, 12) === 'WEBP';
  if (riff && webp) return { ext: 'webp', mime: 'image/webp' };

  return null;
}

/**
 * Save an uploaded image under a random name and return its public path.
 * The user's filename never touches the disk path.
 */
export async function saveImage(buffer, folder) {
  const type = detectImageType(buffer);
  if (!type) throw badRequest('Only real JPG, PNG or WebP images are allowed.', 'BAD_IMAGE');

  const dir = path.join(config.uploadsDir, folder);
  await fs.mkdir(dir, { recursive: true });

  const name = `${crypto.randomUUID()}.${type.ext}`;
  await fs.writeFile(path.join(dir, name), buffer, { flag: 'wx' });
  return `/uploads/${folder}/${name}`;
}

/** Delete a file we previously saved. Ignores anything outside the uploads folder. */
export async function removeImage(publicPath) {
  if (!publicPath || !publicPath.startsWith('/uploads/')) return;
  const relative = publicPath.replace(/^\/uploads\//, '');
  const full = path.resolve(config.uploadsDir, relative);
  if (!full.startsWith(path.resolve(config.uploadsDir) + path.sep)) return;
  await fs.rm(full, { force: true });
}
