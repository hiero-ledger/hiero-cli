import type { NetworkService } from '@/core/services/network/network-service.interface';
import type { HederaMirrornodeService } from './hedera-mirrornode-service.interface';
import type {
  AccountListItemAPIResponse,
  AccountListItemDto,
  AccountResponse,
  ContractCallRequest,
  ContractCallResponse,
  ContractInfo,
  ExchangeRateResponse,
  GetAccountsAPIResponse,
  GetAccountsQueryParams,
  GetAccountsResponse,
  NftInfo,
  ScheduleInfo,
  TokenAirdropsResponse,
  TokenBalancesResponse,
  TokenInfo,
  TopicInfo,
  TopicMessage,
  TopicMessageQueryParams,
  TopicMessagesAPIResponse,
  TopicMessagesQueryParams,
  TopicMessagesResponse,
  TransactionDetailsResponse,
} from './types';

import {
  CliError,
  ConfigurationError,
  NetworkError,
  NotFoundError,
} from '@/core/errors';
import { KeyAlgorithm } from '@/core/shared/constants';
import { parseWithSchema } from '@/core/shared/validation/parse-with-schema.zod';
import { handleMirrorNodeErrorResponse } from '@/core/utils/handle-mirror-node-error-response';

import {
  AccountAPIResponseSchema,
  ContractCallResponseSchema,
  ContractInfoSchema,
  ExchangeRateResponseSchema,
  GetAccountsAPIResponseSchema,
  NftInfoSchema,
  ScheduleInfoSchema,
  TokenAirdropsResponseSchema,
  TokenBalancesResponseSchema,
  TokenInfoSchema,
  TopicInfoSchema,
  TopicMessagesAPIResponseSchema,
  TopicMessageSchema,
  TransactionDetailsResponseSchema,
} from './schemas';
import { MirrorNodeKeyType, NetworkToBaseUrl } from './types';

export class HederaMirrornodeServiceDefaultImpl implements HederaMirrornodeService {
  private static readonly API_PATH = '/api/v1';

  private readonly networkService: NetworkService;

  constructor(networkService: NetworkService) {
    this.networkService = networkService;
  }

  private getBaseUrl(): string {
    const network = this.networkService.getCurrentNetwork();
    if (!NetworkToBaseUrl.has(network)) {
      throw new ConfigurationError(`Network type ${network} not supported`);
    }
    return NetworkToBaseUrl.get(network)!;
  }

  private getApiBaseUrl(): string {
    return `${this.getBaseUrl()}${HederaMirrornodeServiceDefaultImpl.API_PATH}`;
  }

  async getAccountOrThrow(accountId: string): Promise<AccountResponse> {
    const account = await this.getAccount(accountId);
    if (!account) {
      throw new NotFoundError(`Account ${accountId} not found`);
    }
    return account;
  }

  async getAccount(accountId: string): Promise<AccountResponse | null> {
    const url = `${this.getApiBaseUrl()}/accounts/${accountId}`;
    try {
      const response = await fetch(url);

      if (!response.ok) {
        await handleMirrorNodeErrorResponse(
          response,
          `Failed to fetch account ${accountId}`,
          false,
        );
        return null;
      }

      const data = parseWithSchema(
        AccountAPIResponseSchema,
        await response.json(),
        `Mirror Node GET /accounts/${accountId}`,
      );

      if (!data.account) {
        throw new NotFoundError(`Account ${accountId} not found`);
      }

      if (!data.key) {
        throw new NotFoundError(
          'No key is associated with the specified account.',
        );
      }

      return {
        accountId: data.account,
        accountPublicKey: data.key.key,
        balance: data.balance,
        evmAddress: data.evm_address,
        keyAlgorithm: this.getKeyAlgorithm(data.key._type),
      };
    } catch (error) {
      if (error instanceof CliError) throw error;
      throw new NetworkError(`Failed to fetch account ${accountId}`, {
        cause: error,
        recoverable: true,
      });
    }
  }

  async getAccountTokenBalances(
    accountId: string,
    tokenId?: string,
  ): Promise<TokenBalancesResponse> {
    const tokenIdParam = tokenId ? `&token.id=${tokenId}` : '';
    const url = `${this.getApiBaseUrl()}/accounts/${accountId}/tokens?${tokenIdParam}`;
    try {
      const response = await fetch(url);

      if (!response.ok) {
        await handleMirrorNodeErrorResponse(
          response,
          `Failed to fetch balance for an account ${accountId}`,
          true,
          `Account ${accountId} not found`,
        );
      }

      return parseWithSchema(
        TokenBalancesResponseSchema,
        await response.json(),
        `Mirror Node GET /accounts/${accountId}/tokens`,
      );
    } catch (error) {
      if (error instanceof CliError) throw error;
      throw new NetworkError(
        `Failed to fetch token balances for ${accountId}`,
        { cause: error, recoverable: true },
      );
    }
  }

  async getAccounts(
    queryParams?: GetAccountsQueryParams,
  ): Promise<GetAccountsResponse> {
    const params = queryParams ?? {};
    const queryParts: string[] = [];

    if (params.accountBalance) {
      queryParts.push(
        `account.balance=${params.accountBalance.operator}:${params.accountBalance.value}`,
      );
    }
    if (params.accountId) {
      queryParts.push(`account.id=${params.accountId}`);
    }
    if (params.accountPublicKey) {
      queryParts.push(`account.publickey=${params.accountPublicKey}`);
    }
    queryParts.push(`balance=${params.balance ?? false}`);
    queryParts.push(`limit=${params.limit ?? 25}`);
    queryParts.push(`order=${params.order ?? 'asc'}`);

    const queryString = queryParts.join('&');
    let url: string | null = `${this.getApiBaseUrl()}/accounts?${queryString}`;
    const allAccounts: AccountListItemAPIResponse[] = [];
    let fetchedPages = 0;
    while (url) {
      fetchedPages += 1;
      try {
        const response = await fetch(url);

        if (!response.ok) {
          await handleMirrorNodeErrorResponse(
            response,
            'Failed to get accounts',
            false,
          );
          break;
        }

        const pagePayload: GetAccountsAPIResponse = parseWithSchema(
          GetAccountsAPIResponseSchema,
          await response.json(),
          `Mirror Node GET /accounts (page ${fetchedPages})`,
        );

        allAccounts.push(...(pagePayload.accounts ?? []));
        if (fetchedPages >= 100) {
          break;
        }
        url = pagePayload.links?.next
          ? this.getBaseUrl() + pagePayload.links.next
          : null;
      } catch (error) {
        if (error instanceof CliError) throw error;
        throw new NetworkError(`Failed to fetch accounts`, {
          cause: error,
          recoverable: true,
        });
      }
    }

    const accounts: AccountListItemDto[] = allAccounts.map((a) =>
      this.mapAccountToDto(a),
    );
    return { accounts };
  }

  private mapAccountToDto(
    apiAccount: AccountListItemAPIResponse,
  ): AccountListItemDto {
    const dto: AccountListItemDto = {
      accountId: apiAccount.account,
      createdTimestamp: apiAccount.created_timestamp,
    };
    if (apiAccount.alias != null) dto.alias = apiAccount.alias;
    if (apiAccount.deleted !== undefined) dto.deleted = apiAccount.deleted;
    if (apiAccount.memo !== undefined) dto.memo = apiAccount.memo;
    if (apiAccount.evm_address !== undefined)
      dto.evmAddress = apiAccount.evm_address;

    if (apiAccount.balance) {
      dto.balance = {
        timestamp: apiAccount.balance.timestamp,
        balance: apiAccount.balance.balance,
      };
      if (apiAccount.balance.tokens) {
        dto.balance.tokens = apiAccount.balance.tokens.map((t) => ({
          tokenId: t.token_id,
          balance: t.balance,
        }));
      }
    }

    if (apiAccount.key && apiAccount.key.key) {
      dto.accountPublicKey = apiAccount.key.key;
      dto.keyAlgorithm = this.getKeyAlgorithm(apiAccount.key._type);
    }

    return dto;
  }

  async getTopicMessage(
    queryParams: TopicMessageQueryParams,
  ): Promise<TopicMessage> {
    const url = `${this.getApiBaseUrl()}/topics/${queryParams.topicId}/messages/${queryParams.sequenceNumber}`;
    try {
      const response = await fetch(url);

      if (!response.ok) {
        await handleMirrorNodeErrorResponse(
          response,
          `Failed to get topic message for ${queryParams.topicId}`,
          true,
          `Topic message ${queryParams.sequenceNumber} not found for topic ${queryParams.topicId}`,
        );
      }

      return parseWithSchema(
        TopicMessageSchema,
        await response.json(),
        `Mirror Node GET /topics/${queryParams.topicId}/messages/${queryParams.sequenceNumber}`,
      );
    } catch (error) {
      if (error instanceof CliError) throw error;
      throw new NetworkError(
        `Failed to fetch topic message for ${queryParams.topicId}`,
        { cause: error, recoverable: true },
      );
    }
  }

  async getTopicMessages(
    queryParams: TopicMessagesQueryParams,
  ): Promise<TopicMessagesResponse> {
    const { filters } = queryParams;

    const queryParamsArray = (filters || []).map(
      (f) => `${f.field}=${f.operation}:${f.value}`,
    );
    const filterParams =
      queryParamsArray.length > 0 ? queryParamsArray.join('&') : '';
    const baseParams = 'order=desc&limit=100';

    const allParams = filterParams
      ? `${filterParams}&${baseParams}`
      : baseParams;
    let url: string | null =
      `${this.getApiBaseUrl()}/topics/${queryParams.topicId}/messages?${allParams}`;
    const arrayOfMessages: TopicMessage[] = [];
    let fetchedMessages = 0;

    while (url) {
      fetchedMessages += 1;
      try {
        const response = await fetch(url);

        if (!response.ok) {
          await handleMirrorNodeErrorResponse(
            response,
            `Failed to get topic messages for ${queryParams.topicId}`,
            false,
          );
          break;
        }

        const pagePayload: TopicMessagesAPIResponse = parseWithSchema(
          TopicMessagesAPIResponseSchema,
          await response.json(),
          `Mirror Node GET /topics/${queryParams.topicId}/messages (page ${fetchedMessages})`,
        );
        arrayOfMessages.push(...pagePayload.messages);

        if (fetchedMessages >= 100) break;

        url = pagePayload.links?.next
          ? this.getBaseUrl() + pagePayload.links.next
          : null;
      } catch (error) {
        if (error instanceof CliError) throw error;
        throw new NetworkError(
          `Failed to fetch topic messages for ${queryParams.topicId}`,
          { cause: error, recoverable: true },
        );
      }
    }

    return {
      topicId: queryParams.topicId,
      messages: arrayOfMessages,
    };
  }

  async getTokenInfo(tokenId: string): Promise<TokenInfo> {
    const url = `${this.getApiBaseUrl()}/tokens/${tokenId}`;
    try {
      const response = await fetch(url);

      if (!response.ok) {
        await handleMirrorNodeErrorResponse(
          response,
          `Failed to get token info for a token ${tokenId}`,
          true,
          `Token ${tokenId} not found`,
        );
      }

      return parseWithSchema(
        TokenInfoSchema,
        await response.json(),
        `Mirror Node GET /tokens/${tokenId}`,
      );
    } catch (error) {
      if (error instanceof CliError) throw error;
      throw new NetworkError(`Failed to fetch token info for ${tokenId}`, {
        cause: error,
        recoverable: true,
      });
    }
  }

  async getScheduled(scheduleId: string): Promise<ScheduleInfo> {
    const url = `${this.getApiBaseUrl()}/schedules/${scheduleId}`;
    try {
      const response = await fetch(url);

      if (!response.ok) {
        await handleMirrorNodeErrorResponse(
          response,
          `Failed to get schedule for ${scheduleId}`,
          true,
          `Schedule ${scheduleId} not found`,
        );
      }

      return parseWithSchema(
        ScheduleInfoSchema,
        await response.json(),
        `Mirror Node GET /schedules/${scheduleId}`,
      );
    } catch (error) {
      if (error instanceof CliError) throw error;
      throw new NetworkError(`Failed to fetch schedule ${scheduleId}`, {
        cause: error,
        recoverable: true,
      });
    }
  }

  async getNftInfo(tokenId: string, serialNumber: number): Promise<NftInfo> {
    const url = `${this.getApiBaseUrl()}/tokens/${tokenId}/nfts/${serialNumber}`;
    try {
      const response = await fetch(url);

      if (!response.ok) {
        await handleMirrorNodeErrorResponse(
          response,
          `Failed to get NFT info for token ${tokenId} serial ${serialNumber}`,
          true,
          `NFT ${tokenId} serial ${serialNumber} not found`,
        );
      }

      return parseWithSchema(
        NftInfoSchema,
        await response.json(),
        `Mirror Node GET /tokens/${tokenId}/nfts/${serialNumber}`,
      );
    } catch (error) {
      if (error instanceof CliError) throw error;
      throw new NetworkError(
        `Failed to fetch NFT info for ${tokenId} serial ${serialNumber}`,
        { cause: error, recoverable: true },
      );
    }
  }

  async getTopicInfo(topicId: string): Promise<TopicInfo> {
    const url = `${this.getApiBaseUrl()}/topics/${topicId}`;
    try {
      const response = await fetch(url);

      if (!response.ok) {
        await handleMirrorNodeErrorResponse(
          response,
          `Failed to get topic info for ${topicId}`,
          true,
          `Topic ${topicId} not found`,
        );
      }

      return parseWithSchema(
        TopicInfoSchema,
        await response.json(),
        `Mirror Node GET /topics/${topicId}`,
      );
    } catch (error) {
      if (error instanceof CliError) throw error;
      throw new NetworkError(`Failed to fetch topic info for ${topicId}`, {
        cause: error,
        recoverable: true,
      });
    }
  }

  async getTransactionRecord(
    transactionId: string,
    nonce?: number,
  ): Promise<TransactionDetailsResponse> {
    let url = `${this.getApiBaseUrl()}/transactions/${transactionId}`;
    if (nonce !== undefined) {
      url += `?nonce=${nonce}`;
    }
    try {
      const response = await fetch(url);

      if (!response.ok) {
        await handleMirrorNodeErrorResponse(
          response,
          `Failed to get transaction record for ${transactionId}`,
          true,
          `Transaction ${transactionId} not found`,
        );
      }

      return parseWithSchema(
        TransactionDetailsResponseSchema,
        await response.json(),
        `Mirror Node GET /transactions/${transactionId}`,
      );
    } catch (error) {
      if (error instanceof CliError) throw error;
      throw new NetworkError(
        `Failed to fetch transaction record for ${transactionId}`,
        { cause: error, recoverable: true },
      );
    }
  }

  async getContractInfo(contractId: string): Promise<ContractInfo> {
    const url = `${this.getApiBaseUrl()}/contracts/${contractId}`;
    try {
      const response = await fetch(url);

      if (!response.ok) {
        await handleMirrorNodeErrorResponse(
          response,
          `Failed to get contract info for ${contractId}`,
          true,
          `Contract ${contractId} not found`,
        );
      }

      return parseWithSchema(
        ContractInfoSchema,
        await response.json(),
        `Mirror Node GET /contracts/${contractId}`,
      );
    } catch (error) {
      if (error instanceof CliError) throw error;
      throw new NetworkError(
        `Failed to fetch contract info for ${contractId}`,
        { cause: error, recoverable: true },
      );
    }
  }

  async getPendingAirdrops(accountId: string): Promise<TokenAirdropsResponse> {
    const url = `${this.getApiBaseUrl()}/accounts/${accountId}/airdrops/pending`;
    try {
      const response = await fetch(url);

      if (!response.ok) {
        await handleMirrorNodeErrorResponse(
          response,
          `Failed to fetch pending airdrops for an account ${accountId}`,
          true,
          `Account ${accountId} not found`,
        );
      }

      return parseWithSchema(
        TokenAirdropsResponseSchema,
        await response.json(),
        `Mirror Node GET /accounts/${accountId}/airdrops/pending`,
      );
    } catch (error) {
      if (error instanceof CliError) throw error;
      throw new NetworkError(
        `Failed to fetch pending airdrops for ${accountId}`,
        { cause: error, recoverable: true },
      );
    }
  }

  async getOutstandingAirdrops(
    accountId: string,
  ): Promise<TokenAirdropsResponse> {
    const url = `${this.getApiBaseUrl()}/accounts/${accountId}/airdrops/outstanding`;
    try {
      const response = await fetch(url);

      if (!response.ok) {
        await handleMirrorNodeErrorResponse(
          response,
          `Failed to fetch outstanding airdrops for an account ${accountId}`,
          true,
          `Account ${accountId} not found`,
        );
      }

      return parseWithSchema(
        TokenAirdropsResponseSchema,
        await response.json(),
        `Mirror Node GET /accounts/${accountId}/airdrops/outstanding`,
      );
    } catch (error) {
      if (error instanceof CliError) throw error;
      throw new NetworkError(
        `Failed to fetch outstanding airdrops for ${accountId}`,
        { cause: error, recoverable: true },
      );
    }
  }

  async getExchangeRate(timestamp?: string): Promise<ExchangeRateResponse> {
    const timestampParam = timestamp
      ? `?timestamp=${encodeURIComponent(timestamp)}`
      : '';
    const url = `${this.getApiBaseUrl()}/network/exchangerate${timestampParam}`;
    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new NetworkError(
          `HTTP error! status: ${response.status}. Message: ${response.statusText}`,
          { recoverable: true },
        );
      }

      return parseWithSchema(
        ExchangeRateResponseSchema,
        await response.json(),
        'Mirror Node GET /network/exchangerate',
      );
    } catch (error) {
      if (error instanceof CliError) throw error;
      throw new NetworkError('Failed to fetch exchange rate', {
        cause: error,
        recoverable: true,
      });
    }
  }

  async postContractCall(
    request: ContractCallRequest,
  ): Promise<ContractCallResponse> {
    const url = `${this.getApiBaseUrl()}/contracts/call`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new NetworkError(
          `Failed to call contract via mirror node: ${response.status} ${response.statusText}`,
          { recoverable: true },
        );
      }

      return parseWithSchema(
        ContractCallResponseSchema,
        await response.json(),
        'Mirror Node POST /contracts/call',
      );
    } catch (error) {
      if (error instanceof CliError) throw error;
      throw new NetworkError('Failed to call contract via mirror node', {
        cause: error,
        recoverable: true,
      });
    }
  }

  private getKeyAlgorithm(keyType: MirrorNodeKeyType): KeyAlgorithm {
    switch (keyType) {
      case MirrorNodeKeyType.ECDSA_SECP256K1:
        return KeyAlgorithm.ECDSA;
      case MirrorNodeKeyType.ED25519:
        return KeyAlgorithm.ED25519;
    }
  }
}
