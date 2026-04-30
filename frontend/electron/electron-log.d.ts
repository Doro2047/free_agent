declare module 'electron-log' {
  const log: {
    info: (...params: any[]) => void;
    warn: (...params: any[]) => void;
    error: (...params: any[]) => void;
    debug: (...params: any[]) => void;
    verbose: (...params: any[]) => void;
    silly: (...params: any[]) => void;
    transports: {
      file: { level: string; format: string; maxSize: number };
      console: { level: string; format: string };
      remote: { level: string };
    };
    (message: any, ...optionalParams: any[]): void;
  };
  export { log };
  export default log;
}
