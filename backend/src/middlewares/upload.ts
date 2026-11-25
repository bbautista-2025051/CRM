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

// Firmas binarias (magic bytes) por tipo de archivo para detectar archivos corruptos.
// Cada entrada: [extensiones, array de posibles firmas válidas (offset, bytes)]
const FILE_SIGNATURES: Record<
  string,
  Array<{ offset: number; bytes: number[] }>
> = {
  pdf: [{ offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] }], // %PDF
  zip: [{ offset: 0, bytes: [0x50, 0x4b, 0x03, 0x04] }], // PK.. (ZIP, docx, xlsx, pptx, etc.)
  docx: [{ offset: 0, bytes: [0x50, 0x4b, 0x03, 0x04] }],
  xlsx: [{ offset: 0, bytes: [0x50, 0x4b, 0x03, 0x04] }],
  pptx: [{ offset: 0, bytes: [0x50, 0x4b, 0x03, 0x04] }],
  jpg: [{ offset: 0, bytes: [0xff, 0xd8, 0xff] }],
  jpeg: [{ offset: 0, bytes: [0xff, 0xd8, 0xff] }],
  png: [{ offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47] }],
  gif: [{ offset: 0, bytes: [0x47, 0x49, 0x46, 0x38] }],
  webp: [{ offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] }], // RIFF....WEBP
  zip2: [{ offset: 0, bytes: [0x50, 0x4b, 0x05, 0x06] }], // ZIP vacío
};

const extensionFromMime = (mimeType: string): string | null => {
  const map: Record<string, string> = {
    'application/pdf': 'pdf',
    'application/zip': 'zip',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'text/plain': 'txt',
    'text/csv': 'csv',
  };
  return map[mimeType] ?? null;
};

/**
 * Verifica que el contenido binario del archivo coincida con su tipo declarado.
 * Lanza BadRequestError si el archivo parece corrupto o su firma no coincide.
 */
export const validateFileIntegrity = (
  buffer: Buffer,
  mimeType: string,
  originalName: string,
): void => {
  // Archivos de texto y CSV no tienen firma binaria confiable; solo verificamos que no estén vacíos.
  if (mimeType.startsWith('text/') || mimeType === 'application/csv') {
    if (buffer.length === 0) {
      throw new BadRequestError('El archivo está vacío');
    }
    return;
  }

  const ext = extensionFromMime(mimeType);
  const fileExt = originalName
    .toLowerCase()
    .split('.')
    .pop() ?? '';
  const signatureKey = ext ?? fileExt;
  const signatures = FILE_SIGNATURES[signatureKey];

  if (!signatures || signatures.length === 0) {
    // Tipo de archivo no reconocido: no bloqueamos, solo advertimos si está vacío.
    if (buffer.length === 0) {
      throw new BadRequestError('El archivo está vacío');
    }
    return;
  }

  const isValid = signatures.some((sig) => {
    if (buffer.length < sig.offset + sig.bytes.length) return false;
    return sig.bytes.every((b, i) => buffer[sig.offset + i] === b);
  });

  if (!isValid) {
    throw new BadRequestError(
      `El archivo "${originalName}" parece estar corrupto o no coincide con su tipo`,
    );
  }
};

// Los archivos de proyecto se mantienen en memoria y se persisten en la base
// de datos (columna project_files.data). Así sobreviven a reinicios y a
// despliegues con sistema de archivos efímero.
const projectStorage = multer.memoryStorage();

/** Subida genérica de archivos comerciales: cualquier tipo, máximo 10 MB. */
const businessFileUpload = multer({
  storage: projectStorage,
  limits: { fileSize: PROJECT_FILE_LIMIT_BYTES, files: 1 },
  fileFilter: (_req, _file, callback) => callback(null, true),
});
export const projectFileUpload = businessFileUpload;
export const opportunityFileUpload = businessFileUpload;
export const companyFileUpload = businessFileUpload;
export const saleFileUpload = businessFileUpload;

export const uploadedFileStoredName = (originalName: string): string =>
  `${crypto.randomUUID()}${extFromName(originalName)}`;
export const projectFileStoredName = uploadedFileStoredName;
export const uploadedFileOriginalName = sanitizeFileName;
export const projectFileOriginalName = uploadedFileOriginalName;

export const removeProjectFile = (storedName: string): void => {
  if (!storedName || storedName !== path.basename(storedName)) return;
  const absolute = path.resolve(projectFilesDir, storedName);
  if (!absolute.startsWith(path.resolve(projectFilesDir))) return;
  fs.promises.unlink(absolute).catch(() => undefined);
};

/**
 * Lee del disco un archivo subido antes de que su contenido se guardara en la
 * base de datos. Devuelve `null` si el archivo ya no existe.
 */
export const readProjectFile = async (storedName: string): Promise<Buffer | null> => {
  if (!storedName || storedName !== path.basename(storedName)) return null;
  const absolute = path.resolve(projectFilesDir, storedName);
  if (!absolute.startsWith(path.resolve(projectFilesDir))) return null;
  try {
    return await fs.promises.readFile(absolute);
  } catch {
    return null;
  }
};

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

// Los avatares se guardan en memoria y se persisten en la base de datos
// (tabla user_avatars), igual que los archivos de proyecto.
export const avatarUpload = multer({
  storage: multer.memoryStorage(),
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
 * Verifica la firma binaria real de la imagen (no solo el MIME declarado) y
 * devuelve el tipo MIME detectado. Lanza si no es JPG, PNG ni WebP.
 */
export const detectImageMime = (buffer: Buffer): string => {
  const header = buffer.subarray(0, 12);

  const isJpeg = header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  const isPng =
    header[0] === 0x89 &&
    header[1] === 0x50 &&
    header[2] === 0x4e &&
    header[3] === 0x47;
  const isWebp =
    header.subarray(0, 4).toString('ascii') === 'RIFF' &&
    header.subarray(8, 12).toString('ascii') === 'WEBP';

  if (isJpeg) return 'image/jpeg';
  if (isPng) return 'image/png';
  if (isWebp) return 'image/webp';
  throw new BadRequestError('El archivo no es una imagen válida');
};

/** Borra un avatar antiguo que aún viva en disco (instalaciones previas). */
export const removeUploadedFile = (publicUrl: string | null | undefined): void => {
  if (!publicUrl || !publicUrl.startsWith('/uploads/')) return;
  const relative = publicUrl.replace('/uploads/', '');
  const absolute = path.resolve(env.uploadDir, relative);
  // Evita path traversal.
  if (!absolute.startsWith(path.resolve(env.uploadDir))) return;
  fs.promises.unlink(absolute).catch(() => undefined);
};
