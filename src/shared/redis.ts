import { EventType } from './events';

if (process.env.NODE_ENV !== 'production') {
  (await import('dotenv')).config();
}

export function getConnectionUrl() {
  return `redis://${process.env.REDIS_USER}:${process.env.REDIS_PASSWD}@${process.env.REDIS_URL}`;
}

type Event = {
  eventType: EventType;
  issuerId: string;
  payload: string;
};

export function createEvent<T>(
  eventType: Event['eventType'],
  issuerId: Event['issuerId'],
  payload: T
): Event {
  return {
    eventType,
    issuerId,
    payload: JSON.stringify(payload),
  };
}
