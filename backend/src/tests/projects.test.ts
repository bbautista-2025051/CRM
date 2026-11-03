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
        dueDate: futureDate(20),
      });
    expect(project.status).toBe(201);
    expect(project.body.data.status).toBe('ACTIVE');
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
});
