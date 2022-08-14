import fastify from 'fastify';
import { booksEndpoint } from '../routes/books';

const signals = ['SIGTERM', 'SIGINT'] as const;

const server = fastify();

server.register(booksEndpoint, { prefix: '/api/books' });

export async function startServer() {
  server.listen({ port: 8080 }, (error, address) => {
    if (error) {
      console.error(error);
      process.exit(1);
    }
    console.log(`Server listening at ${address}`);
  });

  process.on('unhandledRejection', async () => {
    console.log(`Shutting down due to unhandledRejection`);

    await server.close();
    process.exit(1);
  });

  for (const signal of signals) {
    process.on(signal, async () => {
      console.log(`Received signal ${signal}. Shutting server down...`);

      try {
        await server.close();
        console.log(`Server shut down`);
        process.exit(0);
      } catch (error) {
        console.error(`Error occurred:`, error);
        process.exit(1);
      }
    });
  }
}
