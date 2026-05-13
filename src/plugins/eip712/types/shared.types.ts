import type {
  Eip712Domain,
  Eip712TypedDataField,
  JsonInputType,
} from '@/core/types/shared.types';

export interface JsonInput {
  value: unknown;
  type: JsonInputType;
}

export interface Eip712Data {
  domain: Eip712Domain | undefined;
  types: Record<string, Eip712TypedDataField[]> | undefined;
  message: Record<string, unknown> | undefined;
}
