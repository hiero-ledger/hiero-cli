import { CliError } from './cli-error';

const TRANSACTION_PRECHECK_TEMPLATE = `Transaction execution failed
Transaction ID: {{context.transactionId}}
{{#if context.detailedMessage}}Detailed error message: {{context.detailedMessage}}{{/if}}`;

export class TransactionPrecheckError extends CliError {
  static readonly CODE = 'TRANSACTION_PRECHECK_ERROR';

  constructor(
    transactionId: string,
    detailedMessage: string,
    options?: { cause?: unknown },
  ) {
    super({
      code: TransactionPrecheckError.CODE,
      message: 'Transaction execution failed',
      recoverable: false,
      context: { transactionId, detailedMessage },
      cause: options?.cause,
    });
  }

  override getTemplate(): string {
    return TRANSACTION_PRECHECK_TEMPLATE;
  }
}
