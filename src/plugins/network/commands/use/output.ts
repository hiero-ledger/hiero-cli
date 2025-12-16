import { z } from 'zod';

import { NetworkSchema } from '@/core/schemas/common-schemas';

export const UseNetworkOutputSchema = z.object({
  activeNetwork: NetworkSchema,
});

export type UseNetworkOutput = z.infer<typeof UseNetworkOutputSchema>;

export const USE_NETWORK_TEMPLATE = `
Active network: {{activeNetwork}}
`.trim();
