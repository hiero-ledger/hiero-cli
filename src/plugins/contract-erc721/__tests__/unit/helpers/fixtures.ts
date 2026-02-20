import type { CoreApi, Logger } from '@/core';

export const MOCK_CONTRACT_ID_ALT = '0.0.9999';
export const MOCK_ACCOUNT_ID_FROM = '0.0.1111';
export const MOCK_ACCOUNT_ID_TO = '0.0.8888';

/**
 * Factory function to create CommandHandlerArgs for contract erc721 call tests
 */
export const makeContractErc721CallCommandArgs = (params: {
  api: Partial<CoreApi>;
  logger: Logger;
  args?: Record<string, unknown>;
}) => {
  const api = params.api as unknown as CoreApi;
  return {
    args: {
      contract: 'some-alias-or-id',
      ...params.args,
    },
    api,
    state: api.state,
    config: api.config,
    logger: params.logger,
  };
};

/**
 * Factory function to create CommandHandlerArgs for contract erc721 execute (state change) tests
 */
export const makeContractErc721ExecuteCommandArgs = (params: {
  api: Partial<CoreApi>;
  logger: Logger;
  args?: Record<string, unknown>;
}) => {
  const api = params.api as unknown as CoreApi;
  return {
    args: {
      contract: 'some-alias-or-id',
      gas: 1000000,
      ...params.args,
    },
    api,
    state: api.state,
    config: api.config,
    logger: params.logger,
  };
};
