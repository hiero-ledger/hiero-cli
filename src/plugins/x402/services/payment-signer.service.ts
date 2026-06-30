import type { PaymentRequirements } from '@x402/core/types';
import type { ClientHederaSigner } from '@x402/hedera';
import type { KmsService } from '@/core/services/kms/kms-service.interface';
import type { PaymentSignerService } from './payment-signer.service.interface';
import type {
  BuiltTransferContext,
  CreateSignerParams,
  KmsClientSigner,
} from './payment-signer.types';

import {
  AccountId,
  Hbar,
  TokenId,
  TransactionId,
  TransferTransaction,
} from '@hiero-ledger/sdk';
import { isHbarAsset } from '@x402/hedera';

import { ValidationError } from '@/core/errors';

export class PaymentSignerServiceImpl implements PaymentSignerService {
  constructor(private readonly kms: KmsService) {}

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

        const payer = AccountId.fromString(accountId);
        const payTo = AccountId.fromString(requirements.payTo);
        const tx = new TransferTransaction();

        if (isHbarAsset(requirements.asset)) {
          tx.addHbarTransfer(payer, Hbar.fromTinybars((-amount).toString()));
          tx.addHbarTransfer(payTo, Hbar.fromTinybars(amount.toString()));
        } else {
          const tokenId = TokenId.fromString(requirements.asset);
          tx.addTokenTransfer(tokenId, payer, -amount);
          tx.addTokenTransfer(tokenId, payTo, amount);
        }

        const transactionId = TransactionId.generate(
          AccountId.fromString(feePayer),
        );
        tx.setTransactionId(transactionId);

        const client = this.kms.createClient(network);
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
