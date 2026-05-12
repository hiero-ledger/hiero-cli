import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { CommandHandlerArgs } from '@/core/plugins/plugin.interface';
import type { ConfigService } from '@/core/services/config/config-service.interface';
import type { IdentityResolutionService } from '@/core/services/identity-resolution/identity-resolution-service.interface';
import type { KeyResolverService } from '@/core/services/key-resolver/key-resolver-service.interface';
import type { KmsService } from '@/core/services/kms/kms-service.interface';
import type { Signer } from '@/core/services/kms/signers/signer.interface';
import type { Logger } from '@/core/services/logger/logger-service.interface';
import type { NetworkService } from '@/core/services/network/network-service.interface';

import { SupportedNetwork } from '@/core/types/shared.types';

import {
  mockEcdsaPublicKey,
  mockKeyRefId,
  mockSignature65Bytes,
} from './fixtures';

export const makeLogger = (): jest.Mocked<Logger> => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  setLevel: jest.fn(),
});

export const makeSignerMock = (
  overrides?: Partial<jest.Mocked<Signer>>,
): jest.Mocked<Signer> =>
  ({
    sign: jest.fn().mockReturnValue(new Uint8Array(64)),
    signWithWallet: jest.fn().mockResolvedValue(mockSignature65Bytes),
    getPublicKey: jest.fn().mockReturnValue(mockEcdsaPublicKey),
    ...overrides,
  }) as jest.Mocked<Signer>;

export const makeKmsMock = (
  overrides?: Partial<jest.Mocked<KmsService>>,
): jest.Mocked<KmsService> =>
  ({
    get: jest.fn(),
    getSignerHandle: jest.fn().mockReturnValue(makeSignerMock()),
    list: jest.fn().mockReturnValue([]),
    hasPrivateKey: jest.fn().mockReturnValue(true),
    ...overrides,
  }) as unknown as jest.Mocked<KmsService>;

export const makeNetworkMock = (
  overrides?: Partial<jest.Mocked<NetworkService>>,
): jest.Mocked<NetworkService> =>
  ({
    getCurrentNetwork: jest.fn().mockReturnValue(SupportedNetwork.TESTNET),
    ...overrides,
  }) as unknown as jest.Mocked<NetworkService>;

export const makeIdentityResolutionMock = (
  overrides?: Partial<jest.Mocked<IdentityResolutionService>>,
): jest.Mocked<IdentityResolutionService> =>
  ({
    resolveAccount: jest.fn(),
    ...overrides,
  }) as unknown as jest.Mocked<IdentityResolutionService>;

export const makeConfigMock = (
  overrides?: Partial<jest.Mocked<ConfigService>>,
): jest.Mocked<ConfigService> =>
  ({
    getOption: jest.fn().mockReturnValue('local'),
    ...overrides,
  }) as unknown as jest.Mocked<ConfigService>;

export const makeKeyResolverMock = (
  overrides?: Partial<jest.Mocked<KeyResolverService>>,
): jest.Mocked<KeyResolverService> =>
  ({
    resolveSigningKey: jest.fn().mockResolvedValue({
      keyRefId: mockKeyRefId,
      publicKey: mockEcdsaPublicKey,
    }),
    ...overrides,
  }) as unknown as jest.Mocked<KeyResolverService>;

export const makeApiMock = (
  overrides?: Partial<jest.Mocked<CoreApi>>,
): jest.Mocked<CoreApi> =>
  ({
    kms: makeKmsMock(),
    config: makeConfigMock(),
    keyResolver: makeKeyResolverMock(),
    network: makeNetworkMock(),
    identityResolution: makeIdentityResolutionMock(),
    ...overrides,
  }) as unknown as jest.Mocked<CoreApi>;

export const makeCommandArgs = (params: {
  api: jest.Mocked<CoreApi>;
  logger?: jest.Mocked<Logger>;
  args?: Record<string, unknown>;
}): CommandHandlerArgs => ({
  args: { ...(params.args ?? {}) },
  api: params.api,
  hooks: new Map(),
});

export const makeEip712SignArgs = (params: {
  api: jest.Mocked<CoreApi>;
  logger?: jest.Mocked<Logger>;
  args?: Partial<{
    key: string;
    keyManager: string;
    domain: string;
    types: string;
    message: string;
    primaryType: string;
    outputFormat: string;
  }>;
}): CommandHandlerArgs =>
  makeCommandArgs({
    api: params.api,
    logger: params.logger,
    args: {
      key: 'kr_testkey',
      domain: '{"name":"TestApp","version":"1","chainId":296}',
      types:
        '{"Mail":[{"name":"from","type":"address"},{"name":"contents","type":"string"}]}',
      message:
        '{"from":"0xcd2a3d9f938e13cd947ec05abc7fe734df8dd826","contents":"Hello!"}',
      primaryType: 'Mail',
      outputFormat: 'full',
      ...params.args,
    },
  });

export const makeEip712VerifyArgs = (params: {
  api: jest.Mocked<CoreApi>;
  logger?: jest.Mocked<Logger>;
  args?: Partial<{
    domain: string;
    types: string;
    message: string;
    primaryType: string;
    signature: string;
    expectedSigner: string;
  }>;
}): CommandHandlerArgs =>
  makeCommandArgs({
    api: params.api,
    logger: params.logger,
    args: {
      domain: '{"name":"TestApp","version":"1","chainId":296}',
      types:
        '{"Mail":[{"name":"from","type":"address"},{"name":"contents","type":"string"}]}',
      message:
        '{"from":"0xcd2a3d9f938e13cd947ec05abc7fe734df8dd826","contents":"Hello!"}',
      primaryType: 'Mail',
      signature: '0x' + 'a'.repeat(130),
      ...params.args,
    },
  });
