import { createClient } from 'redis';
import { slug } from 'cuid';

import { getConnectionUrl } from '../../shared/redis';
import { Response, RouteFunction } from '../../shared/types';
import { FastifyRequest } from 'fastify';
import { bookGenres, streamKey } from '../../shared/constants';

const issuerId = 'api-gateway';

type CreateBookPayload = {
  title: string;
  authors: Array<{
    id?: string;
    name: string;
  }>;
  summary: string;
  publisher: string;
  publishYear: number;
  genres: Array<typeof bookGenres>;
  imageUrl: string;
  price: number;
  quantity: number;
};

type Author = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
};

const client = createClient({
  url: getConnectionUrl(),
});

await client.connect();

export const booksEndpoint: RouteFunction = async (app, _, done) => {
  app.post(
    '/',
    async (
      req: FastifyRequest<{ Body: CreateBookPayload }>,
      res
    ): Promise<Response<{ bookId: string }>> => {
      const now = Date.now();

      const authors: Array<Required<CreateBookPayload['authors'][number]>> = [];
      const newAuthors: Author[] = [];

      for (const a of req.body.authors) {
        if (!a.id) {
          const newAuthor = {
            id: slug(),
            name: a.name,
          };
          authors.push(newAuthor);
          newAuthors.push({
            ...newAuthor,
            createdAt: now,
            updatedAt: now,
          });
        } else {
          authors.push({
            id: a.id,
            name: a.name,
          });
        }
      }

      await Promise.allSettled(
        newAuthors.map((a) =>
          client.xAdd(streamKey, '*', {
            eventType: 'authors:create',
            issuerId,
            payload: JSON.stringify(a),
          })
        )
      );

      const bookId = slug();
      const book = {
        id: bookId,
        ...req.body,
        authors,
        genres: [...new Set(req.body.genres)],
        createdAt: now,
        updatedAt: now,
      };

      await client.xAdd(streamKey, '*', {
        eventType: 'books:create',
        issuerId,
        payload: JSON.stringify(book),
      });

      res.status(200);
      return {
        message: 'Success',
        payload: {
          bookId,
        },
      };
    }
  );

  done();
};
