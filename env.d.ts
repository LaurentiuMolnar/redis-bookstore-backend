declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'production' | 'development';
    REDIS_USER: string;
    REDIS_PASSWD: string;
    REDIS_URL: string;
  }
}
