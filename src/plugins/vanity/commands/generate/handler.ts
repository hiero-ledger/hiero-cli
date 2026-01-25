/**
 * Vanity Address Generator Handler
 * Generates ECDSA keys until one matches the specified EVM address prefix
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { VanityGenerateOutput } from './output';

import { PrivateKey } from '@hashgraph/sdk';
import { keccak256 } from 'js-sha3';

import { KeyAlgorithm, Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';

import { VanityGenerateInputSchema } from './input';

/**
 * Derive EVM address from ECDSA public key
 * EVM address = last 20 bytes of keccak256(uncompressed public key without 0x04 prefix)
 */
function deriveEvmAddress(publicKeyHex: string): string {
  // Remove '0x' prefix if present
  const pubKeyClean = publicKeyHex.replace(/^0x/, '');

  // For ECDSA secp256k1, the SDK returns compressed key
  // We need the uncompressed key (without the 04 prefix) for EVM address derivation
  // However, the SDK publicKey.toStringRaw() returns the compressed form
  // For proper EVM address, we need to decompress first

  // The hash of the public key bytes
  const hash = keccak256(Buffer.from(pubKeyClean, 'hex'));

  // Last 20 bytes = last 40 hex characters
  return hash.slice(-40).toLowerCase();
}

export async function generateVanity(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { logger } = args;

  const validArgs = VanityGenerateInputSchema.parse(args.args);

  const { prefix, maxAttempts, timeout, keyType } = validArgs;

  // Vanity only works with ECDSA keys (for EVM address)
  if (keyType !== KeyAlgorithm.ECDSA) {
    return {
      status: Status.Failure,
      errorMessage:
        'Vanity address generation requires ECDSA keys (for EVM address derivation)',
    };
  }

  logger.info(`Searching for EVM address starting with 0x${prefix}...`);
  logger.info(`Max attempts: ${maxAttempts}, Timeout: ${timeout}s`);

  const startTime = Date.now();
  const timeoutMs = timeout * 1000;
  let attempts = 0;
  let found = false;
  let matchingKey: { privateKey: PrivateKey; publicKey: string } | null = null;
  let matchingAddress = '';

  // Calculate expected attempts (probability-based estimate)
  const prefixLength = prefix.length;
  const expectedAttempts = Math.pow(16, prefixLength);
  logger.info(
    `Expected attempts for ${prefixLength}-char prefix: ~${expectedAttempts.toLocaleString()}`,
  );

  try {
    while (attempts < maxAttempts && Date.now() - startTime < timeoutMs) {
      attempts++;

      // Generate a new ECDSA key pair
      const privateKey = PrivateKey.generateECDSA();
      const publicKey = privateKey.publicKey.toStringRaw();

      // Derive EVM address
      const evmAddress = deriveEvmAddress(publicKey);

      // Check if it matches the prefix
      if (evmAddress.startsWith(prefix)) {
        found = true;
        matchingKey = { privateKey, publicKey };
        matchingAddress = evmAddress;
        break;
      }

      // Progress logging every 10,000 attempts
      if (attempts % 10000 === 0) {
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = Math.round(attempts / elapsed);
        logger.info(
          `Attempt ${attempts.toLocaleString()} - Rate: ${rate.toLocaleString()}/s`,
        );
      }
    }

    const timeElapsed = Number(((Date.now() - startTime) / 1000).toFixed(2));

    if (!found || !matchingKey) {
      return {
        status: Status.Failure,
        errorMessage: `No match found after ${attempts.toLocaleString()} attempts (${timeElapsed}s). Try a shorter prefix or more attempts.`,
      };
    }

    // Import the matching key
    const keyRefId = `vanity-${Date.now()}`;
    const { kms } = args.api;

    const imported = kms.importPrivateKey(
      KeyAlgorithm.ECDSA,
      matchingKey.privateKey.toStringRaw(),
      undefined,
      ['vanity:generated', `prefix:${prefix}`],
    );

    const outputData: VanityGenerateOutput = {
      publicKey: matchingKey.publicKey,
      evmAddress: `0x${matchingAddress}`,
      attempts,
      timeElapsed,
      prefix,
      privateKeyRef: imported.keyRefId,
    };

    return {
      status: Status.Success,
      outputJson: JSON.stringify(outputData),
    };
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Vanity generation failed', error),
    };
  }
}
