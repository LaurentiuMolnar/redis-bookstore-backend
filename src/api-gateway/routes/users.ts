import { createClient } from 'redis';
import bcrypt from 'bcryptjs';
import type { FastifyRequest } from 'fastify';

import { createEvent, getConnectionUrl } from '../../shared/redis';
import type {
  Response,
  RouteFunction,
  User,
  UserWithPassword,
} from '../../shared/types';
import { streamKey } from '../../shared/constants';
import { issuerId } from '../utils/constants';
import { createId } from '../../shared/functions';

type CreateUserPayload = {
  email: string;
  password: string;
  name: string;
};

export const usersEndpoint: RouteFunction = async (app, _, done) => {
  app.get('/me', async (req, res) => {
    return 'Hello, user!';
  });

  app.post(
    '/',
    async (
      req: FastifyRequest<{ Body: CreateUserPayload }>,
      res
    ): Promise<Response<User>> => {
      const client = createClient({ url: getConnectionUrl() });
      const [, passwordHash] = await Promise.all([
        client.connect(),
        bcrypt.hash(req.body.password, 10),
      ]);

      const userId = createId();

      const now = Date.now();

      const user: User = {
        id: userId,
        email: req.body.email,
        name: req.body.name,
        createdAt: now,
        updatedAt: now,
      };

      await client.xAdd(
        streamKey,
        '*',
        createEvent<UserWithPassword>('users:create', issuerId, {
          ...user,
          passwordHash,
        })
      );

      await client.quit();

      res.status(200);
      return {
        message: 'Success',
        payload: user,
      };
    }
  );

  done();
};
