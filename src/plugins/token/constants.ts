/**
 * Token plugin constants
 * Kept in a separate file to avoid circular dependencies
 * (zustand-state-helper must not import manifest, which imports command handlers)
 */
export const TOKEN_NAMESPACE = 'token-tokens';

export const MAX_NFT_METADATA_BYTES = 100;
