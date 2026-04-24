import type {
  HbarAllowanceParams,
  HbarAllowanceResult,
  TransferTinybarParams,
  TransferTinybarResult,
} from './types';

export interface HbarService {
  transferTinybar(
    params: TransferTinybarParams,
  ): Promise<TransferTinybarResult>;
  createHbarAllowanceTransaction(
    params: HbarAllowanceParams,
  ): HbarAllowanceResult;
}

export type {
  HbarAllowanceParams,
  HbarAllowanceResult,
  TransferTinybarParams,
  TransferTinybarResult,
};
