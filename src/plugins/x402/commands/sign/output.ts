import { z } from 'zod';

export const X402SignOutputSchema = z.object({
  paymentSignatureHeader: z
    .string()
    .describe('Value to send as the PAYMENT-SIGNATURE header on the retry'),
  payer: z.string().describe('Payer account id'),
  payTo: z.string().describe('Recipient account id'),
  amount: z.string().describe('Amount in the asset smallest units'),
  asset: z.string().describe('Asset id (0.0.0 = HBAR, or HTS token id)'),
  network: z.string().describe('Network the payment targets'),
  feePayer: z.string().describe('Facilitator account that sponsors the fee'),
  transactionId: z.string().describe('Transaction id of the signed transfer'),
});

export type X402SignOutput = z.infer<typeof X402SignOutputSchema>;

export const X402_SIGN_TEMPLATE = `
✅ Payment signed for {{network}}

PAYMENT-SIGNATURE:
{{paymentSignatureHeader}}

Payer:      {{payer}}
Pay to:     {{payTo}}
Amount:     {{amount}} ({{asset}})
Fee payer:  {{feePayer}}
Tx id:      {{transactionId}}
`.trim();
