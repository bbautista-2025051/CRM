import { Router } from 'express';
import { authRouter } from '../modules/auth/auth.routes';
import { usersRouter } from '../modules/users/users.routes';
import { companiesRouter } from '../modules/companies/companies.routes';
import { clientsRouter } from '../modules/clients/clients.routes';
import { opportunitiesRouter } from '../modules/opportunities/opportunities.routes';
import { salesRouter } from '../modules/sales/sales.routes';
import { dashboardRouter } from '../modules/dashboard/dashboard.routes';
import { settingsRouter } from '../modules/settings/settings.routes';
import { activityRouter } from '../modules/activity/activity.routes';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.status(200).json({
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
    },
  });
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/companies', companiesRouter);
apiRouter.use('/clients', clientsRouter);
apiRouter.use('/opportunities', opportunitiesRouter);
apiRouter.use('/sales', salesRouter);
apiRouter.use('/dashboard', dashboardRouter);
apiRouter.use('/settings', settingsRouter);
apiRouter.use('/activity', activityRouter);
