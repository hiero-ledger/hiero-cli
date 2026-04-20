import type { z } from 'zod';

export type HookResult =
  | { breakFlow: false }
  | {
      breakFlow: true;
      result: object;
      schema?: z.ZodTypeAny;
      humanTemplate?: string;
    };

export interface Hook<TParams = unknown> {
  execute(params: TParams): Promise<HookResult>;
}
