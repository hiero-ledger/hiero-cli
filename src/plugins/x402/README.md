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

### Spend controls (@x402/core 2.27+)

`@x402/core` 2.27 introduced client-side spend controls that run while the
payment payload is created:

- by default only _default assets_ are accepted — for Hedera that is USDC
  (`0.0.429274` testnet, `0.0.456858` mainnet); **HBAR `0.0.0` is not one**;
- payments in default assets are additionally capped at **$1 per payment**
  (`maxAmountPerPayment`, default `"$1"`).

Left enabled, both rules break this command: HBAR challenges are rejected
outright and USDC challenges above $1 fail with a `spendControls` error. The
handler therefore calls `client.setSpendControls(false)` — the command signs
exactly the requirement selected from the challenge, asset and amount as
offered, and validation happens at settlement.

The unit tests in `__tests__/unit/handler.test.ts` pin both sides of the
contract:

- with the spend controls **enabled** (simulated), the handler surfaces the
  exact rejections: the asset-allowlist error for HBAR and the `$1`
  `maxAmountPerPayment` error for USDC/HBAR above the cap;
- with the spend controls **disabled** (the handler's behaviour), HBAR and
  USDC payments above $1 sign normally.

### Notes

- Supports `hedera:mainnet` and `hedera:testnet` only.
- No client-side preflight: payer balance / token association are validated by
  the facilitator at settlement, after this command returns.
- No client-side spend caps either: the `@x402/core` spend controls are
  disabled for this command — see _Spend controls_ above.
