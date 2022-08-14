import type { FastifyInstance, FastifyPluginOptions } from 'fastify';

export type RouteFunction = (
  app: FastifyInstance,
  _: FastifyPluginOptions,
  done: (error?: Error | undefined) => void
) => Promise<void>;

export type Response<PayloadType = never> = {
  message: string;
  payload: PayloadType;
};
