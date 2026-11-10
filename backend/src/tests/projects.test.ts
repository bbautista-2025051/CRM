import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { prisma } from '../config/prisma';
import {
  createTestUser,
  futureDate,
  loginAs,
  resetDatabase,
} from './helpers';

interface Session {
  agent: ReturnType<typeof request.agent>;
  csrfToken: string;
}

const setup = async (role: 'ADMIN' | 'VENDEDOR', email: string): Promise<Session> => {
  await createTestUser({ email, name: role === 'ADMIN' ? 'Admin' : 'Vendedor', role });
  const login = await loginAs(email);
  return { agent: login.agent, csrfToken: login.csrfToken! };
};

describe('Proyectos y equipo', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('gestiona proyectos, tareas y calcula el avance del equipo', async () => {
    const admin = await setup('ADMIN', 'admin@test.local');
    const vendor = await setup('VENDEDOR', 'vendor@test.local');
    const vendorUser = await prisma.user.findUnique({ where: { email: 'vendor@test.local' } });

    const project = await admin.agent
      .post('/api/projects')
      .set('X-CSRF-Token', admin.csrfToken)
      .send({
        name: 'Implementación CRM',
        description: 'Puesta en marcha',
        managerId: vendorUser?.id,
        amount: 1200,
        currency: 'USD',
        dueDate: futureDate(20),
      });
    expect(project.status).toBe(201);
    expect(project.body.data.status).toBe('ACTIVE');
    expect(project.body.data.amount).toBe('1200');
    expect(project.body.data.currency).toBe('USD');
    expect(project.body.data.taskCounts.progress).toBe(0);

    const projectId = project.body.data.id as string;

    const task = await admin.agent
      .post(`/api/projects/${projectId}/tasks`)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({
        title: 'Configurar flujo de ventas',
        assigneeId: vendorUser?.id,
        dueDate: futureDate(10),
      });
    expect(task.status).toBe(201);
    expect(task.body.data.status).toBe('PENDING');

    const forbidden = await vendor.agent
      .post('/api/projects')
      .set('X-CSRF-Token', vendor.csrfToken)
      .send({ name: 'Proyecto no autorizado' });
    expect(forbidden.status).toBe(403);

    const visible = await vendor.agent.get('/api/projects');
    expect(visible.status).toBe(200);
    expect(visible.body.meta.total).toBe(1);
    expect(visible.body.counts.ACTIVE).toBe(1);

    const completed = await admin.agent
      .patch(`/api/projects/${projectId}/tasks/${task.body.data.id}`)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ status: 'COMPLETED' });
    expect(completed.status).toBe(200);
    expect(completed.body.data.status).toBe('COMPLETED');

    const detail = await admin.agent.get(`/api/projects/${projectId}`);
    expect(detail.body.data.taskCounts.completed).toBe(1);
    expect(detail.body.data.taskCounts.progress).toBe(100);

    const team = await admin.agent.get('/api/team/overview');
    expect(team.status).toBe(200);
    expect(team.body.data.summary.members).toBe(1);
    expect(team.body.data.summary.completedTasks).toBe(1);
    expect(team.body.data.projects[0].members[0].progress).toBe(100);

    const teamForbidden = await vendor.agent.get('/api/team/overview');
    expect(teamForbidden.status).toBe(403);
  });

  it('permite al vendedor editar solo los datos comerciales de sus proyectos', async () => {
    const admin = await setup('ADMIN', 'admin@test.local');
    const vendor = await setup('VENDEDOR', 'vendor@test.local');
    const otherVendor = await setup('VENDEDOR', 'other-vendor@test.local');
    const vendorUser = await prisma.user.findUnique({ where: { email: 'vendor@test.local' } });

    const project = await admin.agent
      .post('/api/projects')
      .set('X-CSRF-Token', admin.csrfToken)
      .send({
        name: 'Proyecto del vendedor',
        managerId: vendorUser?.id,
      });
    expect(project.status).toBe(201);
    const projectId = project.body.data.id as string;

    const updated = await vendor.agent
      .patch(`/api/projects/${projectId}`)
      .set('X-CSRF-Token', vendor.csrfToken)
      .send({
        preSales: 'Ana Preventa',
        solution: 'Implementación y capacitación',
        status: 'COMPLETED',
        phone: '+502 5555 1212',
      });
    expect(updated.status).toBe(200);
    expect(updated.body.data.preSales).toBe('Ana Preventa');
    expect(updated.body.data.solution).toBe('Implementación y capacitación');
    expect(updated.body.data.status).toBe('COMPLETED');
    expect(updated.body.data.phone).toBe('+502 5555 1212');

    const forbiddenField = await vendor.agent
      .patch(`/api/projects/${projectId}`)
      .set('X-CSRF-Token', vendor.csrfToken)
      .send({ name: 'Nombre cambiado por vendedor' });
    expect(forbiddenField.status).toBe(403);

    const otherProject = await admin.agent
      .post('/api/projects')
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ name: 'Proyecto de otro vendedor' });
    expect(otherProject.status).toBe(201);

    const forbiddenProject = await otherVendor.agent
      .patch(`/api/projects/${otherProject.body.data.id}`)
      .set('X-CSRF-Token', otherVendor.csrfToken)
      .send({ preSales: 'No asignada' });
    expect(forbiddenProject.status).toBe(403);

    const adminUpdate = await admin.agent
      .patch(`/api/projects/${otherProject.body.data.id}`)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ preSales: 'Preventa global' });
    expect(adminUpdate.status).toBe(200);
    expect(adminUpdate.body.data.preSales).toBe('Preventa global');
  });
});
