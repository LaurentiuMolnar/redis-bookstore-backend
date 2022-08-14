if (process.env.NODE_ENV !== 'production') {
  (await import('dotenv')).config();
}

export function getConnectionUrl() {
  return `redis://${process.env.REDIS_USER}:${process.env.REDIS_PASSWD}@${process.env.REDIS_URL}`;
}
