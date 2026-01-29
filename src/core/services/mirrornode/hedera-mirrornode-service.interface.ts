/**
 * Comprehensive Hedera Mirror Node Service Interface
 * Provides access to all Hedera Mirror Node API endpoints
 */
import type {
  AccountResponse,
  ContractCallRequest,
  ContractCallResponse,
  ContractInfo,
  ExchangeRateResponse,
  NftInfo,
  TokenAirdropsResponse,
  TokenBalancesResponse,
  TokenInfo,
  TopicInfo,
  TopicMessage,
  TopicMessageQueryParams,
  TopicMessagesQueryParams,
  TopicMessagesResponse,
  TransactionDetailsResponse,
} from './types';

export interface HederaMirrornodeService {
  /**
   * Get account information
   */
  getAccount(accountId: string): Promise<AccountResponse>;

  /**
   * Get account HBAR balance
   */
  getAccountHBarBalance(accountId: string): Promise<bigint>;

  /**
   * Get account token balances
   */
  getAccountTokenBalances(
    accountId: string,
    tokenId?: string,
  ): Promise<TokenBalancesResponse>;

  /**
   * Get topic messages with pagination support
   */
  getTopicMessage(queryParams: TopicMessageQueryParams): Promise<TopicMessage>;

  /**
   * Get topic messages with pagination support
   */
  getTopicMessages(
    queryParams: TopicMessagesQueryParams,
  ): Promise<TopicMessagesResponse>;

  /**
   * Get token information
   */
  getTokenInfo(tokenId: string): Promise<TokenInfo>;

  /**
   * Get NFT information by token ID and serial number
   */
  getNftInfo(tokenId: string, serialNumber: number): Promise<NftInfo>;

  /**
   * Get topic information
   */
  getTopicInfo(topicId: string): Promise<TopicInfo>;

  /**
   * Get transaction record
   */
  getTransactionRecord(
    transactionId: string,
    nonce?: number,
  ): Promise<TransactionDetailsResponse>;

  /**
   * Get contract information
   */
  getContractInfo(contractId: string): Promise<ContractInfo>;

  /**
   * Get pending airdrops for an account
   */
  getPendingAirdrops(accountId: string): Promise<TokenAirdropsResponse>;

  /**
   * Get outstanding airdrops for an account
   */
  getOutstandingAirdrops(accountId: string): Promise<TokenAirdropsResponse>;

  /**
   * Get exchange rate
   */
  getExchangeRate(timestamp?: string): Promise<ExchangeRateResponse>;

  /**
   * Execute a smart contract call via the Mirror Node.
   *
   * Wraps POST /api/v1/contracts/call.
   */
  postContractCall(request: ContractCallRequest): Promise<ContractCallResponse>;
}
