import { commandOptions, createClient } from 'redis';
import { slug } from 'cuid';

import { streamKey } from '../shared/constants';
import { getConnectionUrl } from '../shared/redis';
import { EventType } from '../shared/events';

const client = createClient({ url: getConnectionUrl() });
process.on('SIGINT', async () => {
  console.log('\nReceived SIGINT');

  if (client.isOpen) {
    await client.disconnect();
  }

  process.exit(1);
});

const groupName = 'books-service';
const consumerName = slug();

await client.connect();

try {
  await client.xGroupCreate(streamKey, groupName, '0', {
    MKSTREAM: true,
  });
  console.log(`Created consumer group ${groupName}`);
} catch (error) {
  console.log(`Consumer group ${groupName} already exists. Skipping creation`);
}

// eslint-disable-next-line no-constant-condition
while (true) {
  try {
    const response = await client.xReadGroup(
      commandOptions({ isolated: true }),
      groupName,
      consumerName,
      [
        {
          key: streamKey,
          id: '>',
        },
      ],
      {
        COUNT: 1,
        BLOCK: 5000,
      }
    );

    if (response && response.length >= 0) {
      console.log(JSON.stringify(response, null, 2));
      const [event] = response;

      if (!event) {
        continue;
      }

      const {
        messages: [{ message, id }],
      } = event;

      switch (message.eventType as EventType) {
        case 'books:create': {
          const book = JSON.parse(message.payload);
          await client.json.set(`books:${book.id}`, '$', book);
          break;
        }
        case 'authors:create': {
          const author = JSON.parse(message.payload);
          await client.json.set(`authors:${author.id}`, '$', author);
          break;
        }
      }
      await client.xAck(streamKey, groupName, id);
    } else {
      // no events for now
    }
  } catch (error) {
    console.error(error);
  }
}
