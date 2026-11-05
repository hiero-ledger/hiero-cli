import { ValidationError } from '@/core/errors';
import { KeyAlgorithm } from '@/core/shared/constants';
import {
  buildAccountEvmAddress,
  buildEvmAddressFromAccountId,
} from '@/plugins/account/utils/account-address';

// Testnet account 0.0.4866350: compressed ECDSA public key and the EVM address derived from it.
const ECDSA_ACCOUNT_ID = '0.0.4866350';
const ECDSA_PUBLIC_KEY =
  '030d14eeebde1dcf37091c02695e11d96a38e55c269055765f281ce7c36ca14f6e';
const ECDSA_KEY_EVM_ADDRESS = '0x6038237195332cb437683ab4e6c35d9d147e1a14';
const ECDSA_ACCOUNT_LONG_ZERO_ADDRESS =
  '0x00000000000000000000000000000000004a412e';

describe('buildEvmAddressFromAccountId', () => {
  it('returns the 0x-prefixed long-zero address for an account ID', () => {
    expect(buildEvmAddressFromAccountId(ECDSA_ACCOUNT_ID)).toBe(
      ECDSA_ACCOUNT_LONG_ZERO_ADDRESS,
    );
  });

  it('encodes small and large account numbers as 20-byte hex', () => {
    expect(buildEvmAddressFromAccountId('0.0.2')).toBe(
      '0x0000000000000000000000000000000000000002',
    );
    expect(buildEvmAddressFromAccountId('0.0.4294967295')).toBe(
      '0x00000000000000000000000000000000ffffffff',
    );
  });

  it('returns a lowercase 42-character address', () => {
    const address = buildEvmAddressFromAccountId('0.0.11128571');

    expect(address).toMatch(/^0x[0-9a-f]{40}$/);
    expect(address).toBe('0x0000000000000000000000000000000000a9cefb');
  });

  it('throws ValidationError when accountId is empty', () => {
    expect(() => buildEvmAddressFromAccountId('')).toThrow(ValidationError);
  });
});

describe('buildAccountEvmAddress', () => {
  it('returns the existing EVM address when one is provided', () => {
    expect(
      buildAccountEvmAddress({
        accountId: ECDSA_ACCOUNT_ID,
        publicKey: ECDSA_PUBLIC_KEY,
        keyType: KeyAlgorithm.ECDSA,
        existingEvmAddress: ECDSA_KEY_EVM_ADDRESS,
      }),
    ).toBe(ECDSA_KEY_EVM_ADDRESS);
  });

  it('adds the 0x prefix to an existing EVM address without one', () => {
    expect(
      buildAccountEvmAddress({
        accountId: ECDSA_ACCOUNT_ID,
        publicKey: ECDSA_PUBLIC_KEY,
        keyType: KeyAlgorithm.ECDSA,
        existingEvmAddress: ECDSA_KEY_EVM_ADDRESS.slice(2),
      }),
    ).toBe(ECDSA_KEY_EVM_ADDRESS);
  });

  it.each([null, ''])(
    'derives the EVM address from the ECDSA public key when existingEvmAddress is %p',
    (existingEvmAddress) => {
      expect(
        buildAccountEvmAddress({
          accountId: ECDSA_ACCOUNT_ID,
          publicKey: ECDSA_PUBLIC_KEY,
          keyType: KeyAlgorithm.ECDSA,
          existingEvmAddress,
        }),
      ).toBe(ECDSA_KEY_EVM_ADDRESS);
    },
  );

  it('returns the long-zero address for ED25519 accounts', () => {
    expect(
      buildAccountEvmAddress({
        accountId: ECDSA_ACCOUNT_ID,
        publicKey: '',
        keyType: KeyAlgorithm.ED25519,
      }),
    ).toBe(ECDSA_ACCOUNT_LONG_ZERO_ADDRESS);
  });

  it('throws ValidationError for ECDSA accounts without a public key', () => {
    expect(() =>
      buildAccountEvmAddress({
        accountId: ECDSA_ACCOUNT_ID,
        publicKey: '',
        keyType: KeyAlgorithm.ECDSA,
      }),
    ).toThrow(ValidationError);
  });

  it('throws ValidationError when accountId is empty', () => {
    expect(() =>
      buildAccountEvmAddress({
        accountId: '',
        publicKey: ECDSA_PUBLIC_KEY,
        keyType: KeyAlgorithm.ECDSA,
      }),
    ).toThrow(ValidationError);
  });
});
