/**
 * Unit tests for UpdateContractCommand handler
 */
import type { Logger } from '@/core';
import type { CoreApi } from '@/core/core-api/core-api.interface';

import {
  ED25519_DER_PUBLIC_KEY,
  ED25519_HEX_PUBLIC_KEY,
  MOCK_CONTRACT_ID,
  MOCK_CONTRACT_ID_UNKNOWN,
  MOCK_TX_ID,
} from '@/__tests__/mocks/fixtures';
import {
  createMockContractInfo,
  createMockKmsRecord,
} from '@/__tests__/mocks/mocks';
import { assertOutput } from '@/__tests__/utils/assert-output';
import { AliasType } from '@/core';
import {
  NotFoundError,
  TransactionError,
  ValidationError,
} from '@/core/errors';
import { SupportedNetwork } from '@/core/types/shared.types';
import { composeKey } from '@/core/utils/key-composer';
import {
  makeAliasServiceMock,
  makeArgs,
  makeLogger,
} from '@/plugins/account/__tests__/unit/helpers/mocks';
import {
  makeContractData,
  MIRROR_CONTRACT_ADMIN_RAW,
  NEW_ADMIN_KEY_REF,
  STORED_CONTRACT_ADMIN_REF,
} from '@/plugins/contract/__tests__/unit/helpers/fixtures';
import { makeApiMocks } from '@/plugins/contract/__tests__/unit/helpers/mocks';
import { contractUpdate } from '@/plugins/contract/commands/update/handler';
import { ContractUpdateOutputSchema } from '@/plugins/contract/commands/update/output';
import { ZustandContractStateHelper } from '@/plugins/contract/zustand-state-helper';

jest.mock('../../zustand-state-helper', () => ({
  ZustandContractStateHelper: jest.fn(),
}));

const MockedHelper = ZustandContractStateHelper as jest.Mock;

const expectedStateKey = composeKey(SupportedNetwork.TESTNET, MOCK_CONTRACT_ID);

describe('contract plugin - update command', () => {
  let api: jest.Mocked<CoreApi>;
  let logger: jest.Mocked<Logger>;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = makeLogger();
    api = makeApiMocks({
      contract: {
        updateContract: jest.fn().mockReturnValue({ transaction: {} }),
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
        admin_key: { _type: 'ED25519', key: ED25519_DER_PUBLIC_KEY },
      }),
    );

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
  });

  test('updates contract memo successfully using KMS-discovered signing key', async () => {
    const contract = makeContractData({ memo: 'old memo' });
    const saveContractMock = jest.fn();
    MockedHelper.mockImplementation(() => ({
      getContract: jest.fn().mockReturnValue(contract),
      saveContract: saveContractMock,
    }));
    const alias = makeAliasServiceMock();
    alias.list.mockReturnValue([]);

    const args = makeArgs({ ...api, alias }, logger, {
      contract: MOCK_CONTRACT_ID,
      memo: 'new memo',
    });

    const result = await contractUpdate(args);

    expect(api.contract.updateContract).toHaveBeenCalledWith(
      expect.objectContaining({
        contractId: MOCK_CONTRACT_ID,
        memo: 'new memo',
      }),
    );
    expect(api.txSign.sign).toHaveBeenCalledWith(expect.anything(), [
      STORED_CONTRACT_ADMIN_REF,
    ]);
    const output = assertOutput(result.result, ContractUpdateOutputSchema);
    expect(output.contractId).toBe(MOCK_CONTRACT_ID);
    expect(output.network).toBe(SupportedNetwork.TESTNET);
    expect(output.transactionId).toBe(MOCK_TX_ID);
    expect(output.updatedFields).toContain('memo');
  });

  test('updates contract memo using explicitly provided --admin-key', async () => {
    const contract = makeContractData();
    const saveContractMock = jest.fn();
    MockedHelper.mockImplementation(() => ({
      getContract: jest.fn().mockReturnValue(contract),
      saveContract: saveContractMock,
    }));
    const alias = makeAliasServiceMock();
    alias.list.mockReturnValue([]);

    api.keyResolver.resolveSigningKeys = jest.fn().mockResolvedValue({
      keyRefIds: [STORED_CONTRACT_ADMIN_REF],
    });

    const args = makeArgs({ ...api, alias }, logger, {
      contract: MOCK_CONTRACT_ID,
      adminKey: ['ed25519:private:' + 'a'.repeat(64)],
      memo: 'updated memo',
    });

    const result = await contractUpdate(args);

    expect(api.keyResolver.resolveSigningKeys).toHaveBeenCalled();
    expect(api.txSign.sign).toHaveBeenCalledWith(expect.anything(), [
      STORED_CONTRACT_ADMIN_REF,
    ]);
    const output = assertOutput(result.result, ContractUpdateOutputSchema);
    expect(output.updatedFields).toContain('memo');
  });

  test('updates admin key and adds new admin key as co-signer', async () => {
    const contract = makeContractData();
    const saveContractMock = jest.fn();
    MockedHelper.mockImplementation(() => ({
      getContract: jest.fn().mockReturnValue(contract),
      saveContract: saveContractMock,
    }));
    const alias = makeAliasServiceMock();
    alias.list.mockReturnValue([]);

    api.keyResolver.resolveSigningKey = jest.fn().mockResolvedValue({
      keyRefId: NEW_ADMIN_KEY_REF,
      publicKey: ED25519_DER_PUBLIC_KEY,
    });

    const args = makeArgs({ ...api, alias }, logger, {
      contract: MOCK_CONTRACT_ID,
      newAdminKey: ['ed25519:public:' + ED25519_HEX_PUBLIC_KEY],
    });

    const result = await contractUpdate(args);

    expect(api.keyResolver.resolveSigningKey).toHaveBeenCalled();
    expect(api.txSign.sign).toHaveBeenCalledWith(expect.anything(), [
      STORED_CONTRACT_ADMIN_REF,
      NEW_ADMIN_KEY_REF,
    ]);
    expect(saveContractMock).toHaveBeenCalledWith(
      expectedStateKey,
      expect.objectContaining({
        adminKeyRefIds: [NEW_ADMIN_KEY_REF],
        adminKeyThreshold: 1,
      }),
    );
    const output = assertOutput(result.result, ContractUpdateOutputSchema);
    expect(output.updatedFields).toContain('adminKey');
  });

  test('updates multiple fields at once', async () => {
    const contract = makeContractData();
    const saveContractMock = jest.fn();
    MockedHelper.mockImplementation(() => ({
      getContract: jest.fn().mockReturnValue(contract),
      saveContract: saveContractMock,
    }));
    const alias = makeAliasServiceMock();
    alias.list.mockReturnValue([]);

    const args = makeArgs({ ...api, alias }, logger, {
      contract: MOCK_CONTRACT_ID,
      memo: 'new memo',
      autoRenewPeriod: 7776000,
      maxAutomaticTokenAssociations: 5,
    });

    const result = await contractUpdate(args);

    expect(api.contract.updateContract).toHaveBeenCalledWith(
      expect.objectContaining({
        contractId: MOCK_CONTRACT_ID,
        memo: 'new memo',
        autoRenewPeriod: 7776000,
        maxAutomaticTokenAssociations: 5,
      }),
    );
    const output = assertOutput(result.result, ContractUpdateOutputSchema);
    expect(output.updatedFields).toContain('memo');
    expect(output.updatedFields).toContain('autoRenewPeriod');
    expect(output.updatedFields).toContain('maxAutomaticTokenAssociations');
  });

  test('clears memo when memo is set to "null" string', async () => {
    const contract = makeContractData({ memo: 'existing memo' });
    const saveContractMock = jest.fn();
    MockedHelper.mockImplementation(() => ({
      getContract: jest.fn().mockReturnValue(contract),
      saveContract: saveContractMock,
    }));
    const alias = makeAliasServiceMock();
    alias.list.mockReturnValue([]);

    const args = makeArgs({ ...api, alias }, logger, {
      contract: MOCK_CONTRACT_ID,
      memo: 'null',
    });

    const result = await contractUpdate(args);

    expect(api.contract.updateContract).toHaveBeenCalledWith(
      expect.objectContaining({ memo: null }),
    );
    const output = assertOutput(result.result, ContractUpdateOutputSchema);
    expect(output.updatedFields).toContain('memo');
  });

  test('uses mirror info when contract not in local state', async () => {
    MockedHelper.mockImplementation(() => ({
      getContract: jest.fn().mockReturnValue(undefined),
      saveContract: jest.fn(),
    }));
    const alias = makeAliasServiceMock();
    alias.list.mockReturnValue([]);

    const args = makeArgs({ ...api, alias }, logger, {
      contract: MOCK_CONTRACT_ID,
      memo: 'test memo',
    });

    const result = await contractUpdate(args);

    expect(api.mirror.getContractInfo).toHaveBeenCalledWith(MOCK_CONTRACT_ID);
    const output = assertOutput(result.result, ContractUpdateOutputSchema);
    expect(output.contractId).toBe(MOCK_CONTRACT_ID);
  });

  test('resolves contract by alias', async () => {
    const contract = makeContractData();
    MockedHelper.mockImplementation(() => ({
      getContract: jest.fn().mockReturnValue(contract),
      saveContract: jest.fn(),
    }));
    const alias = makeAliasServiceMock();
    alias.list.mockReturnValue([]);

    const args = makeArgs({ ...api, alias }, logger, {
      contract: 'my-contract',
      memo: 'updated via alias',
    });

    const result = await contractUpdate(args);

    expect(
      api.identityResolution.resolveReferenceToEntityOrEvmAddress,
    ).toHaveBeenCalledWith(
      expect.objectContaining({ entityReference: 'my-contract' }),
    );
    const output = assertOutput(result.result, ContractUpdateOutputSchema);
    expect(output.contractId).toBe(MOCK_CONTRACT_ID);
  });

  test('saves updated contract state after successful update', async () => {
    const contract = makeContractData({ memo: 'old memo' });
    const saveContractMock = jest.fn();
    MockedHelper.mockImplementation(() => ({
      getContract: jest.fn().mockReturnValue(contract),
      saveContract: saveContractMock,
    }));
    const alias = makeAliasServiceMock();
    alias.list.mockReturnValue([]);

    const args = makeArgs({ ...api, alias }, logger, {
      contract: MOCK_CONTRACT_ID,
      memo: 'updated memo',
    });

    await contractUpdate(args);

    expect(saveContractMock).toHaveBeenCalledWith(
      expectedStateKey,
      expect.objectContaining({
        contractId: MOCK_CONTRACT_ID,
        memo: 'updated memo',
      }),
    );
  });

  test('updates alias key refs when admin key changes', async () => {
    const contract = makeContractData();
    const saveContractMock = jest.fn();
    MockedHelper.mockImplementation(() => ({
      getContract: jest.fn().mockReturnValue(contract),
      saveContract: saveContractMock,
    }));

    const alias = makeAliasServiceMock();
    const existingAlias = {
      alias: 'my-contract',
      type: AliasType.Contract,
      network: SupportedNetwork.TESTNET,
      entityId: MOCK_CONTRACT_ID,
      keyRefId: STORED_CONTRACT_ADMIN_REF,
      createdAt: '2024-01-01T00:00:00.000Z',
    };
    alias.list.mockReturnValue([existingAlias]);

    api.keyResolver.resolveSigningKey = jest.fn().mockResolvedValue({
      keyRefId: NEW_ADMIN_KEY_REF,
      publicKey: ED25519_DER_PUBLIC_KEY,
    });

    const args = makeArgs({ ...api, alias }, logger, {
      contract: MOCK_CONTRACT_ID,
      newAdminKey: ['ed25519:public:' + ED25519_HEX_PUBLIC_KEY],
    });

    await contractUpdate(args);

    expect(alias.remove).toHaveBeenCalledWith(
      'my-contract',
      SupportedNetwork.TESTNET,
    );
    expect(alias.register).toHaveBeenCalledWith({
      ...existingAlias,
      keyRefId: NEW_ADMIN_KEY_REF,
    });
  });

  test('throws when no update fields are provided', async () => {
    MockedHelper.mockImplementation(() => ({
      getContract: jest.fn(),
      saveContract: jest.fn(),
    }));

    const args = makeArgs(api, logger, { contract: MOCK_CONTRACT_ID });

    await expect(contractUpdate(args)).rejects.toThrow();
  });

  test('throws ValidationError when contract is already deleted', async () => {
    MockedHelper.mockImplementation(() => ({
      getContract: jest.fn().mockReturnValue(undefined),
      saveContract: jest.fn(),
    }));

    api.mirror.getContractInfo = jest
      .fn()
      .mockResolvedValue(createMockContractInfo({ deleted: true }));

    const args = makeArgs(api, logger, {
      contract: MOCK_CONTRACT_ID,
      memo: 'test',
    });

    await expect(contractUpdate(args)).rejects.toThrow(ValidationError);
    await expect(contractUpdate(args)).rejects.toThrow(
      'This contract is already marked deleted on the network',
    );
  });

  test('throws ValidationError when contract has no admin key on Hedera', async () => {
    MockedHelper.mockImplementation(() => ({
      getContract: jest.fn().mockReturnValue(makeContractData()),
      saveContract: jest.fn(),
    }));

    api.mirror.getContractInfo = jest
      .fn()
      .mockResolvedValue(createMockContractInfo({ admin_key: undefined }));

    const args = makeArgs(api, logger, {
      contract: MOCK_CONTRACT_ID,
      memo: 'test',
    });

    await expect(contractUpdate(args)).rejects.toThrow(ValidationError);
    await expect(contractUpdate(args)).rejects.toThrow(
      'This contract has no admin key on Hedera',
    );
  });

  test('throws ValidationError when not enough admin keys found in KMS', async () => {
    MockedHelper.mockImplementation(() => ({
      getContract: jest.fn().mockReturnValue(makeContractData()),
      saveContract: jest.fn(),
    }));

    api.kms.findByPublicKey = jest.fn().mockReturnValue(undefined);

    const alias = makeAliasServiceMock();
    const args = makeArgs({ ...api, alias }, logger, {
      contract: MOCK_CONTRACT_ID,
      memo: 'test',
    });

    await expect(contractUpdate(args)).rejects.toThrow(ValidationError);
    await expect(contractUpdate(args)).rejects.toThrow(
      'Not enough admin key(s) found in key manager for this contract. Provide --admin-key.',
    );
  });

  test('throws ValidationError when new admin key has no private key in KMS', async () => {
    const contract = makeContractData();
    MockedHelper.mockImplementation(() => ({
      getContract: jest.fn().mockReturnValue(contract),
      saveContract: jest.fn(),
    }));
    const alias = makeAliasServiceMock();

    api.keyResolver.resolveSigningKeys = jest.fn().mockResolvedValue({
      keyRefIds: [STORED_CONTRACT_ADMIN_REF],
    });
    api.keyResolver.resolveSigningKey = jest
      .fn()
      .mockRejectedValue(
        new ValidationError('New admin key has no private key in KMS'),
      );

    const args = makeArgs({ ...api, alias }, logger, {
      contract: MOCK_CONTRACT_ID,
      newAdminKey: ['ed25519:public:' + ED25519_HEX_PUBLIC_KEY],
    });

    await expect(contractUpdate(args)).rejects.toThrow(ValidationError);
    await expect(contractUpdate(args)).rejects.toThrow(
      'New admin key has no private key in KMS',
    );
  });

  test('throws TransactionError when transaction execution fails', async () => {
    const contract = makeContractData();
    MockedHelper.mockImplementation(() => ({
      getContract: jest.fn().mockReturnValue(contract),
      saveContract: jest.fn(),
    }));
    const alias = makeAliasServiceMock();
    alias.list.mockReturnValue([]);

    api.txExecute.execute = jest.fn().mockResolvedValue({
      success: false,
      transactionId: MOCK_TX_ID,
    });

    const args = makeArgs({ ...api, alias }, logger, {
      contract: MOCK_CONTRACT_ID,
      memo: 'test',
    });

    await expect(contractUpdate(args)).rejects.toThrow(TransactionError);
  });

  test('throws NotFoundError when contract not found in mirror node', async () => {
    MockedHelper.mockImplementation(() => ({
      getContract: jest.fn().mockReturnValue(undefined),
      saveContract: jest.fn(),
    }));

    api.mirror.getContractInfo = jest
      .fn()
      .mockRejectedValue(
        new NotFoundError(`Contract ${MOCK_CONTRACT_ID_UNKNOWN} not found`),
      );

    const args = makeArgs(api, logger, {
      contract: MOCK_CONTRACT_ID,
      memo: 'test',
    });

    await expect(contractUpdate(args)).rejects.toThrow(NotFoundError);
  });

  test('throws NotFoundError when identity resolution fails for alias', async () => {
    MockedHelper.mockImplementation(() => ({
      getContract: jest.fn(),
      saveContract: jest.fn(),
    }));

    api.identityResolution.resolveReferenceToEntityOrEvmAddress = jest
      .fn()
      .mockImplementation(() => {
        throw new NotFoundError(
          'Alias "missing-alias" for contract on network "testnet" not found',
        );
      });

    const alias = makeAliasServiceMock();
    const args = makeArgs({ ...api, alias }, logger, {
      contract: 'missing-alias',
      memo: 'test',
    });

    await expect(contractUpdate(args)).rejects.toThrow(NotFoundError);
  });
});
