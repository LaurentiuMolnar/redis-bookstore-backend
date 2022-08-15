import { createClient } from 'redis';
import bcrypt from 'bcryptjs';
import type { FastifyRequest } from 'fastify';

import { Response, RouteFunction } from '../../shared/types';
import { getConnectionUrl } from '../../shared/redis';
import { createSessionId } from '../../shared/functions';

type AuthRequest = {
  email: string;
  password: string;
};

export const authEndpoint: RouteFunction = async (app, _, done) => {
  app.post(
    '/',
    async (
      req: FastifyRequest<{ Body: AuthRequest }>,
      res
    ): Promise<Response> => {
      const { email, password } = req.body;

      const client = createClient({ url: getConnectionUrl() });
      await client.connect();

      const user = (await client.hGetAll(`users:email:${email}`)) as
        | {
            id: string;
            passwordHash: string;
          }
        | Record<string, never>;

      console.log(JSON.stringify(user));

      if (Object.keys(user).length === 0) {
        res.status(401);
        return {
          message: 'Unauthorized',
          payload: undefined,
        };
      }

      if (!(await bcrypt.compare(password, user.passwordHash))) {
        res.status(401);
        return {
          message: 'Unauthorized',
          payload: undefined,
        };
      }

      const sessionId = createSessionId();
      await client.set(`sessions:${sessionId}`, user.id, {
        PXAT: Date.now() + 1 * 60 * 60 * 1000,
      });
      await client.quit();

      res.status(200);
      res.headers({
        'Set-Cookie': `sessionId=${sessionId}; Http-Only; Path=/`,
      });
      return {
        message: 'Success',
        payload: undefined,
      };
    }
  );

  done();
};
