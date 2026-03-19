import { CliError } from './cli-error';

const TRANSACTION_ERROR_TEMPLATE_WITH_LINK = `Transaction execution failed
Transaction ID: {{hashscanLink context.transactionId "transaction" context.network}}
{{#if context.detailedMessage}}Detailed error message: {{context.detailedMessage}}{{/if}}`;

const TRANSACTION_ERROR_TEMPLATE_DEFAULT = `{{{message}}}
{{#if context.detailedMessage}}Detailed error message: {{context.detailedMessage}}{{/if}}`;

export class TransactionError extends CliError {
  static readonly CODE = 'TRANSACTION_ERROR';

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
      ? TRANSACTION_ERROR_TEMPLATE_WITH_LINK
      : TRANSACTION_ERROR_TEMPLATE_DEFAULT;
  }
}
