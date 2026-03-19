import { CliError } from './cli-error';

export class NetworkError extends CliError {
  private static readonly CODE = 'NETWORK_ERROR';
  private static readonly TEMPLATE = `
{{message}}
{{#if context.apiMessages}}{{#if (gt (length context.apiMessages) 0)}}
Detailed error message:
{{#each context.apiMessages}}  
  • {{this}}{{/each}}
{{/if}}{{/if}}
`.trim();

  constructor(
    message: string,
    options?: {
      context?: Record<string, unknown>;
      cause?: unknown;
      recoverable?: boolean;
    },
  ) {
    super({
      code: NetworkError.CODE,
      message,
      recoverable: options?.recoverable ?? true,
      context: options?.context,
      cause: options?.cause,
    });
  }

  override getTemplate(): string {
    return NetworkError.TEMPLATE;
  }
}
