import cuid from 'cuid';

export function createId() {
  return cuid.slug();
}

export function createSessionId() {
  return cuid();
}
