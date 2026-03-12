import type { SupportedNetwork } from '@/core/types/shared.types';
import type { ListNetworksOutput } from './output';

export interface ListNetworksNormalisedParams {
  currentNetwork: SupportedNetwork;
  networkNames: SupportedNetwork[];
}

export type ListNetworksExecuteResult = ListNetworksOutput['networks'];
