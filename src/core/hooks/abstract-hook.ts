import type { CommandHandlerArgs } from '@/core';
import type {
  HookResult,
  PostExecuteTransactionParams,
  PostOutputPreparationParams,
  PreBuildAndSignParams,
  PreExecuteTransactionParams,
} from '@/core/hooks/types';

export abstract class AbstractHook {
  public preParamsPreparationAndNormalizationHook(
    _args: CommandHandlerArgs,
  ): Promise<HookResult> {
    void _args;
    return Promise.resolve({
      breakFlow: false,
      result: {
        message: 'success',
      },
    });
  }

  public preBuildAndSignHook(
    _args: CommandHandlerArgs,
    _params: PreBuildAndSignParams,
  ): Promise<HookResult> {
    void _args;
    void _params;
    return Promise.resolve({
      breakFlow: false,
      result: {
        message: 'success',
      },
    });
  }

  public preExecuteTransactionHook(
    _args: CommandHandlerArgs,
    _params: PreExecuteTransactionParams,
  ): Promise<HookResult> {
    void _args;
    void _params;
    return Promise.resolve({
      breakFlow: false,
      result: {
        message: 'success',
      },
    });
  }

  public postExecuteTransactionHook(
    _args: CommandHandlerArgs,
    _params: PostExecuteTransactionParams,
  ): Promise<HookResult> {
    void _args;
    void _params;
    return Promise.resolve({
      breakFlow: false,
      result: {
        message: 'success',
      },
    });
  }

  public postOutputPreparationHook(
    _args: CommandHandlerArgs,
    _params: PostOutputPreparationParams,
  ): Promise<HookResult> {
    void _args;
    void _params;
    return Promise.resolve({
      breakFlow: false,
      result: {
        message: 'success',
      },
    });
  }
}
