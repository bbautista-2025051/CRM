import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { prisma } from '../config/prisma';
import {
  createTestUser,
  futureDate,
  loginAs,
  resetDatabase,
  today,
} from './helpers';

interface Session {
  agent: ReturnType<typeof request.agent>;
  csrfToken: string;
}

const setupAdmin = async (): Promise<Session> => {
  await createTestUser({ email: 'admin@test.local', name: 'Admin', role: 'ADMIN' });
  const login = await loginAs('admin@test.local');
  return { agent: login.agent, csrfToken: login.csrfToken! };
};

const setupVendor = async (): Promise<Session> => {
  await createTestUser({ email: 'vendor@test.local', name: 'Vendedor' });
  const login = await loginAs('vendor@test.local');
  return { agent: login.agent, csrfToken: login.csrfToken! };
};

const createCompany = async (
  session: Session,
  overrides: Record<string, unknown> = {},
) => {
  return session.agent
    .post('/api/companies')
    .set('X-CSRF-Token', session.csrfToken)
    .send({
      name: 'Empresa Demo',
      taxId: '900000001-1',
      sector: 'Tecnología',
      email: 'contacto@empresa.test',
      ...overrides,
    });
};

describe('Operaciones comerciales', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('crea, consulta, edita y archiva empresas con validaciones e integridad', async () => {
    const admin = await setupAdmin();

    const invalid = await createCompany(admin, { name: 'A' });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.details.fields.length).toBeGreaterThan(0);

    const created = await createCompany(admin);
    expect(created.status).toBe(201);
    expect(created.body.data.status).toBe('ACTIVE');

    const duplicateTaxId = await createCompany(admin, {
      name: 'Otra Empresa',
      taxId: '900000001-1',
    });
    expect(duplicateTaxId.status).toBe(409);

    const patched = await admin.agent
      .patch(`/api/companies/${created.body.data.id}`)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ sector: 'Servicios', website: 'empresa.test' });
    expect(patched.status).toBe(200);
    expect(patched.body.data.sector).toBe('Servicios');
    expect(patched.body.data.website).toBe('https://empresa.test');

    const list = await admin.agent.get('/api/companies?search=Empresa');
    expect(list.status).toBe(200);
    expect(list.body.meta.total).toBe(1);
    expect(list.body.data[0]._count).toBeDefined();

    const archived = await admin.agent
      .delete(`/api/companies/${created.body.data.id}`)
      .set('X-CSRF-Token', admin.csrfToken);
    expect(archived.status).toBe(200);
    expect(archived.body.data.status).toBe('ARCHIVED');

    const stillThere = await admin.agent.get(`/api/companies/${created.body.data.id}`);
    expect(stillThere.status).toBe(200);
    expect(stillThere.body.data.status).toBe('ARCHIVED');
  });

  it('asocia clientes a empresas reales, previene duplicados y conserva relaciones al archivar', async () => {
    const admin = await setupAdmin();
    const company = await createCompany(admin);

    const client = await admin.agent
      .post('/api/clients')
      .set('X-CSRF-Token', admin.csrfToken)
      .send({
        firstName: 'Laura',
        lastName: 'Gómez',
        email: 'Laura.Gomez@Test.local',
        phone: '+57 300 000 0000',
        jobTitle: 'Compras',
        companyId: company.body.data.id,
      });

    expect(client.status).toBe(201);
    expect(client.body.data.email).toBe('laura.gomez@test.local');
    expect(client.body.data.companyId).toBe(company.body.data.id);

    const duplicate = await admin.agent
      .post('/api/clients')
      .set('X-CSRF-Token', admin.csrfToken)
      .send({
        firstName: 'Otra',
        lastName: 'Persona',
        email: 'laura.gomez@test.local',
        companyId: company.body.data.id,
      });
    expect(duplicate.status).toBe(409);

    const detail = await admin.agent.get(`/api/clients/${client.body.data.id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.company.name).toBe('Empresa Demo');
    expect(Array.isArray(detail.body.data.opportunities)).toBe(true);

    const archived = await admin.agent
      .delete(`/api/clients/${client.body.data.id}`)
      .set('X-CSRF-Token', admin.csrfToken);
    expect(archived.status).toBe(200);
    expect(archived.body.data.status).toBe('ARCHIVED');

    // Un cliente archivado no puede usarse para nuevas ventas.
    const archivedCompany = await createCompany(admin, {
      name: 'Empresa Archivada',
      taxId: '900000002-2',
    });
    await admin.agent
      .delete(`/api/companies/${archivedCompany.body.data.id}`)
      .set('X-CSRF-Token', admin.csrfToken);

    const invalidClient = await admin.agent
      .post('/api/clients')
      .set('X-CSRF-Token', admin.csrfToken)
      .send({
        firstName: 'Nuevo',
        lastName: 'Cliente',
        email: 'nuevo@test.local',
        companyId: archivedCompany.body.data.id,
      });
    expect(invalidClient.status).toBe(400);
  });

  it('registra oportunidades, deriva el estado de la etapa y genera una única venta', async () => {
    const admin = await setupAdmin();
    const company = await createCompany(admin);

    const client = await admin.agent
      .post('/api/clients')
      .set('X-CSRF-Token', admin.csrfToken)
      .send({
        firstName: 'Carlos',
        lastName: 'Ríos',
        email: 'carlos@test.local',
        companyId: company.body.data.id,
      });

    const opportunity = await admin.agent
      .post('/api/opportunities')
      .set('X-CSRF-Token', admin.csrfToken)
      .send({
        name: 'Renovación anual',
        companyId: company.body.data.id,
        clientId: client.body.data.id,
        value: 1500.5,
        probability: 60,
        expectedCloseDate: futureDate(30),
        stage: 'PROPUESTA',
      });

    expect(opportunity.status).toBe(201);
    expect(opportunity.body.data.status).toBe('OPEN');
    expect(opportunity.body.data.value).toBe('1500.5');

    const won = await admin.agent
      .patch(`/api/opportunities/${opportunity.body.data.id}`)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ stage: 'GANADA' });
    expect(won.status).toBe(200);
    expect(won.body.data.status).toBe('WON');
    expect(won.body.data.wonAt).toBeTruthy();

    const sale = await admin.agent
      .post('/api/sales')
      .set('X-CSRF-Token', admin.csrfToken)
      .send({
        opportunityId: opportunity.body.data.id,
        saleDate: today(),
        amount: 1500.5,
        currency: 'GTQ',
        status: 'PENDING',
      });

    expect(sale.status).toBe(201);
    expect(sale.body.data.saleNumber).toMatch(/^V-\d{4}-\d{5}$/);
    expect(sale.body.data.status).toBe('PENDING');
    expect(sale.body.data.clientId).toBe(client.body.data.id);
    expect(sale.body.data.companyId).toBe(company.body.data.id);

    const duplicateSale = await admin.agent
      .post('/api/sales')
      .set('X-CSRF-Token', admin.csrfToken)
      .send({
        opportunityId: opportunity.body.data.id,
        saleDate: today(),
        amount: 1500.5,
      });
    expect(duplicateSale.status).toBe(409);

    const beforeConfirm = await admin.agent.get('/api/dashboard/summary');
    expect(beforeConfirm.status).toBe(200);
    expect(beforeConfirm.body.data.totals.confirmedSales).toBe(0);
    expect(beforeConfirm.body.data.totals.conversionRate).toBe(100);

    const confirmed = await admin.agent
      .patch(`/api/sales/${sale.body.data.id}`)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ status: 'CONFIRMED' });
    expect(confirmed.status).toBe(200);

    const afterConfirm = await admin.agent.get('/api/dashboard/summary');
    expect(afterConfirm.body.data.totals.confirmedSales).toBe(1);
    expect(afterConfirm.body.data.totals.salesByCurrency).toEqual([
      { currency: 'GTQ', total: '1500.50', count: 1 },
    ]);

    const summary = await admin.agent.get('/api/sales/summary');
    expect(summary.status).toBe(200);
    expect(summary.body.data.counts.CONFIRMED).toBe(1);
    expect(summary.body.data.byCurrency[0].confirmedTotal).toBe('1500.50');

    const cancelled = await admin.agent
      .post(`/api/sales/${sale.body.data.id}/cancel`)
      .set('X-CSRF-Token', admin.csrfToken);
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.status).toBe('CANCELLED');

    const afterCancel = await admin.agent.get('/api/dashboard/summary');
    expect(afterCancel.body.data.totals.confirmedSales).toBe(0);

    // La empresa conserva clientes, oportunidades y ventas al archivarse.
    const archived = await admin.agent
      .delete(`/api/companies/${company.body.data.id}`)
      .set('X-CSRF-Token', admin.csrfToken);
    expect(archived.status).toBe(200);

    const companyDetail = await admin.agent.get(
      `/api/companies/${company.body.data.id}`,
    );
    expect(companyDetail.body.data.clients.length).toBe(1);
    expect(companyDetail.body.data.opportunities.length).toBe(1);
    expect(companyDetail.body.data.sales.length).toBe(1);
  });

  it('aplica permisos de propiedad y confirmación sobre oportunidades y ventas', async () => {
    const admin = await setupAdmin();
    const vendor = await setupVendor();
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@test.local' },
    });
    const company = await createCompany(admin);

    const client = await admin.agent
      .post('/api/clients')
      .set('X-CSRF-Token', admin.csrfToken)
      .send({
        firstName: 'Marta',
        lastName: 'Salazar',
        email: 'marta@test.local',
        companyId: company.body.data.id,
      });

    const adminOpportunity = await admin.agent
      .post('/api/opportunities')
      .set('X-CSRF-Token', admin.csrfToken)
      .send({
        name: 'Oportunidad del admin',
        clientId: client.body.data.id,
        value: 800,
        stage: 'GANADA',
      });

    const forbiddenEdit = await vendor.agent
      .patch(`/api/opportunities/${adminOpportunity.body.data.id}`)
      .set('X-CSRF-Token', vendor.csrfToken)
      .send({ probability: 90 });
    expect(forbiddenEdit.status).toBe(403);

    const forbiddenAssignment = await vendor.agent
      .post('/api/opportunities')
      .set('X-CSRF-Token', vendor.csrfToken)
      .send({
        name: 'Intento de asignación',
        clientId: client.body.data.id,
        ownerId: adminUser!.id,
        value: 100,
      });
    expect(forbiddenAssignment.status).toBe(403);

    const vendorOpportunity = await vendor.agent
      .post('/api/opportunities')
      .set('X-CSRF-Token', vendor.csrfToken)
      .send({
        name: 'Oportunidad del vendedor',
        clientId: client.body.data.id,
        value: 2500,
        stage: 'GANADA',
      });
    expect(vendorOpportunity.status).toBe(201);

    const vendorSale = await vendor.agent
      .post('/api/sales')
      .set('X-CSRF-Token', vendor.csrfToken)
      .send({
        opportunityId: vendorOpportunity.body.data.id,
        saleDate: today(),
        amount: 2500,
        currency: 'GTQ',
      });
    expect(vendorSale.status).toBe(201);
    expect(vendorSale.body.data.status).toBe('PENDING');

    const vendorConfirm = await vendor.agent
      .patch(`/api/sales/${vendorSale.body.data.id}`)
      .set('X-CSRF-Token', vendor.csrfToken)
      .send({ status: 'CONFIRMED' });
    expect(vendorConfirm.status).toBe(403);

    const adminConfirm = await admin.agent
      .patch(`/api/sales/${vendorSale.body.data.id}`)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ status: 'CONFIRMED' });
    expect(adminConfirm.status).toBe(200);

    const vendorCancelConfirmed = await vendor.agent
      .post(`/api/sales/${vendorSale.body.data.id}/cancel`)
      .set('X-CSRF-Token', vendor.csrfToken);
    expect(vendorCancelConfirmed.status).toBe(403);

    const vendorArchive = await vendor.agent
      .delete(`/api/clients/${client.body.data.id}`)
      .set('X-CSRF-Token', vendor.csrfToken);
    expect(vendorArchive.status).toBe(403);
  });

  it('impide que un vendedor archive o reactive empresas y clientes vía PATCH', async () => {
    const admin = await setupAdmin();
    const vendor = await setupVendor();

    const vendorCompany = await vendor.agent
      .post('/api/companies')
      .set('X-CSRF-Token', vendor.csrfToken)
      .send({ name: 'Empresa del vendedor' });
    expect(vendorCompany.status).toBe(201);

    const createArchivedCompany = await vendor.agent
      .post('/api/companies')
      .set('X-CSRF-Token', vendor.csrfToken)
      .send({ name: 'Empresa oculta', status: 'ARCHIVED' });
    expect(createArchivedCompany.status).toBe(403);

    const archiveViaPatch = await vendor.agent
      .patch(`/api/companies/${vendorCompany.body.data.id}`)
      .set('X-CSRF-Token', vendor.csrfToken)
      .send({ status: 'ARCHIVED' });
    expect(archiveViaPatch.status).toBe(403);

    // Sin cambiar el estado, el vendedor sí puede editar campos comerciales.
    const allowedPatch = await vendor.agent
      .patch(`/api/companies/${vendorCompany.body.data.id}`)
      .set('X-CSRF-Token', vendor.csrfToken)
      .send({ sector: 'Servicios' });
    expect(allowedPatch.status).toBe(200);
    expect(allowedPatch.body.data.sector).toBe('Servicios');
    expect(allowedPatch.body.data.status).toBe('ACTIVE');

    const vendorClient = await vendor.agent
      .post('/api/clients')
      .set('X-CSRF-Token', vendor.csrfToken)
      .send({
        firstName: 'Lucía',
        lastName: 'Vega',
        email: 'lucia@test.local',
        companyId: vendorCompany.body.data.id,
      });
    expect(vendorClient.status).toBe(201);

    const createArchivedClient = await vendor.agent
      .post('/api/clients')
      .set('X-CSRF-Token', vendor.csrfToken)
      .send({
        firstName: 'Oculto',
        lastName: 'Archivado',
        email: 'oculto@test.local',
        status: 'ARCHIVED',
      });
    expect(createArchivedClient.status).toBe(403);

    const archiveClientViaPatch = await vendor.agent
      .patch(`/api/clients/${vendorClient.body.data.id}`)
      .set('X-CSRF-Token', vendor.csrfToken)
      .send({ status: 'ARCHIVED' });
    expect(archiveClientViaPatch.status).toBe(403);

    // El administrador sí puede archivar mediante PATCH.
    const adminArchive = await admin.agent
      .patch(`/api/clients/${vendorClient.body.data.id}`)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ status: 'ARCHIVED' });
    expect(adminArchive.status).toBe(200);
    expect(adminArchive.body.data.status).toBe('ARCHIVED');

    // Y el vendedor no puede reactivarlo.
    const reactivate = await vendor.agent
      .patch(`/api/clients/${vendorClient.body.data.id}`)
      .set('X-CSRF-Token', vendor.csrfToken)
      .send({ status: 'ACTIVE' });
    expect(reactivate.status).toBe(403);
  });

  it('devuelve estados vacíos reales cuando la base de datos no tiene datos', async () => {
    const admin = await setupAdmin();
    // El login genera auditoría; se limpia para comprobar el estado vacío real.
    await prisma.activityLog.deleteMany();
    const response = await admin.agent.get('/api/dashboard/summary');

    expect(response.status).toBe(200);
    expect(response.body.data.totals.companies).toBe(0);
    expect(response.body.data.totals.clients).toBe(0);
    expect(response.body.data.totals.openOpportunities).toBe(0);
    expect(response.body.data.totals.confirmedSales).toBe(0);
    expect(response.body.data.totals.conversionRate).toBeNull();
    expect(response.body.data.charts.monthlySales).toHaveLength(12);
    expect(response.body.data.recentActivity).toHaveLength(0);
  });

  it('impide asociar una oportunidad a un cliente de otra empresa', async () => {
    const admin = await setupAdmin();
    const companyA = await createCompany(admin);
    const companyB = await createCompany(admin, {
      name: 'Empresa B',
      taxId: '900000003-3',
    });

    const clientB = await admin.agent
      .post('/api/clients')
      .set('X-CSRF-Token', admin.csrfToken)
      .send({
        firstName: 'Diego',
        lastName: 'Pardo',
        email: 'diego@test.local',
        companyId: companyB.body.data.id,
      });

    const mismatch = await admin.agent
      .post('/api/opportunities')
      .set('X-CSRF-Token', admin.csrfToken)
      .send({
        name: 'Cruce inválido',
        companyId: companyA.body.data.id,
        clientId: clientB.body.data.id,
        value: 500,
      });

    expect(mismatch.status).toBe(400);
  });
});
