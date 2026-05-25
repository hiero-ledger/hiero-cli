import type { Logger } from '@/core';
import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { ContractData } from '@/plugins/contract/schema';

import { PublicKey } from '@hiero-ledger/sdk';

import {
  ED25519_DER_PUBLIC_KEY,
  ED25519_HEX_PUBLIC_KEY,
  MOCK_ACCOUNT_ID,
  MOCK_CONTRACT_ID,
  MOCK_CONTRACT_ID_UNKNOWN,
  MOCK_EVM_ADDRESS,
  MOCK_TX_ID,
} from '@/__tests__/mocks/fixtures';
import {
  createMockContractInfo,
  createMockKmsRecord,
  makeArgs,
  makeLogger,
} from '@/__tests__/mocks/mocks';
import { assertOutput } from '@/__tests__/utils/assert-output';
import { InternalError, NotFoundError, ValidationError } from '@/core';
import { MirrorNodeKeyType } from '@/core/services/mirrornode/types';
import { AliasType, SupportedNetwork } from '@/core/types/shared.types';
import { makeAliasServiceMock } from '@/plugins/account/__tests__/unit/helpers/mocks';
import {
  makeApiMocks,
  makeContractCleanupServiceMock,
  makeContractStateServiceMock,
} from '@/plugins/contract/__tests__/unit/helpers/mocks';
import { DeleteContractOutputSchema } from '@/plugins/contract/commands/delete';
import { DeleteContractCommand } from '@/plugins/contract/commands/delete/handler';

const MOCK_ADMIN_KEY_CLI = ['ed25519:private:' + 'a'.repeat(64)];
const STORED_CONTRACT_ADMIN_REF = 'test-admin-key-ref';

const MIRROR_CONTRACT_ADMIN_RAW = PublicKey.fromString(
  ED25519_DER_PUBLIC_KEY,
).toStringRaw();

function makeContractData(overrides: Partial<ContractData> = {}): ContractData {
  return {
    contractId: MOCK_CONTRACT_ID,
    name: 'MyContract',
    contractEvmAddress: MOCK_EVM_ADDRESS,
    adminKeyRefIds: [],
    adminKeyThreshold: 0,
    network: SupportedNetwork.TESTNET,
    ...overrides,
  };
}

describe('contract plugin - delete command', () => {
  let api: jest.Mocked<CoreApi>;
  let logger: jest.Mocked<Logger>;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = makeLogger();
    api = makeApiMocks({
      identityResolution: {
        resolveContract: jest.fn().mockResolvedValue({
          contractId: MOCK_CONTRACT_ID,
          evmAddress: MOCK_EVM_ADDRESS,
        }),
        resolveAccount: jest.fn().mockResolvedValue({
          accountId: MOCK_ACCOUNT_ID,
          accountPublicKey: 'pub-key',
          evmAddress: MOCK_EVM_ADDRESS,
        }),
        resolveReferenceToEntityOrEvmAddress: jest.fn(),
      },
      contract: {
        contractExecuteTransaction: jest.fn().mockReturnValue({
          transaction: {},
        }),
        deleteContract: jest.fn().mockReturnValue({ transaction: {} }),
      },
      txExecute: {
        execute: jest.fn().mockResolvedValue({
          success: true,
          transactionId: MOCK_TX_ID,
        }),
      },
    }).api;

    api.mirror.getContractInfo = jest.fn().mockResolvedValue(
      createMockContractInfo({
        admin_key: {
          _type: MirrorNodeKeyType.ED25519,
          key: ED25519_DER_PUBLIC_KEY,
        },
      }),
    );
  });

  test('deletes contract successfully by contract ID (state-only)', async () => {
    const contract = makeContractData({ name: 'MyContract' });
    const contractState = makeContractStateServiceMock({
      getContract: jest.fn().mockReturnValue(contract),
    });
    const contractCleanup = makeContractCleanupServiceMock({
      removeContractFromLocalState: jest.fn().mockReturnValue([]),
    });
    const alias = makeAliasServiceMock();

    const args = makeArgs(
      { ...api, alias, logger },
      {
        contract: MOCK_CONTRACT_ID,
        stateOnly: true,
      },
    );

    const result = await new DeleteContractCommand(
      contractState,
      contractCleanup,
    ).execute(args);

    expect(contractCleanup.removeContractFromLocalState).toHaveBeenCalledWith(
      contract,
      SupportedNetwork.TESTNET,
    );
    const output = assertOutput(result.result, DeleteContractOutputSchema);
    expect(output.deletedContract.contractId).toBe(MOCK_CONTRACT_ID);
    expect(output.deletedContract.name).toBe('MyContract');
    expect(output.stateOnly).toBe(true);
  });

  test('deletes contract on network successfully when stateOnly is false', async () => {
    const contract = makeContractData({
      name: 'MyContract',
      adminKeyRefIds: [STORED_CONTRACT_ADMIN_REF],
      adminKeyThreshold: 1,
    });
    const contractState = makeContractStateServiceMock({
      getContract: jest.fn().mockReturnValue(contract),
    });
    const contractCleanup = makeContractCleanupServiceMock({
      removeContractFromLocalState: jest.fn().mockReturnValue([]),
    });
    const alias = makeAliasServiceMock();

    api.kms.findByPublicKey = jest
      .fn()
      .mockImplementation((publicKey: string) =>
        publicKey === MIRROR_CONTRACT_ADMIN_RAW
          ? createMockKmsRecord(
              STORED_CONTRACT_ADMIN_REF,
              ED25519_HEX_PUBLIC_KEY,
            )
          : undefined,
      );

    const args = makeArgs(
      { ...api, alias, logger },
      {
        contract: MOCK_CONTRACT_ID,
        stateOnly: false,
        transferId: MOCK_ACCOUNT_ID,
      },
    );

    const result = await new DeleteContractCommand(
      contractState,
      contractCleanup,
    ).execute(args);

    expect(api.contract.deleteContract).toHaveBeenCalledWith({
      contractId: MOCK_CONTRACT_ID,
      transferAccountId: MOCK_ACCOUNT_ID,
      transferContractId: undefined,
    });
    expect(api.txSign.sign).toHaveBeenCalledWith(expect.anything(), [
      STORED_CONTRACT_ADMIN_REF,
    ]);
    expect(api.txExecute.execute).toHaveBeenCalled();
    expect(contractCleanup.removeContractFromLocalState).toHaveBeenCalledWith(
      expect.objectContaining({ contractId: MOCK_CONTRACT_ID }),
      SupportedNetwork.TESTNET,
    );

    const output = assertOutput(result.result, DeleteContractOutputSchema);
    expect(output.deletedContract.contractId).toBe(MOCK_CONTRACT_ID);
    expect(output.deletedContract.name).toBe('MyContract');
    expect(output.stateOnly).toBe(false);
    expect(output.transactionId).toBe(MOCK_TX_ID);
    expect(output.network).toBe(SupportedNetwork.TESTNET);
    expect(output.removedAliases).toEqual([]);
  });

  test('deletes contract successfully by alias', async () => {
    const contract = makeContractData({
      contractId: MOCK_CONTRACT_ID,
      name: 'ImportedContract',
    });
    const contractState = makeContractStateServiceMock({
      getContract: jest.fn().mockReturnValue(contract),
    });
    const contractCleanup = makeContractCleanupServiceMock({
      removeContractFromLocalState: jest
        .fn()
        .mockReturnValue([`my-contract (${SupportedNetwork.TESTNET})`]),
    });

    const alias = makeAliasServiceMock();
    alias.resolveOrThrow.mockReturnValue({
      alias: 'my-contract',
      type: AliasType.Contract,
      network: SupportedNetwork.TESTNET,
      entityId: MOCK_CONTRACT_ID,
      createdAt: '2024-01-01T00:00:00.000Z',
    });

    const args = makeArgs(
      { ...api, alias, logger },
      {
        contract: 'my-contract',
        stateOnly: true,
      },
    );

    const result = await new DeleteContractCommand(
      contractState,
      contractCleanup,
    ).execute(args);

    expect(alias.resolveOrThrow).toHaveBeenCalledWith(
      'my-contract',
      AliasType.Contract,
      SupportedNetwork.TESTNET,
    );
    expect(contractCleanup.removeContractFromLocalState).toHaveBeenCalledWith(
      contract,
      SupportedNetwork.TESTNET,
    );
    const output = assertOutput(result.result, DeleteContractOutputSchema);
    expect(output.deletedContract.contractId).toBe(MOCK_CONTRACT_ID);
    expect(output.deletedContract.name).toBe('ImportedContract');
    expect(output.removedAliases).toContain(
      `my-contract (${SupportedNetwork.TESTNET})`,
    );
  });

  test('throws when contract param is missing', async () => {
    const contractState = makeContractStateServiceMock();
    const contractCleanup = makeContractCleanupServiceMock();

    const args = makeArgs({ ...api, logger }, {});

    await expect(
      new DeleteContractCommand(contractState, contractCleanup).execute(args),
    ).rejects.toThrow();
  });

  test('throws when contract with given ID not found', async () => {
    const contractState = makeContractStateServiceMock({
      getContract: jest.fn().mockReturnValue(undefined),
    });
    const contractCleanup = makeContractCleanupServiceMock();

    api.mirror.getContractInfo = jest
      .fn()
      .mockRejectedValue(
        new NotFoundError(`Contract ${MOCK_CONTRACT_ID_UNKNOWN} not found`),
      );
    api.keyResolver.resolveSigningKey = jest.fn().mockResolvedValue({
      keyRefId: STORED_CONTRACT_ADMIN_REF,
      publicKey: ED25519_HEX_PUBLIC_KEY,
    });

    const args = makeArgs(
      { ...api, logger },
      {
        contract: MOCK_CONTRACT_ID_UNKNOWN,
        transferId: MOCK_ACCOUNT_ID,
        adminKey: MOCK_ADMIN_KEY_CLI,
      },
    );

    await expect(
      new DeleteContractCommand(contractState, contractCleanup).execute(args),
    ).rejects.toThrow(NotFoundError);
  });

  test('throws when contract alias not found', async () => {
    const alias = makeAliasServiceMock();
    alias.resolveOrThrow.mockImplementation(() => {
      throw new NotFoundError(
        'Alias "missing-alias" for contract on network "testnet" not found',
      );
    });
    const contractState = makeContractStateServiceMock();
    const contractCleanup = makeContractCleanupServiceMock();

    const args = makeArgs(
      { ...api, alias, logger },
      {
        contract: 'missing-alias',
        transferId: MOCK_ACCOUNT_ID,
        adminKey: MOCK_ADMIN_KEY_CLI,
      },
    );

    await expect(
      new DeleteContractCommand(contractState, contractCleanup).execute(args),
    ).rejects.toThrow(NotFoundError);
  });

  test('throws when alias resolves but contract not in state (and mirror fails)', async () => {
    const alias = makeAliasServiceMock();
    alias.resolveOrThrow.mockReturnValue({
      alias: 'my-contract',
      type: AliasType.Contract,
      network: SupportedNetwork.TESTNET,
      entityId: MOCK_CONTRACT_ID,
      createdAt: '2024-01-01T00:00:00.000Z',
    });
    const contractState = makeContractStateServiceMock({
      getContract: jest.fn().mockReturnValue(undefined),
    });
    const contractCleanup = makeContractCleanupServiceMock();

    api.mirror.getContractInfo = jest
      .fn()
      .mockRejectedValue(
        new NotFoundError(`Contract ${MOCK_CONTRACT_ID} not found`),
      );
    api.keyResolver.resolveSigningKey = jest.fn().mockResolvedValue({
      keyRefId: STORED_CONTRACT_ADMIN_REF,
      publicKey: ED25519_HEX_PUBLIC_KEY,
    });

    const args = makeArgs(
      { ...api, alias, logger },
      {
        contract: 'my-contract',
        transferId: MOCK_ACCOUNT_ID,
        adminKey: MOCK_ADMIN_KEY_CLI,
      },
    );

    await expect(
      new DeleteContractCommand(contractState, contractCleanup).execute(args),
    ).rejects.toThrow(NotFoundError);
  });

  test('throws when KMS has no keys matching mirror admin and no --admin-key', async () => {
    const contract = makeContractData({
      name: 'NoAdminRefs',
      adminKeyRefIds: [],
    });
    const contractState = makeContractStateServiceMock({
      getContract: jest.fn().mockReturnValue(contract),
    });
    const contractCleanup = makeContractCleanupServiceMock();
    const alias = makeAliasServiceMock();

    const args = makeArgs(
      { ...api, alias, logger },
      {
        contract: MOCK_CONTRACT_ID,
        stateOnly: false,
        transferId: MOCK_ACCOUNT_ID,
      },
    );

    await expect(
      new DeleteContractCommand(contractState, contractCleanup).execute(args),
    ).rejects.toThrow(ValidationError);
    await expect(
      new DeleteContractCommand(contractState, contractCleanup).execute(args),
    ).rejects.toThrow(
      'Not enough admin key(s) not found in key manager for this contract. Provide --admin-key.',
    );
  });

  test('throws when cleanup service throws', async () => {
    const contract = makeContractData({ contractId: MOCK_CONTRACT_ID });
    const contractState = makeContractStateServiceMock({
      getContract: jest.fn().mockReturnValue(contract),
    });
    const contractCleanup = makeContractCleanupServiceMock({
      removeContractFromLocalState: jest.fn().mockImplementation(() => {
        throw new InternalError('db error');
      }),
    });
    const alias = makeAliasServiceMock();

    const args = makeArgs(
      { ...api, alias, logger },
      {
        contract: MOCK_CONTRACT_ID,
        stateOnly: true,
      },
    );

    await expect(
      new DeleteContractCommand(contractState, contractCleanup).execute(args),
    ).rejects.toThrow('db error');
  });
});
