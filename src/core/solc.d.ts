declare module 'solc' {
  export interface ImportCallbackResult {
    contents?: string;
    error?: string;
  }

  export interface CompileOptions {
    import?: (path: string) => ImportCallbackResult;
  }

  export function compile(input: string, options?: CompileOptions): string;

  export function loadRemoteVersion(
    version: string,
    callback: (err: Error | null, solcSpecific: unknown) => void,
  ): void;
}
