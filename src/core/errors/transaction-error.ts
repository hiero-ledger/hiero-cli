import { CliError } from './cli-error';

export class TransactionError extends CliError {
  static readonly CODE = 'TRANSACTION_ERROR';
  static readonly TEMPLATE_WITH_LINK = `Transaction execution failed
Transaction ID: {{hashscanLink context.transactionId "transaction" context.network}}
{{#if context.detailedMessage}}Detailed error message: {{context.detailedMessage}}{{/if}}`;

  static readonly TEMPLATE_DEFAULT = `{{{message}}}
{{#if context.detailedMessage}}Detailed error message: {{context.detailedMessage}}{{/if}}`;

  constructor(
    message: string,
    recoverable: boolean,
    options?: { context?: Record<string, unknown>; cause?: unknown },
  ) {
    super({
      code: TransactionError.CODE,
      message,
      recoverable,
      ...options,
    });
  }

  override getTemplate(): string {
    return this.context?.transactionId && this.context?.network
      ? TransactionError.TEMPLATE_WITH_LINK
      : TransactionError.TEMPLATE_DEFAULT;
  }
}
