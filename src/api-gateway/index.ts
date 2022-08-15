import {
  createClient,
  SchemaFieldTypes,
  commandOptions,
  ErrorReply,
} from 'redis';
import { getConnectionUrl } from '../shared/redis';

import { startServer } from './utils/server';

const client = createClient({ url: getConnectionUrl() });

await client.connect();

try {
  await client.ft.create(
    commandOptions({ isolated: true }),
    'idx:books',
    {
      '$.title': {
        type: SchemaFieldTypes.TEXT,
        SORTABLE: true,
        AS: 'title',
      },
      '$.genres.*': {
        type: SchemaFieldTypes.TAG,
        AS: 'genres',
      },
      '$.summary': {
        type: SchemaFieldTypes.TEXT,
        AS: 'summary',
      },
      '$.price': {
        type: SchemaFieldTypes.NUMERIC,
        SORTABLE: true,
        AS: 'price',
      } as any,
      '$.publisher': {
        type: SchemaFieldTypes.TEXT,
        AS: 'publisher',
      },
      '$.quantity': {
        type: SchemaFieldTypes.NUMERIC,
        AS: 'quantity',
      } as any,
    },
    {
      ON: 'JSON',
      PREFIX: 'books:',
    }
  );
} catch (error) {
  if (error instanceof ErrorReply) {
    if (error.message === 'Index already exists') {
      console.log(`Index ${'idx:books'} already exists`);
    }
  } else {
    console.error(error);
    process.exit(1);
  }
}

if (client.isOpen) {
  await client.disconnect();
}

await startServer();
