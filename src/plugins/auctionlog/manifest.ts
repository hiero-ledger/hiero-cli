/**
 * Auctionlog Plugin Manifest
 *
 * A Hiero CLI plugin that publishes, verifies, and exports privacy-preserving
 * audit commitments for B2B blind auction workflows.
 *
 * Each critical auction stage (created, bidding-open, bidding-closed, awarded,
 * settled, disputed) is recorded as a commitment hash on a Hedera Consensus
 * Service (HCS) topic. The hash proves timing and sequence without revealing
 * any business-sensitive data like bid values, delivery terms, or identities.
 *
 * Commands:
 *   publish  — Publish a commitment for an auction stage
 *   verify   — Verify the integrity of published commitments
 *   export   — Export the audit trail as JSON or CSV
 *   list     — List all tracked auctions
 */
import type { PluginManifest } from '@/core';
import { OptionType } from '@/core/types/shared.types';

import {
  PUBLISH_TEMPLATE,
  publishCommitment,
  PublishOutputSchema,
} from './commands/publish';
import {
  VERIFY_TEMPLATE,
  verifyCommitments,
  VerifyOutputSchema,
} from './commands/verify';
import {
  EXPORT_TEMPLATE,
  exportAuditLog,
  ExportOutputSchema,
} from './commands/export';
import {
  LIST_TEMPLATE,
  listAuctions,
  ListOutputSchema,
} from './commands/list';

export const AUCTIONLOG_NAMESPACE = 'auctionlog-data';

export const auctionlogPluginManifest: PluginManifest = {
  name: 'auctionlog',
  version: '1.0.0',
  displayName: 'Auction Audit Log',
  description:
    'Privacy-preserving audit trail for B2B blind auctions. Publishes commitment hashes to HCS that prove fairness and timing without revealing business data.',
  commands: [
    {
      name: 'publish',
      summary: 'Publish an audit commitment for an auction stage',
      description:
        'Publish a commitment hash to an HCS topic for a specific auction stage. The commitment is keccak256(auctionId, stage, cantonRef, adiTx, timestamp, nonce). No business data is revealed.',
      options: [
        {
          name: 'auction-id',
          short: 'a',
          type: OptionType.STRING,
          required: true,
          description: 'Unique auction identifier (e.g. AUCTION-001)',
        },
        {
          name: 'stage',
          short: 's',
          type: OptionType.STRING,
          required: true,
          description:
            'Auction stage: created | bidding-open | bidding-closed | awarded | settled | disputed',
        },
        {
          name: 'topic',
          short: 't',
          type: OptionType.STRING,
          required: false,
          description:
            'Existing HCS topic ID (e.g. 0.0.123456). If omitted, creates a new topic.',
        },
        {
          name: 'canton-ref',
          short: 'c',
          type: OptionType.STRING,
          required: false,
          description: 'Canton Network transaction reference',
        },
        {
          name: 'adi-tx',
          short: 'd',
          type: OptionType.STRING,
          required: false,
          description: 'ADI Network transaction hash',
        },
      ],
      handler: publishCommitment,
      output: {
        schema: PublishOutputSchema,
        humanTemplate: PUBLISH_TEMPLATE,
      },
    },
    {
      name: 'verify',
      summary: 'Verify audit commitments for an auction',
      description:
        'Re-computes commitment hashes from stored fields and checks them against published values. Detects any tampering.',
      options: [
        {
          name: 'auction-id',
          short: 'a',
          type: OptionType.STRING,
          required: true,
          description: 'Auction ID to verify',
        },
        {
          name: 'stage',
          short: 's',
          type: OptionType.STRING,
          required: false,
          description:
            'Specific stage to verify. If omitted, verifies all stages.',
        },
      ],
      handler: verifyCommitments,
      output: {
        schema: VerifyOutputSchema,
        humanTemplate: VERIFY_TEMPLATE,
      },
    },
    {
      name: 'export',
      summary: 'Export audit trail as JSON or CSV',
      description:
        'Export the full audit timeline for an auction. Produces a JSON or CSV artifact suitable for compliance review, legal discovery, or regulatory audit.',
      options: [
        {
          name: 'auction-id',
          short: 'a',
          type: OptionType.STRING,
          required: true,
          description: 'Auction ID to export',
        },
        {
          name: 'type',
          short: 'T',
          type: OptionType.STRING,
          required: false,
          description: 'Export format: json (default) or csv',
        },
        {
          name: 'file',
          short: 'f',
          type: OptionType.STRING,
          required: false,
          description:
            'Output file path. If omitted, prints to stdout.',
        },
      ],
      handler: exportAuditLog,
      output: {
        schema: ExportOutputSchema,
        humanTemplate: EXPORT_TEMPLATE,
      },
    },
    {
      name: 'list',
      summary: 'List all tracked auctions',
      description:
        'Show all auctions that have at least one published audit commitment.',
      options: [],
      handler: listAuctions,
      output: {
        schema: ListOutputSchema,
        humanTemplate: LIST_TEMPLATE,
      },
    },
  ],
};

export default auctionlogPluginManifest;
