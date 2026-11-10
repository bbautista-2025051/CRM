import request from 'supertest';
import type { Role, UserStatus } from '@prisma/client';
import { app } from '../app';
import { prisma } from '../config/prisma';
import { hashPassword } from '../utils/password';

export const resetDatabase = async (): Promise<void> => {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE activity_logs, sales, opportunities, custom_opportunity_stages, clients, companies, sessions, users RESTART IDENTITY CASCADE',
  );
  await prisma.$executeRawUnsafe('ALTER SEQUENCE sale_number_seq RESTART WITH 1');
};

interface CreateUserOptions {
  name?: string;
  email: string;
  password?: string;
  role?: Role;
  status?: UserStatus;
}

export const createTestUser = async (options: CreateUserOptions) => {
  const password = options.password ?? 'Password123';
  return prisma.user.create({
    data: {
      name: options.name ?? 'Usuario de Prueba',
      email: options.email.toLowerCase(),
      passwordHash: await hashPassword(password),
      role: options.role ?? 'VENDEDOR',
      status: options.status ?? 'ACTIVE',
    },
  });
};

export const loginAs = async (
  email: string,
  password = 'Password123',
  rememberMe = false,
) => {
  const agent = request.agent(app);
  const response = await agent
    .post('/api/auth/login')
    .send({ email, password, rememberMe });

  return {
    agent,
    response,
    csrfToken: response.body?.data?.csrfToken as string | undefined,
    setCookie: (response.headers['set-cookie'] ?? []) as string[],
  };
};

export const today = (): string => new Date().toISOString().slice(0, 10);

export const futureDate = (days: number): string => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};
