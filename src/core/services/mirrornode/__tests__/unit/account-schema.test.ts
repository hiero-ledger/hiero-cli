import { AccountAPIResponseSchema } from '@/core/services/mirrornode/schemas';
import { MirrorNodeKeyType } from '@/core/services/mirrornode/types';

const baseAccount = {
  account: '0.0.2002',
  balance: { balance: 0, timestamp: '1700000000.000000000' },
  created_timestamp: '1700000000.000000000',
  evm_address: '0xcfaa1c85161e2d44df55291896b35a3cd7f98b53',
  max_automatic_token_associations: 0,
  memo: '',
  receiver_sig_required: false,
};

describe('AccountAPIResponseSchema - key field', () => {
  test('accepts null key (hollow account)', () => {
    const result = AccountAPIResponseSchema.safeParse({
      ...baseAccount,
      key: null,
    });
    expect(result.success).toBe(true);
  });

  test('accepts a valid key object', () => {
    const result = AccountAPIResponseSchema.safeParse({
      ...baseAccount,
      key: { _type: MirrorNodeKeyType.ECDSA_SECP256K1, key: 'abcd' },
    });
    expect(result.success).toBe(true);
  });

  test('accepts a missing key', () => {
    const result = AccountAPIResponseSchema.safeParse(baseAccount);
    expect(result.success).toBe(true);
  });
});
