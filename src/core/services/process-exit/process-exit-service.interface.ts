export interface ProcessExitService {
  exit(code: number): never;
}
