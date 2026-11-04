import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { env } from '../config/env';
import { BadRequestError } from '../utils/errors';

const projectFilesDir = path.join(env.uploadDir, 'projects');
const PROJECT_FILE_LIMIT_BYTES = 10 * 1024 * 1024;
const WINDOWS_RESERVED = /[<>:"/\\|?*\x00-\x1f]/g;

const extFromName = (name: string): string => {
  const ext = path.extname(name ?? '').toLowerCase();
  return ext && ext.length <= 12 ? ext : '.bin';
};

const sanitizeFileName = (name: string): string =>
  (name.replace(WINDOWS_RESERVED, '_').trim() || 'archivo').slice(0, 180);

const projectStorage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    fs.mkdirSync(projectFilesDir, { recursive: true });
    callback(null, projectFilesDir);
  },
  filename: (_req, file, callback) => {
    const extension = extFromName(file.originalname);
    callback(null, `${crypto.randomUUID()}${extension}`);
  },
});

/** Subida genérica de archivos de proyecto: cualquier tipo, máximo 10 MB. */
export const projectFileUpload = multer({
  storage: projectStorage,
  limits: { fileSize: PROJECT_FILE_LIMIT_BYTES, files: 1 },
  fileFilter: (_req, _file, callback) => callback(null, true),
});

export const projectFileOriginalName = sanitizeFileName;

export const removeProjectFile = (storedName: string): void => {
  if (!storedName || storedName !== path.basename(storedName)) return;
  const absolute = path.resolve(projectFilesDir, storedName);
  if (!absolute.startsWith(path.resolve(projectFilesDir))) return;
  fs.promises.unlink(absolute).catch(() => undefined);
};

const avatarDir = path.join(env.uploadDir, 'avatars');
fs.mkdirSync(avatarDir, { recursive: true });

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, avatarDir),
  filename: (_req, file, callback) => {
    const extension = EXTENSION_BY_MIME[file.mimetype] ?? '.bin';
    callback(null, `${crypto.randomUUID()}${extension}`);
  },
});

export const avatarUpload = multer({
  storage,
  limits: { fileSize: env.maxAvatarBytes, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!EXTENSION_BY_MIME[file.mimetype]) {
      callback(new BadRequestError('Solo se permiten imágenes JPG, PNG o WebP'));
      return;
    }
    callback(null, true);
  },
});

/**
 * Verifica la firma binaria real del archivo (no solo el MIME declarado).
 * Si no coincide, elimina el archivo y rechaza la petición.
 */
export const validateImageSignature = (filePath: string): void => {
  const descriptor = fs.openSync(filePath, 'r');
  const header = Buffer.alloc(12);
  try {
    fs.readSync(descriptor, header, 0, 12, 0);
  } finally {
    fs.closeSync(descriptor);
  }

  const isJpeg = header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  const isPng =
    header[0] === 0x89 &&
    header[1] === 0x50 &&
    header[2] === 0x4e &&
    header[3] === 0x47;
  const isWebp =
    header.subarray(0, 4).toString('ascii') === 'RIFF' &&
    header.subarray(8, 12).toString('ascii') === 'WEBP';

  if (!isJpeg && !isPng && !isWebp) {
    fs.unlinkSync(filePath);
    throw new BadRequestError('El archivo no es una imagen válida');
  }
};

export const removeUploadedFile = (publicUrl: string | null | undefined): void => {
  if (!publicUrl || !publicUrl.startsWith('/uploads/')) return;
  const relative = publicUrl.replace('/uploads/', '');
  const absolute = path.resolve(env.uploadDir, relative);
  // Evita path traversal.
  if (!absolute.startsWith(path.resolve(env.uploadDir))) return;
  fs.promises.unlink(absolute).catch(() => undefined);
};
