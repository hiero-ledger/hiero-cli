import type { PaymentRequirements } from '@x402/core/types';
import type { ClientHederaSigner } from '@x402/hedera';
import type { ConfigService } from '@/core/services/config/config-service.interface';
import type { KmsService } from '@/core/services/kms/kms-service.interface';
import type { TransferService } from '@/core/services/transfer/transfer-service.interface';
import type { PaymentSignerService } from './payment-signer.service.interface';
import type {
  BuiltTransferContext,
  CreateSignerParams,
  KmsClientSigner,
} from './payment-signer.types';

import { AccountId, TransactionId } from '@hiero-ledger/sdk';
import { isHbarAsset } from '@x402/hedera';

import { ValidationError } from '@/core/errors';
import {
  FtTransferEntry,
  HbarTransferEntry,
} from '@/core/services/transfer/transfer-entries';
import { resolveDefaultMaxTransactionFee } from '@/core/utils/resolve-default-max-transaction-fee';

export class PaymentSignerServiceImpl implements PaymentSignerService {
  constructor(
    private readonly kms: KmsService,
    private readonly transfer: TransferService,
    private readonly configService: ConfigService,
  ) {}

  createSigner(params: CreateSignerParams): KmsClientSigner {
    const { keyRefId, accountId, network } = params;
    let built: BuiltTransferContext | undefined;

    const signer: ClientHederaSigner = {
      accountId,
      createPartiallySignedTransferTransaction: async (
        requirements: PaymentRequirements,
      ): Promise<string> => {
        const feePayer = requirements.extra?.feePayer;
        if (typeof feePayer !== 'string') {
          throw new ValidationError(
            'Payment requirement is missing extra.feePayer.',
            {
              context: { network: requirements.network },
            },
          );
        }

        let amount: bigint;
        try {
          amount = BigInt(requirements.amount);
        } catch {
          throw new ValidationError('Payment amount is not a valid integer.', {
            context: { amount: requirements.amount },
          });
        }
        if (amount <= 0n) {
          throw new ValidationError(
            'Payment amount must be greater than zero.',
            {
              context: { amount: requirements.amount },
            },
          );
        }

        const entry = isHbarAsset(requirements.asset)
          ? new HbarTransferEntry(accountId, requirements.payTo, amount)
          : new FtTransferEntry(
              accountId,
              requirements.payTo,
              requirements.asset,
              amount,
            );
        const tx = this.transfer.buildTransferTransaction([entry]);

        const transactionId = TransactionId.generate(
          AccountId.fromString(feePayer),
        );
        tx.setTransactionId(transactionId);

        const maxTransactionFee = resolveDefaultMaxTransactionFee(
          this.configService,
        );
        const client = this.kms.createClient({ network, maxTransactionFee });
        try {
          tx.freezeWith(client);
          await this.kms.signTransaction(tx, keyRefId);
        } finally {
          client.close();
        }

        built = {
          transactionId: transactionId.toString(),
          payer: accountId,
          payTo: requirements.payTo,
          amount: requirements.amount,
          asset: requirements.asset,
          feePayer,
          network,
        };

        return Buffer.from(tx.toBytes()).toString('base64');
      },
    };

    return {
      signer,
      getBuiltContext: (): BuiltTransferContext => {
        if (!built) {
          throw new ValidationError(
            'No transaction was built; the payment payload was not created.',
          );
        }
        return built;
      },
    };
  }
}
