import { SupportedNetwork } from '@/core/types/shared.types';

export const SCHEDULE_NAME = 'test-schedule';
export const SCHEDULE_COMPOSED_KEY = `${SupportedNetwork.TESTNET}:${SCHEDULE_NAME}`;
export const ADMIN_KEY_REF = 'kr_admintest123';
export const PAYER_ACCOUNT_ID = '0.0.5555555';
export const PAYER_KEY_REF_ID = 'kr_payertest123';
/** Valid ECDSA compressed public key (matches PublicKeyDefinitionSchema). */
export const ADMIN_PUBLIC_KEY =
  '0230a1f42abc4794541e4a4389ec7e822666b8a7693c4cc3dedd2746b32f9c015b';

/** On-chain schedule entity id (for delete / sign flows). */
export const ON_CHAIN_SCHEDULE_ID = '0.0.8888888';
/** Valid Hedera transaction id for output assertions (sign / delete). */
export const DELETE_SUCCESS_TX_ID = '0.0.100000@1700000000.123456789';
export const SIGN_SUCCESS_TX_ID = DELETE_SUCCESS_TX_ID;

export const SIGNER_KEY_REF = 'kr_signertest123';
/** Inner tx id stored on schedule records (verify hooks). */
export const INNER_TRANSACTION_ID = '0.0.100000@1700000000.987654321';
/** Mirror Node `seconds.nanoseconds` timestamp string. */
export const MIRROR_CONSENSUS_TS = '1768898341.551352532';
