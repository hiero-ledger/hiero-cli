import type { LocalnetConfig } from '@/core/services/network/network-service.interface';

import { Hbar } from '@hiero-ledger/sdk';

import { SupportedNetwork } from '@/core';
import { createClient } from '@/core/utils/client-init';

const localnetConfig = {} as LocalnetConfig;

describe('createClient', () => {
  it('does not set a default max transaction fee when none is provided', () => {
    const client = createClient(SupportedNetwork.TESTNET, localnetConfig);
    expect(client.defaultMaxTransactionFee).toBeNull();
    client.close();
  });

  it('applies the provided default max transaction fee ceiling', () => {
    const fee = new Hbar(20);
    const client = createClient(SupportedNetwork.TESTNET, localnetConfig, fee);

    expect(client.defaultMaxTransactionFee?.toTinybars().toString()).toBe(
      fee.toTinybars().toString(),
    );
    client.close();
  });
});
