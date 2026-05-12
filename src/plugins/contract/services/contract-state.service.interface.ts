import type { ContractData } from '@/plugins/contract/schema';

export interface ContractStateService {
  hasContract(key: string): boolean;
  getContract(key: string): ContractData | undefined;
  saveContract(key: string, data: ContractData): void;
  deleteContract(key: string): void;
  listContracts(): ContractData[];
}
