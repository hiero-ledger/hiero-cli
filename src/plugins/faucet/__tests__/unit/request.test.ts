import {
  MOCK_ACCOUNT_ID,
  MOCK_EVM_ADDRESS,
  MOCK_TX_ID,
} from '@/__tests__/mocks/fixtures';
import {
  makeArgs,
  makeNetworkMock,
  makeStateMock,
} from '@/__tests__/mocks/mocks';
import { assertOutput } from '@/__tests__/utils/assert-output';
import { ConfigurationError } from '@/core/errors/configuration-error';
import { NetworkError } from '@/core/errors/network-error';
import { ValidationError } from '@/core/errors/validation-error';
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import { SupportedNetwork } from '@/core/types/shared.types';
import {
  faucetRequest,
  FaucetRequestOutputSchema,
} from '@/plugins/faucet/commands/request';
import {
  FAUCET_STATE_KEY_LAST_DISBURSEMENT,
  FAUCET_STATE_NAMESPACE,
} from '@/plugins/faucet/constants';

import {
  successResponseFixture,
  VALID_ALIAS,
  VALID_PAT,
} from './helpers/fixtures';
import {
  makeFaucetConfigMock,
  makeFaucetIdentityResolutionMock,
} from './helpers/mocks';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function makeFetchResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe('faucet plugin - request', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  test('sends HBAR to account ID and returns output', async () => {
    mockFetch.mockResolvedValue(makeFetchResponse(successResponseFixture));
    const args = makeArgs(
      {
        config: makeFaucetConfigMock(),
        identityResolution: makeFaucetIdentityResolutionMock(),
      },
      { recipient: MOCK_ACCOUNT_ID },
    );

    const result = await faucetRequest(args);

    const output = assertOutput(result.result, FaucetRequestOutputSchema);
    expect(output.recipient).toBe(MOCK_ACCOUNT_ID);
    expect(output.amount).toBe(100);
    expect(output.transactionId).toBe(MOCK_TX_ID);
    expect(output.network).toBe(SupportedNetwork.TESTNET);
    expect(output.quotaUsed).toBe(100);
    expect(output.quotaRemaining).toBe(0);
  });

  test('sends correct request body to faucet API', async () => {
    mockFetch.mockResolvedValue(makeFetchResponse(successResponseFixture));
    const args = makeArgs(
      {
        config: makeFaucetConfigMock(),
        identityResolution: makeFaucetIdentityResolutionMock(),
      },
      { recipient: MOCK_ACCOUNT_ID, amount: 50 },
    );

    await faucetRequest(args);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://portal.hedera.com/api/disbursement/cli',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: `Bearer ${VALID_PAT}`,
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          address: MOCK_ACCOUNT_ID,
          amount: 50,
          network: SupportedNetwork.TESTNET,
        }),
      }),
    );
  });

  test('defaults amount to 100 when not provided', async () => {
    mockFetch.mockResolvedValue(makeFetchResponse(successResponseFixture));
    const args = makeArgs(
      {
        config: makeFaucetConfigMock(),
        identityResolution: makeFaucetIdentityResolutionMock(),
      },
      { recipient: MOCK_ACCOUNT_ID },
    );

    await faucetRequest(args);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.amount).toBe(100);
  });

  test('accepts EVM address as recipient', async () => {
    mockFetch.mockResolvedValue(makeFetchResponse(successResponseFixture));
    const args = makeArgs(
      {
        config: makeFaucetConfigMock(),
        identityResolution: makeFaucetIdentityResolutionMock(),
      },
      { recipient: MOCK_EVM_ADDRESS },
    );

    await faucetRequest(args);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.address).toBe(MOCK_EVM_ADDRESS);
  });

  test('throws ConfigurationError when PAT is not set', async () => {
    const configMock = makeFaucetConfigMock();
    configMock.getOption.mockReturnValue('');
    const args = makeArgs(
      {
        config: configMock,
        identityResolution: makeFaucetIdentityResolutionMock(),
      },
      { recipient: MOCK_ACCOUNT_ID },
    );

    await expect(faucetRequest(args)).rejects.toThrow(ConfigurationError);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  test('throws ValidationError when network is mainnet', async () => {
    const args = makeArgs(
      {
        config: makeFaucetConfigMock(),
        identityResolution: makeFaucetIdentityResolutionMock(),
        network: makeNetworkMock(SupportedNetwork.MAINNET),
      },
      { recipient: MOCK_ACCOUNT_ID },
    );

    await expect(faucetRequest(args)).rejects.toThrow(ValidationError);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  test('throws ValidationError when network is localnet', async () => {
    const args = makeArgs(
      {
        config: makeFaucetConfigMock(),
        identityResolution: makeFaucetIdentityResolutionMock(),
        network: makeNetworkMock(SupportedNetwork.LOCALNET),
      },
      { recipient: MOCK_ACCOUNT_ID },
    );

    await expect(faucetRequest(args)).rejects.toThrow(ValidationError);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  test('works on previewnet', async () => {
    mockFetch.mockResolvedValue(makeFetchResponse(successResponseFixture));
    const args = makeArgs(
      {
        config: makeFaucetConfigMock(),
        identityResolution: makeFaucetIdentityResolutionMock(),
        network: makeNetworkMock(SupportedNetwork.PREVIEWNET),
      },
      { recipient: MOCK_ACCOUNT_ID },
    );

    const result = await faucetRequest(args);

    const output = assertOutput(result.result, FaucetRequestOutputSchema);
    expect(output.network).toBe(SupportedNetwork.PREVIEWNET);
  });

  test('throws ConfigurationError on 403 response', async () => {
    mockFetch.mockResolvedValue(
      makeFetchResponse({ message: 'Unauthorized' }, 403),
    );
    const args = makeArgs(
      {
        config: makeFaucetConfigMock(),
        identityResolution: makeFaucetIdentityResolutionMock(),
      },
      { recipient: MOCK_ACCOUNT_ID },
    );

    await expect(faucetRequest(args)).rejects.toThrow(ConfigurationError);
  });

  test('throws ValidationError on 422 response', async () => {
    mockFetch.mockResolvedValue(
      makeFetchResponse({ message: 'Unprocessable' }, 422),
    );
    const args = makeArgs(
      {
        config: makeFaucetConfigMock(),
        identityResolution: makeFaucetIdentityResolutionMock(),
      },
      { recipient: MOCK_ACCOUNT_ID },
    );

    await expect(faucetRequest(args)).rejects.toThrow(ValidationError);
  });

  test('throws NetworkError on 429 response', async () => {
    mockFetch.mockResolvedValue(
      makeFetchResponse({ message: 'Too Many Requests' }, 429),
    );
    const args = makeArgs(
      {
        config: makeFaucetConfigMock(),
        identityResolution: makeFaucetIdentityResolutionMock(),
      },
      { recipient: MOCK_ACCOUNT_ID },
    );

    await expect(faucetRequest(args)).rejects.toThrow(NetworkError);
  });

  test('includes reset time in 429 error when last disbursement is stored', async () => {
    mockFetch.mockResolvedValue(
      makeFetchResponse({ message: 'Too Many Requests' }, 429),
    );
    const FIXED_NOW = 1_000_000_000;
    jest.spyOn(Date, 'now').mockReturnValue(FIXED_NOW);
    const lastDisbursementAt = FIXED_NOW - 2 * 60 * 60 * 1000;
    const stateMock = makeStateMock();
    stateMock.get.mockReturnValue(lastDisbursementAt);
    const args = makeArgs(
      {
        config: makeFaucetConfigMock(),
        identityResolution: makeFaucetIdentityResolutionMock(),
        state: stateMock,
      },
      { recipient: MOCK_ACCOUNT_ID },
    );

    await expect(faucetRequest(args)).rejects.toThrow('Available in 22h 0m.');

    jest.restoreAllMocks();
  });

  test('omits reset time in 429 error when quota window has already reset', async () => {
    mockFetch.mockResolvedValue(
      makeFetchResponse({ message: 'Too Many Requests' }, 429),
    );
    const FIXED_NOW = 1_000_000_000;
    jest.spyOn(Date, 'now').mockReturnValue(FIXED_NOW);
    const lastDisbursementAt = FIXED_NOW - 25 * 60 * 60 * 1000;
    const stateMock = makeStateMock();
    stateMock.get.mockReturnValue(lastDisbursementAt);
    const args = makeArgs(
      {
        config: makeFaucetConfigMock(),
        identityResolution: makeFaucetIdentityResolutionMock(),
        state: stateMock,
      },
      { recipient: MOCK_ACCOUNT_ID },
    );

    await expect(faucetRequest(args)).rejects.toThrow(
      'Daily faucet quota exhausted. You can request up to 100 HBAR per 24 hours.',
    );
    await expect(faucetRequest(args)).rejects.not.toThrow('Available in');

    jest.restoreAllMocks();
  });

  test('shows only minutes in reset time when less than one hour remains', async () => {
    mockFetch.mockResolvedValue(
      makeFetchResponse({ message: 'Too Many Requests' }, 429),
    );
    const FIXED_NOW = 1_000_000_000;
    jest.spyOn(Date, 'now').mockReturnValue(FIXED_NOW);
    const lastDisbursementAt = FIXED_NOW - 23 * 60 * 60 * 1000 - 30 * 60 * 1000;
    const stateMock = makeStateMock();
    stateMock.get.mockReturnValue(lastDisbursementAt);
    const args = makeArgs(
      {
        config: makeFaucetConfigMock(),
        identityResolution: makeFaucetIdentityResolutionMock(),
        state: stateMock,
      },
      { recipient: MOCK_ACCOUNT_ID },
    );

    await expect(faucetRequest(args)).rejects.toThrow('Available in 30m.');

    jest.restoreAllMocks();
  });

  test('saves disbursement timestamp to state on success', async () => {
    mockFetch.mockResolvedValue(makeFetchResponse(successResponseFixture));
    const stateMock = makeStateMock();
    const args = makeArgs(
      {
        config: makeFaucetConfigMock(),
        identityResolution: makeFaucetIdentityResolutionMock(),
        state: stateMock,
      },
      { recipient: MOCK_ACCOUNT_ID },
    );

    await faucetRequest(args);

    expect(stateMock.set).toHaveBeenCalledWith(
      FAUCET_STATE_NAMESPACE,
      FAUCET_STATE_KEY_LAST_DISBURSEMENT,
      expect.any(Number),
    );
  });

  test('throws NetworkError on 500 response', async () => {
    mockFetch.mockResolvedValue(
      makeFetchResponse({ message: 'Internal Server Error' }, 500),
    );
    const args = makeArgs(
      {
        config: makeFaucetConfigMock(),
        identityResolution: makeFaucetIdentityResolutionMock(),
      },
      { recipient: MOCK_ACCOUNT_ID },
    );

    await expect(faucetRequest(args)).rejects.toThrow(NetworkError);
  });

  test('rejects amount below 1', async () => {
    const args = makeArgs(
      {
        config: makeFaucetConfigMock(),
        identityResolution: makeFaucetIdentityResolutionMock(),
      },
      { recipient: MOCK_ACCOUNT_ID, amount: 0 },
    );

    await expect(faucetRequest(args)).rejects.toThrow();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  test('rejects amount above 100', async () => {
    const args = makeArgs(
      {
        config: makeFaucetConfigMock(),
        identityResolution: makeFaucetIdentityResolutionMock(),
      },
      { recipient: MOCK_ACCOUNT_ID, amount: 101 },
    );

    await expect(faucetRequest(args)).rejects.toThrow();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  test('uses portal_pat config key', async () => {
    mockFetch.mockResolvedValue(makeFetchResponse(successResponseFixture));
    const configMock = makeFaucetConfigMock();
    const args = makeArgs(
      {
        config: configMock,
        identityResolution: makeFaucetIdentityResolutionMock(),
      },
      { recipient: MOCK_ACCOUNT_ID },
    );

    await faucetRequest(args);

    expect(configMock.getOption).toHaveBeenCalledWith(
      ConfigOptionKey.portal_pat,
    );
  });

  test('resolves alias to account ID before calling faucet API', async () => {
    mockFetch.mockResolvedValue(makeFetchResponse(successResponseFixture));
    const identityResolutionMock = makeFaucetIdentityResolutionMock();
    identityResolutionMock.resolveReferenceToEntityOrEvmAddress.mockReturnValue(
      { entityIdOrEvmAddress: MOCK_ACCOUNT_ID },
    );
    const args = makeArgs(
      {
        config: makeFaucetConfigMock(),
        identityResolution: identityResolutionMock,
      },
      { recipient: VALID_ALIAS },
    );

    const result = await faucetRequest(args);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.address).toBe(MOCK_ACCOUNT_ID);
    const output = assertOutput(result.result, FaucetRequestOutputSchema);
    expect(output.recipient).toBe(MOCK_ACCOUNT_ID);
  });
});
