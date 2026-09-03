export {};

declare global {
  interface Env {
    ACCESS_TOKEN: string;
    PROXYIP?: string;
  }
}
