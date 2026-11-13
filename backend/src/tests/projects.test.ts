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

    const notifications = await vendor.agent.get('/api/notifications');
    expect(notifications.status).toBe(200);
    expect(notifications.body.data.unreadCount).toBe(1);
    expect(notifications.body.data.notifications[0].taskId).toBe(task.body.data.id);

    await vendor.agent
      .post('/api/auth/logout')
      .set('X-CSRF-Token', vendor.csrfToken);
    const vendorAfterLogin = await loginAs('vendor@test.local');
    const persistedNotifications = await vendorAfterLogin.agent.get('/api/notifications');
    expect(persistedNotifications.body.data.unreadCount).toBe(1);
    expect(persistedNotifications.body.data.notifications[0].id).toBe(
      notifications.body.data.notifications[0].id,
    );

    const readNotification = await vendorAfterLogin.agent
      .patch(`/api/notifications/${notifications.body.data.notifications[0].id}/read`)
      .set('X-CSRF-Token', vendorAfterLogin.csrfToken!);
    expect(readNotification.status).toBe(200);
    const afterRead = await vendorAfterLogin.agent.get('/api/notifications');
    expect(afterRead.body.data.unreadCount).toBe(0);

    const forbidden = await vendorAfterLogin.agent
      .post('/api/projects')
      .set('X-CSRF-Token', vendorAfterLogin.csrfToken!)
      .send({ name: 'Proyecto no autorizado' });
    expect(forbidden.status).toBe(403);

    const visible = await vendorAfterLogin.agent.get('/api/projects');
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

    const vendorTeam = await vendorAfterLogin.agent.get('/api/team/overview');
    expect(vendorTeam.status).toBe(200);
    expect(vendorTeam.body.data.summary.members).toBe(1);
    expect(vendorTeam.body.data.projects[0].members[0].user.id).toBe(vendorUser?.id);
  });

  it('notifies the newly assigned member when a task is reassigned', async () => {
    const admin = await setup('ADMIN', 'admin@test.local');
    await setup('VENDEDOR', 'first@test.local');
    await setup('VENDEDOR', 'second@test.local');
    const firstUser = await prisma.user.findUnique({ where: { email: 'first@test.local' } });
    const secondUser = await prisma.user.findUnique({ where: { email: 'second@test.local' } });
    const project = await prisma.project.create({ data: { name: 'Proyecto de prueba' } });

    const createdTask = await admin.agent
      .post(`/api/team/${project.id}/tasks`)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ title: 'Revisión de entregables', assigneeId: firstUser?.id });
    expect(createdTask.status).toBe(201);

    const reassigned = await admin.agent
      .patch(`/api/team/${project.id}/tasks/${createdTask.body.data.id}`)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ assigneeId: secondUser?.id });
    expect(reassigned.status).toBe(200);

    const firstNotifications = await loginAs('first@test.local');
    const firstList = await firstNotifications.agent.get('/api/notifications');
    expect(firstList.body.data.unreadCount).toBe(1);

    const secondNotifications = await loginAs('second@test.local');
    const secondList = await secondNotifications.agent.get('/api/notifications');
    expect(secondList.body.data.unreadCount).toBe(1);
    expect(secondList.body.data.notifications[0].message).toContain(
      'Revisión de entregables',
    );
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
