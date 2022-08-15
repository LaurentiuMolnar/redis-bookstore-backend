import { commandOptions, createClient } from 'redis';
import type { FastifyRequest } from 'fastify';

import { createEvent, getConnectionUrl } from '../../shared/redis';
import type { Response, RouteFunction } from '../../shared/types';
import { bookGenres, streamKey } from '../../shared/constants';
import { issuerId } from '../utils/constants';
import { createId } from '../../shared/functions';

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

type SearchBooksPayload = {
  total: number;
  books: Array<{
    id: string;
    title: string;
    authors: any[];
    price: number;
    imageUrl: string;
  }>;
};

export const booksEndpoint: RouteFunction = async (app, _, done) => {
  app.post(
    '/',
    async (
      req: FastifyRequest<{ Body: CreateBookPayload }>,
      res
    ): Promise<Response<{ bookId: string }>> => {
      const client = createClient({
        url: getConnectionUrl(),
      });
      await client.connect();
      const bookId = await sendCreateBookEvent(req.body, client);
      await client.quit();

      res.status(200);
      return {
        message: 'Success',
        payload: {
          bookId,
        },
      };
    }
  );

  app.get(
    '/',
    async (
      req: FastifyRequest<{ Querystring: { q?: string } }>,
      res
    ): Promise<Response<SearchBooksPayload>> => {
      const { q } = req.query;

      const client = createClient({
        url: getConnectionUrl(),
      });
      await client.connect();
      const response = await searchBooks(q, client);
      await client.quit();
      res.status(200);

      return {
        message: 'Success',
        payload: response,
      };
    }
  );

  done();
};
async function searchBooks(
  query: string | undefined,
  client: ReturnType<typeof createClient>
): Promise<SearchBooksPayload> {
  const response = await client.ft.search(
    commandOptions({ isolated: true }),
    'idx:books',
    query ? `@title|summary:${query}` : '*',
    {
      SORTBY: {
        BY: 'title',
        DIRECTION: 'ASC',
      } as any,
    }
  );

  return {
    total: response.total,
    books: response.documents.map(({ value: { $ } }) => {
      const bookJson = JSON.parse(
        $ as string
      ) as SearchBooksPayload['books'][number];
      return {
        id: bookJson.id,
        authors: bookJson.authors,
        imageUrl: bookJson?.imageUrl ?? '',
        price: bookJson.price,
        title: bookJson.title,
      };
    }),
  };
}

async function sendCreateBookEvent(
  bookData: CreateBookPayload,
  client: ReturnType<typeof createClient>
): Promise<string> {
  const now = Date.now();

  const authors: Array<Required<CreateBookPayload['authors'][number]>> = [];
  const newAuthors: Author[] = [];

  for (const a of bookData.authors) {
    if (!a.id) {
      const newAuthor = {
        id: createId(),
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
      client.xAdd(streamKey, '*', createEvent('authors:create', issuerId, a))
    )
  );

  const bookId = createId();
  const book = {
    id: bookId,
    ...bookData,
    authors,
    genres: [...new Set(bookData.genres)],
    createdAt: now,
    updatedAt: now,
  };

  await client.xAdd(
    streamKey,
    '*',
    createEvent('books:create', issuerId, book)
  );
  return bookId;
}
