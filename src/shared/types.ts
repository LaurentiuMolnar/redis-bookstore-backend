import type { FastifyInstance, FastifyPluginOptions } from 'fastify';

export type RouteFunction = (
  app: FastifyInstance,
  _: FastifyPluginOptions,
  done: (error?: Error | undefined) => void
) => Promise<void>;

export type Response<PayloadType = undefined> = {
  message: string;
  payload: PayloadType;
};

export type User = {
  id: string;
  name: string;
  email: string;
  createdAt: number;
  updatedAt: number;
};

export type UserWithPassword = User & { passwordHash: string };
