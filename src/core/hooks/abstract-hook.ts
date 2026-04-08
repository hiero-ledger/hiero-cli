import type { CommandHandlerArgs } from '@/core';
import type {
  CustomHandlerHookParams,
  HookResult,
  PostOutputPreparationParams,
  PreBuildTransactionParams,
  PreExecuteTransactionParams,
  PreOutputPreparationParams,
  PreSignTransactionParams,
} from '@/core/hooks/types';

export abstract class AbstractHook {
  public preParamsPreparationAndNormalizationHook(
    _args: CommandHandlerArgs,
    _commandName: string,
  ): Promise<HookResult> {
    return Promise.resolve({
      breakFlow: false,
      result: {
        message: 'success',
      },
    });
  }

  public preBuildTransactionHook(
    _args: CommandHandlerArgs,
    _params: PreBuildTransactionParams,
    _commandName: string,
  ): Promise<HookResult> {
    return Promise.resolve({
      breakFlow: false,
      result: {
        message: 'success',
      },
    });
  }

  public preSignTransactionHook(
    _args: CommandHandlerArgs,
    _params: PreSignTransactionParams,
    _commandName: string,
  ): Promise<HookResult> {
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
    _commandName: string,
  ): Promise<HookResult> {
    return Promise.resolve({
      breakFlow: false,
      result: {
        message: 'success',
      },
    });
  }

  public preOutputPreparationHook(
    _args: CommandHandlerArgs,
    _params: PreOutputPreparationParams,
    _commandName: string,
  ): Promise<HookResult> {
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
    _commandName: string,
  ): Promise<HookResult> {
    return Promise.resolve({
      breakFlow: false,
      result: {
        message: 'success',
      },
    });
  }

  public customHandlerHook(
    _args: CommandHandlerArgs,
    _params: CustomHandlerHookParams,
    _commandName: string,
  ): Promise<HookResult> {
    return Promise.resolve({
      breakFlow: false,
      result: {
        message: 'success',
      },
    });
  }
}
