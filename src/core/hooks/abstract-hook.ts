import type { CommandHandlerArgs } from '@/core';
import type {
  PostCoreActionParams,
  PostOutputPreparationParams,
  PostParamsPreparationAndNormalizationParams,
  PreCoreActionParams,
  PreOutputPreparationParams,
} from '@/core/hooks/types';
import type { Context } from '@/core/shared/context/context';

export abstract class AbstractHook {
  public preParamsPreparationAndNormalizationHook(
    _args: CommandHandlerArgs,
    _context: Context,
  ): Promise<void> {
    void _args;
    void _context;
    return Promise.resolve();
  }

  public postParamsPreparationAndNormalizationHook(
    _args: CommandHandlerArgs,
    _context: Context,
    _params: PostParamsPreparationAndNormalizationParams,
  ): Promise<void> {
    void _args;
    void _context;
    void _params;
    return Promise.resolve();
  }

  public preCoreActionHook(
    _args: CommandHandlerArgs,
    _context: Context,
    _params: PreCoreActionParams,
  ): Promise<void> {
    void _args;
    void _context;
    void _params;
    return Promise.resolve();
  }

  public postCoreActionHook(
    _args: CommandHandlerArgs,
    _context: Context,
    _params: PostCoreActionParams,
  ): Promise<void> {
    void _args;
    void _context;
    void _params;
    return Promise.resolve();
  }

  public preOutputPreparationHook(
    _args: CommandHandlerArgs,
    _context: Context,
    _params: PreOutputPreparationParams,
  ): Promise<void> {
    void _args;
    void _context;
    void _params;
    return Promise.resolve();
  }

  public postOutputPreparationHook(
    _args: CommandHandlerArgs,
    _context: Context,
    _params: PostOutputPreparationParams,
  ): Promise<void> {
    void _args;
    void _context;
    void _params;
    return Promise.resolve();
  }
}
