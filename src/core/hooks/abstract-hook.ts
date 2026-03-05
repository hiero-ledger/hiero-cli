import type { CommandHandlerArgs } from '@/core';
import type {
  PostCoreActionParams,
  PostOutputPreparationParams,
  PreCoreActionParams,
} from '@/core/hooks/types';

export abstract class AbstractHook {
  public preParamsPreparationAndNormalizationHook(
    _args: CommandHandlerArgs,
  ): Promise<void> {
    void _args;
    return Promise.resolve();
  }

  public preCoreActionHook(
    _args: CommandHandlerArgs,
    _params: PreCoreActionParams,
  ): Promise<void> {
    void _args;
    void _params;
    return Promise.resolve();
  }

  public postCoreActionHook(
    _args: CommandHandlerArgs,
    _params: PostCoreActionParams,
  ): Promise<void> {
    void _args;
    void _params;
    return Promise.resolve();
  }

  public postOutputPreparationHook(
    _args: CommandHandlerArgs,
    _params: PostOutputPreparationParams,
  ): Promise<void> {
    void _args;
    void _params;
    return Promise.resolve();
  }
}
