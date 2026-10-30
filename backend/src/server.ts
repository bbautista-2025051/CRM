import { app } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './config/prisma';

const server = app.listen(env.PORT, () => {
  logger.info(
    {
      port: env.PORT,
      environment: env.NODE_ENV,
      appUrl: env.appUrl,
      googleEnabled: env.googleEnabled,
    },
    'API del CRM iniciada',
  );
});

const shutdown = (signal: string) => {
  logger.info({ signal }, 'Cerrando servidor');
  server.close(() => {
    prisma
      .$disconnect()
      .catch((error) => logger.error({ err: error }, 'Error al desconectar Prisma'))
      .finally(() => process.exit(0));
  });

  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
