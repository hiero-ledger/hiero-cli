import { z } from 'zod';

import { NetworkSchema } from '@/core/schemas/common-schemas';

export const NetworkUseOutputSchema = z.object({
  activeNetwork: NetworkSchema,
});

export type UseNetworkOutput = z.infer<typeof NetworkUseOutputSchema>;

export const NETWORK_USE_TEMPLATE = `
Active network: {{activeNetwork}}
`.trim();
