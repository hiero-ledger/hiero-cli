import type { NetworkService } from '@/core/services/network/network-service.interface';
import type { HederaMirrornodeService } from './hedera-mirrornode-service.interface';
import type {
  AccountAPIResponse,
  AccountResponse,
  ContractCallRequest,
  ContractCallResponse,
  ContractInfo,
  ExchangeRateResponse,
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

import { ConfigurationError, NetworkError, NotFoundError } from '@/core/errors';
import { KeyAlgorithm } from '@/core/shared/constants';

import { NetworkToBaseUrl } from './types';

export class HederaMirrornodeServiceDefaultImpl implements HederaMirrornodeService {
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

  async getAccount(accountId: string): Promise<AccountResponse> {
    const url = `${this.getBaseUrl()}/accounts/${accountId}`;
    try {
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 404) {
          throw new NotFoundError(`Account ${accountId} not found`);
        }
        throw new NetworkError(
          `Failed to fetch account ${accountId}: ${response.status} ${response.statusText}`,
          { recoverable: true },
        );
      }

      const data = (await response.json()) as AccountAPIResponse;

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
      if (error instanceof NotFoundError || error instanceof NetworkError)
        throw error;
      throw new NetworkError(`Failed to fetch account ${accountId}`, {
        cause: error,
        recoverable: true,
      });
    }
  }

  async getAccountHBarBalance(accountId: string): Promise<bigint> {
    const account = await this.getAccount(accountId);
    return BigInt(account.balance.balance);
  }

  async getAccountTokenBalances(
    accountId: string,
    tokenId?: string,
  ): Promise<TokenBalancesResponse> {
    const tokenIdParam = tokenId ? `&token.id=${tokenId}` : '';
    const url = `${this.getBaseUrl()}/accounts/${accountId}/tokens?${tokenIdParam}`;
    try {
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 404) {
          throw new NotFoundError(`Account ${accountId} not found`);
        }
        throw new NetworkError(
          `Failed to fetch balance for an account ${accountId}: ${response.status} ${response.statusText}`,
          { recoverable: true },
        );
      }

      return (await response.json()) as TokenBalancesResponse;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof NetworkError)
        throw error;
      throw new NetworkError(
        `Failed to fetch token balances for ${accountId}`,
        { cause: error, recoverable: true },
      );
    }
  }

  async getTopicMessage(
    queryParams: TopicMessageQueryParams,
  ): Promise<TopicMessage> {
    const url = `${this.getBaseUrl()}/topics/${queryParams.topicId}/messages/${queryParams.sequenceNumber}`;
    try {
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 404) {
          throw new NotFoundError(
            `Topic message ${queryParams.sequenceNumber} not found for topic ${queryParams.topicId}`,
          );
        }
        throw new NetworkError(
          `Failed to get topic message for ${queryParams.topicId}: ${response.status} ${response.statusText}`,
          { recoverable: true },
        );
      }

      return (await response.json()) as TopicMessage;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof NetworkError)
        throw error;
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
      `${this.getBaseUrl()}/topics/${queryParams.topicId}/messages?${allParams}`;
    const arrayOfMessages: TopicMessage[] = [];
    let fetchedMessages = 0;

    while (url) {
      fetchedMessages += 1;
      try {
        const response = await fetch(url);

        if (!response.ok) {
          throw new NetworkError(
            `Failed to get topic messages for ${queryParams.topicId}: ${response.status} ${response.statusText}`,
            { recoverable: true },
          );
        }

        const data = (await response.json()) as TopicMessagesAPIResponse;
        arrayOfMessages.push(...data.messages);

        if (fetchedMessages >= 100) break;

        url = data.links?.next ? this.getBaseUrl() + data.links.next : null;
      } catch (error) {
        if (error instanceof NetworkError) throw error;
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
    const url = `${this.getBaseUrl()}/tokens/${tokenId}`;
    try {
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 404) {
          throw new NotFoundError(`Token ${tokenId} not found`);
        }
        throw new NetworkError(
          `Failed to get token info for a token ${tokenId}: ${response.status} ${response.statusText}`,
          { recoverable: true },
        );
      }

      return (await response.json()) as TokenInfo;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof NetworkError)
        throw error;
      throw new NetworkError(`Failed to fetch token info for ${tokenId}`, {
        cause: error,
        recoverable: true,
      });
    }
  }

  async getNftInfo(tokenId: string, serialNumber: number): Promise<NftInfo> {
    const url = `${this.getBaseUrl()}/tokens/${tokenId}/nfts/${serialNumber}`;
    try {
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 404) {
          throw new NotFoundError(
            `NFT ${tokenId} serial ${serialNumber} not found`,
          );
        }
        throw new NetworkError(
          `Failed to get NFT info for token ${tokenId} serial ${serialNumber}: ${response.status} ${response.statusText}`,
          { recoverable: true },
        );
      }

      return (await response.json()) as NftInfo;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof NetworkError)
        throw error;
      throw new NetworkError(
        `Failed to fetch NFT info for ${tokenId} serial ${serialNumber}`,
        { cause: error, recoverable: true },
      );
    }
  }

  async getTopicInfo(topicId: string): Promise<TopicInfo> {
    const url = `${this.getBaseUrl()}/topics/${topicId}`;
    try {
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 404) {
          throw new NotFoundError(`Topic ${topicId} not found`);
        }
        throw new NetworkError(
          `Failed to get topic info for ${topicId}: ${response.status} ${response.statusText}`,
          { recoverable: true },
        );
      }

      return (await response.json()) as TopicInfo;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof NetworkError)
        throw error;
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
    let url = `${this.getBaseUrl()}/transactions/${transactionId}`;
    if (nonce !== undefined) {
      url += `?nonce=${nonce}`;
    }
    try {
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 404) {
          throw new NotFoundError(`Transaction ${transactionId} not found`);
        }
        throw new NetworkError(
          `Failed to get transaction record for ${transactionId}: ${response.status} ${response.statusText}`,
          { recoverable: true },
        );
      }

      return (await response.json()) as TransactionDetailsResponse;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof NetworkError)
        throw error;
      throw new NetworkError(
        `Failed to fetch transaction record for ${transactionId}`,
        { cause: error, recoverable: true },
      );
    }
  }

  async getContractInfo(contractId: string): Promise<ContractInfo> {
    const url = `${this.getBaseUrl()}/contracts/${contractId}`;
    try {
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 404) {
          throw new NotFoundError(`Contract ${contractId} not found`);
        }
        throw new NetworkError(
          `Failed to get contract info for ${contractId}: ${response.status} ${response.statusText}`,
          { recoverable: true },
        );
      }

      return (await response.json()) as ContractInfo;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof NetworkError)
        throw error;
      throw new NetworkError(
        `Failed to fetch contract info for ${contractId}`,
        { cause: error, recoverable: true },
      );
    }
  }

  async getPendingAirdrops(accountId: string): Promise<TokenAirdropsResponse> {
    const url = `${this.getBaseUrl()}/accounts/${accountId}/airdrops/pending`;
    try {
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 404) {
          throw new NotFoundError(`Account ${accountId} not found`);
        }
        throw new NetworkError(
          `Failed to fetch pending airdrops for an account ${accountId}: ${response.status} ${response.statusText}`,
          { recoverable: true },
        );
      }

      return (await response.json()) as TokenAirdropsResponse;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof NetworkError)
        throw error;
      throw new NetworkError(
        `Failed to fetch pending airdrops for ${accountId}`,
        { cause: error, recoverable: true },
      );
    }
  }

  async getOutstandingAirdrops(
    accountId: string,
  ): Promise<TokenAirdropsResponse> {
    const url = `${this.getBaseUrl()}/accounts/${accountId}/airdrops/outstanding`;
    try {
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 404) {
          throw new NotFoundError(`Account ${accountId} not found`);
        }
        throw new NetworkError(
          `Failed to fetch outstanding airdrops for an account ${accountId}: ${response.status} ${response.statusText}`,
          { recoverable: true },
        );
      }

      return (await response.json()) as TokenAirdropsResponse;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof NetworkError)
        throw error;
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
    const url = `${this.getBaseUrl()}/network/exchangerate${timestampParam}`;
    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new NetworkError(
          `HTTP error! status: ${response.status}. Message: ${response.statusText}`,
          { recoverable: true },
        );
      }

      return (await response.json()) as ExchangeRateResponse;
    } catch (error) {
      if (error instanceof NetworkError) throw error;
      throw new NetworkError('Failed to fetch exchange rate', {
        cause: error,
        recoverable: true,
      });
    }
  }

  async postContractCall(
    request: ContractCallRequest,
  ): Promise<ContractCallResponse> {
    const url = `${this.getBaseUrl()}/contracts/call`;
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

      return (await response.json()) as ContractCallResponse;
    } catch (error) {
      if (error instanceof NetworkError) throw error;
      throw new NetworkError('Failed to call contract via mirror node', {
        cause: error,
        recoverable: true,
      });
    }
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
