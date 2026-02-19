/**
 * Comprehensive Hedera Mirror Node Service Implementation
 * Makes actual HTTP calls to Hedera Mirror Node API
 */
import type { NetworkService } from '@/core/services/network/network-service.interface';
import type { HederaMirrornodeService } from './hedera-mirrornode-service.interface';
import type {
  AccountAPIResponse,
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
  MirrorNodeKeyType,
  NftInfo,
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

import { KeyAlgorithm } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';

import { NetworkToBaseUrl } from './types';

export class HederaMirrornodeServiceDefaultImpl implements HederaMirrornodeService {
  private readonly networkService: NetworkService;

  constructor(networkService: NetworkService) {
    this.networkService = networkService;
  }

  private getBaseUrl(): string {
    const network = this.networkService.getCurrentNetwork();
    if (!NetworkToBaseUrl.has(network)) {
      throw new Error(`Network type ${network} not supported`);
    }
    return NetworkToBaseUrl.get(network)!;
  }

  async getAccount(accountId: string): Promise<AccountResponse> {
    const url = `${this.getBaseUrl()}/accounts/${accountId}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch account ${accountId}: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as AccountAPIResponse;

    // Check if the response is empty (no account found)
    if (!data.account) {
      throw new Error(`Account ${accountId} not found`);
    }

    if (!data.key) {
      throw new Error('No key is associated with the specified account.');
    }

    const keyAlgorithm = this.getKeyAlgorithm(data.key._type);

    return {
      accountId: data.account,
      accountPublicKey: data.key.key,
      balance: data.balance,
      evmAddress: data.evm_address,
      keyAlgorithm,
    };
  }

  async getAccountHBarBalance(accountId: string): Promise<bigint> {
    let account;
    try {
      account = await this.getAccount(accountId);
    } catch (error) {
      throw Error(
        formatError(`Failed to fetch hbar balance for ${accountId}: `, error),
      );
    }
    return BigInt(account.balance.balance);
  }

  async getAccountTokenBalances(
    accountId: string,
    tokenId?: string,
  ): Promise<TokenBalancesResponse> {
    const tokenIdParam = tokenId ? `&token.id=${tokenId}` : '';
    const url = `${this.getBaseUrl()}/accounts/${accountId}/tokens?${tokenIdParam}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch balance for an account ${accountId}: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as TokenBalancesResponse;
    return data;
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
    let url: string | null = `${this.getBaseUrl()}/accounts?${queryString}`;
    const allAccounts: AccountListItemAPIResponse[] = [];
    let fetchedPages = 0;

    try {
      while (url) {
        fetchedPages += 1;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(
            `Failed to get accounts: ${response.status} ${response.statusText}`,
          );
        }

        const data = (await response.json()) as GetAccountsAPIResponse;

        allAccounts.push(...(data.accounts ?? []));
        if (fetchedPages >= 100) {
          break;
        }

        url = data.links?.next ? this.getBaseUrl() + data.links.next : null;
      }
    } catch (error) {
      console.error('Failed to fetch accounts. Error:', error);
      throw error;
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
    if (apiAccount.alias !== undefined) dto.alias = apiAccount.alias;
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
    const response = await fetch(
      `${this.getBaseUrl()}/topics/${queryParams.topicId}/messages/${queryParams.sequenceNumber}`,
    );

    return (await response.json()) as TopicMessage;
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
      `${this.getBaseUrl()}/topics/${queryParams.topicId}/messages?${allParams}`;
    const arrayOfMessages: TopicMessage[] = [];
    let fetchedMessages = 0;
    try {
      while (url) {
        // Results are paginated

        fetchedMessages += 1;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(
            `Failed to get topic messages for ${queryParams.topicId}: ${response.status} ${response.statusText}`,
          );
        }

        const data = (await response.json()) as TopicMessagesAPIResponse;

        arrayOfMessages.push(...data.messages);
        if (fetchedMessages >= 100) {
          break;
        }

        // Update URL for pagination.
        // This endpoint does not return a full path to the next page, it has to be built first
        url = data.links?.next ? this.getBaseUrl() + data.links.next : null;
      }
    } catch (error) {
      console.error(
        `Failed to fetch topic messages for ${queryParams.topicId}. Error:`,
        error,
      );
      throw error;
    }
    return {
      topicId: queryParams.topicId,
      messages: arrayOfMessages,
    };
  }

  async getTokenInfo(tokenId: string): Promise<TokenInfo> {
    const url = `${this.getBaseUrl()}/tokens/${tokenId}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Failed to get token info for a token ${tokenId}: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as TokenInfo;
    return data;
  }

  async getNftInfo(tokenId: string, serialNumber: number): Promise<NftInfo> {
    const url = `${this.getBaseUrl()}/tokens/${tokenId}/nfts/${serialNumber}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Failed to get NFT info for token ${tokenId} serial ${serialNumber}: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as NftInfo;
    return data;
  }

  async getTopicInfo(topicId: string): Promise<TopicInfo> {
    const url = `${this.getBaseUrl()}/topics/${topicId}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Failed to get topic info for ${topicId}: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as TopicInfo;
    return data;
  }

  async getTransactionRecord(
    transactionId: string,
    nonce?: number,
  ): Promise<TransactionDetailsResponse> {
    let url = `${this.getBaseUrl()}/transactions/${transactionId}`;
    if (nonce !== undefined) {
      url += `?nonce=${nonce}`;
    }

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Failed to get transaction record for ${transactionId}: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as TransactionDetailsResponse;
    return data;
  }

  async getContractInfo(contractId: string): Promise<ContractInfo> {
    const url = `${this.getBaseUrl()}/contracts/${contractId}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Failed to get contract info for ${contractId}: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as ContractInfo;
    return data;
  }

  async getPendingAirdrops(accountId: string): Promise<TokenAirdropsResponse> {
    const url = `${this.getBaseUrl()}/accounts/${accountId}/airdrops/pending`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch pending airdrops for an account ${accountId}: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as TokenAirdropsResponse;
    return data;
  }

  async getOutstandingAirdrops(
    accountId: string,
  ): Promise<TokenAirdropsResponse> {
    const url = `${this.getBaseUrl()}/accounts/${accountId}/airdrops/outstanding`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch outstanding airdrops for an account ${accountId}: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as TokenAirdropsResponse;
    return data;
  }

  async getExchangeRate(timestamp?: string): Promise<ExchangeRateResponse> {
    const timestampParam = timestamp
      ? `?timestamp=${encodeURIComponent(timestamp)}`
      : '';
    const url = `${this.getBaseUrl()}/network/exchangerate${timestampParam}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `HTTP error! status: ${response.status}. Message: ${response.statusText}`,
      );
    }
    const data = (await response.json()) as ExchangeRateResponse;
    return data;
  }

  async postContractCall(
    request: ContractCallRequest,
  ): Promise<ContractCallResponse> {
    const url = `${this.getBaseUrl()}/contracts/call`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to call contract via mirror node: ${response.status} ${response.statusText}`,
      );
    }

    return (await response.json()) as ContractCallResponse;
  }

  private getKeyAlgorithm(keyType: MirrorNodeKeyType): KeyAlgorithm {
    switch (keyType) {
      case 'ECDSA_SECP256K1':
        return KeyAlgorithm.ECDSA;
      case 'ED25519':
        return KeyAlgorithm.ED25519;
    }
  }
}
