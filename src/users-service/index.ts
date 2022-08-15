import { commandOptions, createClient } from 'redis';

import { streamKey } from '../shared/constants';
import { getConnectionUrl } from '../shared/redis';
import type { EventType } from '../shared/events';
import type { UserWithPassword } from '../shared/types';

const client = createClient({ url: getConnectionUrl() });
process.on('SIGINT', async () => {
  console.log('\nReceived SIGINT');

  if (client.isOpen) {
    await client.disconnect();
  }

  process.exit(1);
});

const groupName = 'users-service';
const consumerName = 'node-1';

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
        case 'users:create': {
          const {
            id: userId,
            passwordHash,
            ...user
          } = JSON.parse(message.payload) as UserWithPassword;
          const idKey = `users:id:${userId}`;
          const emailKey = `users:email:${user.email}`;

          await Promise.all([
            ...Object.entries(user).map(([field, value]) =>
              client.hSet(idKey, field, value)
            ),
            client.hSet(emailKey, 'passwordHash', passwordHash),
            client.hSet(emailKey, 'id', userId),
          ]);

          await client.xAck(streamKey, groupName, id);
          break;
        }
      }
    } else {
      // no events for now
    }
  } catch (error) {
    console.error(error);
  }
}
