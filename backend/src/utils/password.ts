import { Algorithm, hash, verify } from '@node-rs/argon2';

// Parámetros recomendados por OWASP para Argon2id (19 MiB, 2 iteraciones, 1 hilo).
const ARGON2_OPTIONS = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

export const hashPassword = (password: string): Promise<string> =>
  hash(password, ARGON2_OPTIONS);

export const verifyPassword = async (
  passwordHash: string,
  password: string,
): Promise<boolean> => {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
};
