/**
 * Seed OPCIONAL de demostración. Nunca se ejecuta automáticamente.
 *
 * Requisitos:
 *   SEED_DEMO_DATA=true
 *   SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD (si no existe el administrador)
 *
 * No contiene contraseñas fijas en el código.
 */
import { prisma } from '../src/config/prisma';
import { env } from '../src/config/env';
import { hashPassword } from '../src/utils/password';
import { passwordSchema } from '../src/modules/auth/auth.schemas';

const addMonths = (base: Date, months: number): Date => {
  const date = new Date(base);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date;
};

const dateOnly = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const nextSaleNumber = async (): Promise<string> => {
  const rows = await prisma.$queryRaw<Array<{ seq: number }>>`
    SELECT nextval('sale_number_seq')::int AS seq
  `;
  const seq = rows[0]?.seq ?? 1;
  return `V-${new Date().getUTCFullYear()}-${String(seq).padStart(5, '0')}`;
};

const main = async (): Promise<void> => {
  if (process.env.SEED_DEMO_DATA !== 'true') {
    console.log('Seed omitido. Define SEED_DEMO_DATA=true para crear datos de demostración.');
    return;
  }

  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('Define SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD para ejecutar el seed.');
    process.exitCode = 1;
    return;
  }

  const passwordValidation = passwordSchema.safeParse(password);
  if (!passwordValidation.success) {
    console.error(
      'SEED_ADMIN_PASSWORD no cumple la política:',
      passwordValidation.error.issues.map((issue) => issue.message).join(', '),
    );
    process.exitCode = 1;
    return;
  }

  let admin = await prisma.user.findUnique({ where: { email } });
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        name: process.env.SEED_ADMIN_NAME?.trim() || 'Administrador Demo',
        email,
        passwordHash: await hashPassword(password),
        role: 'ADMIN',
        status: 'ACTIVE',
        mustChangePassword: true,
      },
    });
    console.log(`Administrador demo creado: ${email}`);
  }

  const companyCount = await prisma.company.count();
  if (companyCount > 0) {
    console.log('Ya existen empresas. El seed de demostración no duplica datos.');
    return;
  }

  const now = new Date();
  const currency = env.DEFAULT_CURRENCY;

  const [andes, orbita, litoral] = await Promise.all([
    prisma.company.create({
      data: {
        name: 'Andes Logística',
        legalName: 'Andes Logística S.A.S.',
        taxId: '900123456-1',
        sector: 'Logística',
        email: 'contacto@andeslogistica.example',
        phone: '+57 601 555 0101',
        address: 'Bogotá, Colombia',
        website: 'https://andeslogistica.example',
        createdById: admin.id,
        notes: 'Cuenta demostración creada por el seed.',
      },
    }),
    prisma.company.create({
      data: {
        name: 'Órbita Tecnología',
        legalName: 'Órbita Tecnología Ltda.',
        taxId: '900987654-2',
        sector: 'Tecnología',
        email: 'hola@orbita.example',
        phone: '+57 604 555 0202',
        address: 'Medellín, Colombia',
        website: 'https://orbita.example',
        createdById: admin.id,
      },
    }),
    prisma.company.create({
      data: {
        name: 'Litoral Salud',
        legalName: 'Litoral Salud IPS',
        taxId: '901456789-3',
        sector: 'Salud',
        email: 'compras@litoral.example',
        phone: '+57 605 555 0303',
        address: 'Barranquilla, Colombia',
        createdById: admin.id,
      },
    }),
  ]);

  const [laura, carlos, marta, diego, sofia] = await Promise.all([
    prisma.client.create({
      data: {
        firstName: 'Laura',
        lastName: 'Gómez',
        email: 'laura.gomez@andeslogistica.example',
        phone: '+57 310 555 1001',
        jobTitle: 'Gerente de Compras',
        companyId: andes.id,
      },
    }),
    prisma.client.create({
      data: {
        firstName: 'Carlos',
        lastName: 'Ríos',
        email: 'carlos.rios@orbita.example',
        phone: '+57 311 555 1002',
        jobTitle: 'CTO',
        companyId: orbita.id,
      },
    }),
    prisma.client.create({
      data: {
        firstName: 'Marta',
        lastName: 'Salazar',
        email: 'marta.salazar@litoral.example',
        phone: '+57 312 555 1003',
        jobTitle: 'Directora Administrativa',
        companyId: litoral.id,
      },
    }),
    prisma.client.create({
      data: {
        firstName: 'Diego',
        lastName: 'Pardo',
        email: 'diego.pardo@andeslogistica.example',
        phone: '+57 313 555 1004',
        jobTitle: 'Jefe de Operaciones',
        companyId: andes.id,
      },
    }),
    prisma.client.create({
      data: {
        firstName: 'Sofía',
        lastName: 'Mendoza',
        email: 'sofia.mendoza@example.com',
        phone: '+57 314 555 1005',
        jobTitle: 'Consultora independiente',
        companyId: null,
      },
    }),
  ]);

  const opps = await Promise.all([
    prisma.opportunity.create({
      data: {
        name: 'Renovación flota de transporte',
        description: 'Renovación anual de vehículos de reparto.',
        companyId: andes.id,
        clientId: laura.id,
        ownerId: admin.id,
        value: '48000.00',
        probability: 70,
        expectedCloseDate: dateOnly(addMonths(now, 1)),
        stage: 'PROPUESTA',
        status: 'OPEN',
      },
    }),
    prisma.opportunity.create({
      data: {
        name: 'Plataforma de analítica',
        description: 'Licencias anuales de analítica operativa.',
        companyId: orbita.id,
        clientId: carlos.id,
        ownerId: admin.id,
        value: '32500.00',
        probability: 55,
        expectedCloseDate: dateOnly(addMonths(now, 2)),
        stage: 'NEGOCIACION',
        status: 'OPEN',
      },
    }),
    prisma.opportunity.create({
      data: {
        name: 'Equipos de monitoreo',
        companyId: litoral.id,
        clientId: marta.id,
        ownerId: admin.id,
        value: '18750.00',
        probability: 100,
        expectedCloseDate: dateOnly(addMonths(now, -1)),
        stage: 'GANADA',
        status: 'WON',
        wonAt: addMonths(now, -1),
      },
    }),
    prisma.opportunity.create({
      data: {
        name: 'Consultoría de procesos',
        companyId: andes.id,
        clientId: diego.id,
        ownerId: admin.id,
        value: '9600.00',
        probability: 100,
        expectedCloseDate: dateOnly(addMonths(now, -2)),
        stage: 'GANADA',
        status: 'WON',
        wonAt: addMonths(now, -2),
      },
    }),
    prisma.opportunity.create({
      data: {
        name: 'Portal de pacientes',
        companyId: litoral.id,
        clientId: marta.id,
        ownerId: admin.id,
        value: '22000.00',
        probability: 0,
        expectedCloseDate: dateOnly(addMonths(now, -1)),
        stage: 'PERDIDA',
        status: 'LOST',
        lostAt: addMonths(now, -1),
      },
    }),
    prisma.opportunity.create({
      data: {
        name: 'Auditoría de seguridad',
        companyId: orbita.id,
        clientId: carlos.id,
        ownerId: admin.id,
        value: '7400.00',
        probability: 35,
        expectedCloseDate: dateOnly(addMonths(now, 3)),
        stage: 'CALIFICACION',
        status: 'OPEN',
      },
    }),
  ]);

  await prisma.sale.create({
    data: {
      saleNumber: await nextSaleNumber(),
      companyId: litoral.id,
      clientId: marta.id,
      opportunityId: opps[2]?.id,
      ownerId: admin.id,
      saleDate: dateOnly(addMonths(now, -1)),
      amount: '18750.00',
      currency,
      status: 'CONFIRMED',
      notes: 'Venta demostración confirmada.',
    },
  });

  await prisma.sale.create({
    data: {
      saleNumber: await nextSaleNumber(),
      companyId: andes.id,
      clientId: diego.id,
      opportunityId: opps[3]?.id,
      ownerId: admin.id,
      saleDate: dateOnly(addMonths(now, -2)),
      amount: '9600.00',
      currency,
      status: 'CONFIRMED',
    },
  });

  await prisma.sale.create({
    data: {
      saleNumber: await nextSaleNumber(),
      companyId: orbita.id,
      clientId: carlos.id,
      ownerId: admin.id,
      saleDate: dateOnly(now),
      amount: '4200.00',
      currency,
      status: 'PENDING',
      notes: 'Venta demostración pendiente de confirmación.',
    },
  });

  await prisma.activityLog.createMany({
    data: [
      {
        userId: admin.id,
        action: 'SEED',
        entityType: 'SYSTEM',
        description: 'Datos de demostración cargados',
      },
      {
        userId: admin.id,
        action: 'CREATE',
        entityType: 'COMPANY',
        entityId: andes.id,
        description: 'Empresa creada: Andes Logística',
      },
      {
        userId: admin.id,
        action: 'CREATE',
        entityType: 'OPPORTUNITY',
        entityId: opps[0]?.id,
        description: 'Oportunidad creada: Renovación flota de transporte',
      },
    ],
  });

  console.log('Datos de demostración creados: 3 empresas, 5 clientes, 6 oportunidades y 3 ventas.');
  console.log(`Acceso: ${email}`);
};

main()
  .catch((error) => {
    console.error('Error en el seed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
