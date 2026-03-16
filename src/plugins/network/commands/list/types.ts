import type { SupportedNetwork } from '@/core/types/shared.types';
import type { NetworkListOutput } from './output';

export interface ListNetworksNormalisedParams {
  currentNetwork: SupportedNetwork;
  networkNames: SupportedNetwork[];
}

export type ListNetworksExecuteResult = NetworkListOutput['networks'];
