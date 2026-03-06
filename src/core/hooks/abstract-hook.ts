import type { CommandHandlerArgs } from '@/core';
import type {
  HookResult,
  PostCoreActionParams,
  PostOutputPreparationParams,
  PreCoreActionParams,
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

  public preCoreActionHook(
    _args: CommandHandlerArgs,
    _params: PreCoreActionParams,
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

  public postCoreActionHook(
    _args: CommandHandlerArgs,
    _params: PostCoreActionParams,
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
