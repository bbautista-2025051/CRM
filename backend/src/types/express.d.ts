import type { User } from '@prisma/client';
import type { AuthContext } from '../middlewares/auth';

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
      validated: {
        body: any;
        query: any;
        params: any;
      };
    }
  }
}

export interface PublicUserShape extends Omit<User, 'passwordHash' | 'googleId'> {
  googleLinked: boolean;
}

export {};
