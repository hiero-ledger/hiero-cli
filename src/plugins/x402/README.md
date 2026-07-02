# x402 Plugin

Signs x402 payment challenges using hiero-cli managed keys. The payer private
key never leaves the KMS — the command only emits a signed transfer.

## Command: `x402 sign`

Decodes a `PAYMENT-REQUIRED` header, builds a partially-signed Hedera
`TransferTransaction` (debit payer / credit `payTo`; HBAR `0.0.0` or an HTS
token), KMS-signs it, and returns the `PAYMENT-SIGNATURE` header value. The x402
facilitator adds the fee-payer signature and submits.

### Options

| Option         | Short | Required | Description                                                  |
| -------------- | ----- | -------- | ------------------------------------------------------------ |
| `--challenge`  | `-c`  | yes      | Value of the `PAYMENT-REQUIRED` header                       |
| `--from`       | `-f`  | no       | Payer account/key; defaults to operator                      |
| `--asset`      | `-a`  | no       | Asset when several are offered (`0.0.0` = HBAR, or token id) |
| `--keyManager` |       | no       | Key manager type (defaults to config)                        |

### Example

The agent drives the HTTP flow and pipes the challenge in:

```bash
hcli2 x402 sign --challenge "<PAYMENT-REQUIRED value>" --from 0.0.5005
```

Use `--output json` for the structured result
(`paymentSignatureHeader, payer, payTo, amount, asset, network, feePayer, transactionId`).

### Notes

- Supports `hedera:mainnet` and `hedera:testnet` only.
- No client-side preflight: payer balance / token association are validated by
  the facilitator at settlement, after this command returns.
