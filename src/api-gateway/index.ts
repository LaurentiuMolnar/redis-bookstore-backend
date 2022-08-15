import {
  createClient,
  SchemaFieldTypes,
  commandOptions,
  ErrorReply,
} from 'redis';
import { getConnectionUrl } from '../shared/redis';
import { initIndices } from './utils/init';

import { startServer } from './utils/server';

const client = createClient({ url: getConnectionUrl() });

await initIndices(client);

await startServer();
