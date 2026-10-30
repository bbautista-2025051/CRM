import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth';
import { csrfProtection } from '../../middlewares/csrf';
import { avatarUpload } from '../../middlewares/upload';
import { validate } from '../../middlewares/validate';
import * as controller from './settings.controller';
import {
  linkGoogleSchema,
  updatePreferencesSchema,
  updateProfileSchema,
} from './settings.schemas';

export const settingsRouter = Router();

settingsRouter.use(requireAuth);

settingsRouter.get('/profile', controller.getProfile);
settingsRouter.patch(
  '/profile',
  csrfProtection,
  validate({ body: updateProfileSchema }),
  controller.updateProfile,
);
settingsRouter.patch(
  '/preferences',
  csrfProtection,
  validate({ body: updatePreferencesSchema }),
  controller.updatePreferences,
);
settingsRouter.post(
  '/avatar',
  csrfProtection,
  avatarUpload.single('avatar'),
  controller.uploadAvatar,
);
settingsRouter.delete('/avatar', csrfProtection, controller.deleteAvatar);
settingsRouter.post(
  '/google/link',
  csrfProtection,
  validate({ body: linkGoogleSchema }),
  controller.linkGoogle,
);
settingsRouter.post('/google/unlink', csrfProtection, controller.unlinkGoogle);
settingsRouter.get('/sessions', controller.listSessions);
settingsRouter.post('/sessions/revoke-others', csrfProtection, controller.revokeOtherSessions);
