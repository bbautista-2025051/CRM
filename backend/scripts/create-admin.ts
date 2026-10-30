import { z } from 'zod';
import { prisma } from '../src/config/prisma';
import { hashPassword } from '../src/utils/password';
import { passwordSchema } from '../src/modules/auth/auth.schemas';

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email(),
  password: passwordSchema,
});

const main = async (): Promise<void> => {
  const parsed = schema.safeParse({
    name: process.env.ADMIN_NAME,
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  });

  if (!parsed.success) {
    console.error(
      'Faltan datos válidos. Define ADMIN_NAME, ADMIN_EMAIL y ADMIN_PASSWORD en .env\n' +
        parsed.error.issues.map((issue) => `- ${issue.path.join('.')}: ${issue.message}`).join('\n'),
    );
    process.exitCode = 1;
    return;
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.error(`Ya existe una cuenta con el correo ${email}. No se creó nada.`);
    process.exitCode = 1;
    return;
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      mustChangePassword: true,
    },
  });

  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: 'CREATE',
      entityType: 'USER',
      entityId: user.id,
      description: `Administrador inicial creado: ${user.name}`,
    },
  });

  console.log('Administrador creado correctamente.');
  console.log(`  Correo: ${user.email}`);
  console.log('  Contraseña: la definida en ADMIN_PASSWORD (no se muestra).');
  console.log('  Deberás cambiarla al iniciar sesión por primera vez.');
};

main()
  .catch((error) => {
    console.error('No se pudo crear el administrador:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
