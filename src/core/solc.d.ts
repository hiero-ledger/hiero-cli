declare module 'solc' {
  export interface ImportCallbackResult {
    contents?: string;
    error?: string;
  }

  export interface CompileOptions {
    import?: (path: string) => ImportCallbackResult;
  }

  export function compile(input: string, options?: CompileOptions): string;
}
