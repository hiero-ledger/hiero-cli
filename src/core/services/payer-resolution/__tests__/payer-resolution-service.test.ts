import {
  makeConfigMock,
  makeKeyResolverMock,
  makeLogger,
  makeNetworkMock,
} from '@/__tests__/mocks/mocks';
import { KeyManager } from '@/core/services/kms/kms-types.interface';
import { PayerResolutionServiceImpl } from '@/core/services/payer-resolution/payer-resolution-service';
import { SupportedNetwork } from '@/core/types/shared.types';

describe('PayerResolutionServiceImpl', () => {
  test('resolves payer and sets it on the network service', async () => {
    const network = makeNetworkMock(SupportedNetwork.TESTNET);
    const config = makeConfigMock();
    const logger = makeLogger();
    const resolvedPayer = {
      accountId: '0.0.1234',
      keyRefId: 'kr-1',
      publicKey: 'pk-1',
    };
    const keyResolver = makeKeyResolverMock();
    keyResolver.resolveAccountCredentials = jest
      .fn()
      .mockResolvedValue(resolvedPayer);

    const service = new PayerResolutionServiceImpl(
      keyResolver,
      network,
      config,
      logger,
    );

    await service.resolvePayer('0.0.1234:ed25519:private:abcdef');

    expect(keyResolver.resolveAccountCredentials).toHaveBeenCalledWith(
      expect.anything(),
      KeyManager.local,
      false,
      ['payer:override'],
    );
    expect(network.setPayer).toHaveBeenCalledWith(resolvedPayer);
    expect(logger.debug).toHaveBeenCalledWith(
      `[CLI] Resolved payer: ${resolvedPayer.accountId}`,
    );
  });

  test('falls back to KeyManager.local when config has no default', async () => {
    const network = makeNetworkMock(SupportedNetwork.TESTNET);
    const config = makeConfigMock();
    config.getOption = jest.fn().mockReturnValue(undefined);
    const logger = makeLogger();
    const keyResolver = makeKeyResolverMock();
    keyResolver.resolveAccountCredentials = jest.fn().mockResolvedValue({
      accountId: '0.0.1',
      keyRefId: 'k',
      publicKey: 'p',
    });

    const service = new PayerResolutionServiceImpl(
      keyResolver,
      network,
      config,
      logger,
    );

    await service.resolvePayer('0.0.1:ed25519:private:abc');

    expect(keyResolver.resolveAccountCredentials).toHaveBeenCalledWith(
      expect.anything(),
      KeyManager.local,
      false,
      ['payer:override'],
    );
  });
});
