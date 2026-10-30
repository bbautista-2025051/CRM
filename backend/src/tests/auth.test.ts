import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { prisma } from '../config/prisma';
import { createTestUser, loginAs, resetDatabase } from './helpers';

describe('Autenticación y autorización', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('inicia sesión con credenciales válidas y devuelve el usuario sin hash', async () => {
    const user = await createTestUser({
      email: 'admin@test.local',
      name: 'Admin Test',
      role: 'ADMIN',
    });

    const { response, setCookie, csrfToken } = await loginAs('admin@test.local');

    expect(response.status).toBe(200);
    expect(response.body.data.user.id).toBe(user.id);
    expect(response.body.data.user.email).toBe('admin@test.local');
    expect(response.body.data.user.role).toBe('ADMIN');
    expect(response.body.data.user.passwordHash).toBeUndefined();
    expect(csrfToken).toBeTruthy();
    expect(setCookie.join(';')).toContain('HttpOnly');
    expect(setCookie.join(';')).toContain('SameSite=Lax');
  });

  it('rechaza credenciales incorrectas sin revelar si el usuario existe', async () => {
    await createTestUser({ email: 'vendor@test.local' });

    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: 'vendor@test.local', password: 'Incorrecta123' });

    const unknownUser = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nadie@test.local', password: 'Incorrecta123' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownUser.status).toBe(401);
    expect(wrongPassword.body.error.message).toBe(unknownUser.body.error.message);
  });

  it('aplica una duración distinta según «Recuérdame»', async () => {
    await createTestUser({ email: 'remember@test.local' });

    const short = await loginAs('remember@test.local', 'Password123', false);
    const long = await loginAs('remember@test.local', 'Password123', true);

    expect(short.setCookie.join(';')).not.toMatch(/Max-Age/i);
    expect(long.setCookie.join(';')).toMatch(/Max-Age=2592000/i);
  });

  it('protege las rutas privadas sin sesión', async () => {
    const response = await request(app).get('/api/companies');
    expect(response.status).toBe(401);
  });

  it('impide el acceso de un usuario desactivado y le invalida sus sesiones', async () => {
    const vendor = await createTestUser({
      email: 'vendor@test.local',
      name: 'Vendedor',
    });
    const admin = await createTestUser({
      email: 'admin@test.local',
      role: 'ADMIN',
    });

    const vendorLogin = await loginAs('vendor@test.local');
    expect(vendorLogin.response.status).toBe(200);

    const adminLogin = await loginAs('admin@test.local');

    const deactivate = await adminLogin.agent
      .patch(`/api/users/${vendor.id}`)
      .set('X-CSRF-Token', adminLogin.csrfToken!)
      .send({ status: 'INACTIVE' });

    expect(deactivate.status).toBe(200);
    expect(deactivate.body.data.status).toBe('INACTIVE');

    const meAfter = await vendorLogin.agent.get('/api/auth/me');
    expect(meAfter.status).toBe(401);

    const loginAfter = await request(app)
      .post('/api/auth/login')
      .send({ email: vendor.email, password: 'Password123' });
    expect(loginAfter.status).toBe(403);

    // La desactivación elimina las sesiones del usuario en la base de datos.
    const sessions = await prisma.session.count({ where: { userId: vendor.id } });
    expect(sessions).toBe(0);

    expect(admin.role).toBe('ADMIN');
  });

  it('un vendedor no puede consultar ni administrar usuarios ni escalar su rol', async () => {
    const vendor = await createTestUser({ email: 'vendor@test.local' });
    const { agent, csrfToken } = await loginAs('vendor@test.local');

    const listUsers = await agent.get('/api/users');
    expect(listUsers.status).toBe(403);

    const selfRole = await agent
      .patch(`/api/users/${vendor.id}`)
      .set('X-CSRF-Token', csrfToken!)
      .send({ role: 'ADMIN' });
    expect(selfRole.status).toBe(403);

    const selfThroughSettings = await agent
      .patch('/api/settings/profile')
      .set('X-CSRF-Token', csrfToken!)
      .send({ name: 'Nombre Válido', role: 'ADMIN' });
    expect(selfThroughSettings.status).toBe(200);
    // El campo role se descarta porque el esquema solo acepta name.
    const stored = await prisma.user.findUnique({ where: { id: vendor.id } });
    expect(stored?.role).toBe('VENDEDOR');
  });

  it('exige token CSRF en las mutaciones autenticadas', async () => {
    await createTestUser({ email: 'csrf@test.local' });
    const { agent, csrfToken } = await loginAs('csrf@test.local');

    const withoutToken = await agent
      .patch('/api/settings/profile')
      .send({ name: 'Nombre Nuevo' });
    expect(withoutToken.status).toBe(403);

    const withToken = await agent
      .patch('/api/settings/profile')
      .set('X-CSRF-Token', csrfToken!)
      .send({ name: 'Nombre Nuevo' });
    expect(withToken.status).toBe(200);
    expect(withToken.body.data.user.name).toBe('Nombre Nuevo');
  });

  it('rechaza con 403 las mutaciones enviadas desde un origen no permitido', async () => {
    const blocked = await request(app)
      .post('/api/auth/login')
      .set('Origin', 'https://sitio-malicioso.example')
      .send({ email: 'nadie@test.local', password: 'Irrelevante123' });

    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe('ORIGIN_NOT_ALLOWED');

    const allowed = await request(app)
      .post('/api/auth/login')
      .set('Origin', 'http://localhost:5173')
      .send({ email: 'nadie@test.local', password: 'Irrelevante123' });

    // El origen permitido llega al controlador (credenciales inválidas, no 403).
    expect(allowed.status).toBe(401);
  });

  it('invalida la sesión al cerrar sesión y no permite reutilizarla', async () => {
    await createTestUser({ email: 'logout@test.local' });
    const { agent, csrfToken } = await loginAs('logout@test.local');

    const logout = await agent
      .post('/api/auth/logout')
      .set('X-CSRF-Token', csrfToken!);
    expect(logout.status).toBe(204);

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(401);
  });

  it('rechaza una sesión expirada en el servidor', async () => {
    await createTestUser({ email: 'expired@test.local' });
    const { agent } = await loginAs('expired@test.local');

    await prisma.session.updateMany({
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(401);
  });

  it('protege al último administrador de degradarse o desactivarse a sí mismo', async () => {
    const admin = await createTestUser({
      email: 'admin@test.local',
      role: 'ADMIN',
    });
    const { agent, csrfToken } = await loginAs('admin@test.local');

    const deactivateSelf = await agent
      .patch(`/api/users/${admin.id}`)
      .set('X-CSRF-Token', csrfToken!)
      .send({ status: 'INACTIVE' });
    expect(deactivateSelf.status).toBe(403);

    const demoteSelf = await agent
      .patch(`/api/users/${admin.id}`)
      .set('X-CSRF-Token', csrfToken!)
      .send({ role: 'VENDEDOR' });
    expect(demoteSelf.status).toBe(403);

    const stored = await prisma.user.findUnique({ where: { id: admin.id } });
    expect(stored?.role).toBe('ADMIN');
    expect(stored?.status).toBe('ACTIVE');
  });

  it('permite al administrador crear usuarios y restablecer contraseñas sin exponerlas', async () => {
    await createTestUser({ email: 'admin@test.local', role: 'ADMIN' });
    const { agent, csrfToken } = await loginAs('admin@test.local');

    const create = await agent
      .post('/api/users')
      .set('X-CSRF-Token', csrfToken!)
      .send({
        name: 'Nueva Vendedora',
        email: 'nueva@test.local',
        password: 'Temporal123',
        role: 'VENDEDOR',
        status: 'ACTIVE',
      });

    expect(create.status).toBe(201);
    expect(create.body.data.passwordHash).toBeUndefined();
    expect(create.body.data.mustChangePassword).toBe(true);

    const newUser = await prisma.user.findUnique({
      where: { email: 'nueva@test.local' },
    });
    expect(newUser?.passwordHash).toBeTruthy();
    expect(newUser?.passwordHash).not.toContain('Temporal123');

    const reset = await agent
      .post(`/api/users/${newUser!.id}/reset-password`)
      .set('X-CSRF-Token', csrfToken!)
      .send({ newPassword: 'OtraClave456' });
    expect(reset.status).toBe(204);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nueva@test.local', password: 'OtraClave456' });
    expect(login.status).toBe(200);
  });
});
