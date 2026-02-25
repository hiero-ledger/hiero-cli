import type { ProcessExitService } from './process-exit-service.interface';

export class ProcessExitServiceImpl implements ProcessExitService {
  exit(code: number): never {
    return process.exit(code);
  }
}
