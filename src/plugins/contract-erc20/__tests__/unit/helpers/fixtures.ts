import type { CoreApi, Logger } from '@/core';

/**
 * Factory function to create CommandHandlerArgs for contract erc20 call tests
 */
export const makeContractErc20CallCommandArgs = (params: {
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
 * Factory function to create CommandHandlerArgs for contract erc20 execute (state change) tests
 */
export const makeContractErc20ExecuteCommandArgs = (params: {
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
