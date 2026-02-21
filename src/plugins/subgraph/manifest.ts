/**
 * Subgraph Plugin Manifest
 * Create and deploy Hedera testnet subgraphs (The Graph) from the CLI.
 */
import type { PluginManifest } from '@/core';
import { OptionType } from '@/core/types/shared.types';

import {
  subgraphCreateHandler,
  SubgraphCreateOutputSchema,
  SUBGRAPH_CREATE_TEMPLATE,
} from './commands/create';
import {
  subgraphDeployHandler,
  SubgraphDeployOutputSchema,
  SUBGRAPH_DEPLOY_TEMPLATE,
} from './commands/deploy';
import {
  subgraphStartNodeHandler,
  SubgraphStartNodeOutputSchema,
  SUBGRAPH_START_NODE_TEMPLATE,
} from './commands/start-node';

export const subgraphPluginManifest: PluginManifest = {
  name: 'subgraph',
  version: '1.0.0',
  displayName: 'Subgraph',
  description:
    'Create and deploy Hedera testnet subgraphs using The Graph (create, deploy, start local graph node)',
  commands: [
    {
      name: 'create',
      summary: 'Scaffold a Hedera testnet subgraph project',
      description:
        'Create a new subgraph project (Greeter example) for Hedera testnet. Configure contract address and start block, then deploy with subgraph deploy.',
      options: [
        {
          name: 'dir',
          short: 'd',
          type: OptionType.STRING,
          required: true,
          description:
            'Output directory for the new subgraph project (must be empty or not exist)',
        },
        {
          name: 'name',
          short: 'n',
          type: OptionType.STRING,
          required: false,
          default: 'Greeter',
          description:
            'Subgraph name (alphanumeric, used in graph create/deploy)',
        },
        {
          name: 'contract-address',
          type: OptionType.STRING,
          required: false,
          description:
            'Deployed Greeter contract address (0x...). Omit to use placeholder.',
        },
        {
          name: 'start-block',
          type: OptionType.NUMBER,
          required: false,
          description:
            'Start block for indexing (default 1; replace after contract deployment)',
        },
      ],
      handler: subgraphCreateHandler,
      output: {
        schema: SubgraphCreateOutputSchema,
        humanTemplate: SUBGRAPH_CREATE_TEMPLATE,
      },
    },
    {
      name: 'deploy',
      summary: 'Deploy subgraph to local graph node',
      description:
        'Run graph codegen, build, and deploy to local graph node. Start the node first with subgraph start-node (Docker required).',
      options: [
        {
          name: 'dir',
          short: 'd',
          type: OptionType.STRING,
          required: false,
          default: '.',
          description:
            'Subgraph project directory (default: current directory)',
        },
        {
          name: 'name',
          short: 'n',
          type: OptionType.STRING,
          required: false,
          default: 'Greeter',
          description: 'Subgraph name (must match subgraph.yaml)',
        },
        {
          name: 'version-label',
          short: 'v',
          type: OptionType.STRING,
          required: false,
          default: 'v0.0.1',
          description: 'Version label for this deployment (e.g. v0.0.1)',
        },
        {
          name: 'skip-codegen',
          type: OptionType.BOOLEAN,
          required: false,
          default: false,
          description: 'Skip graph codegen',
        },
        {
          name: 'skip-build',
          type: OptionType.BOOLEAN,
          required: false,
          default: false,
          description: 'Skip graph build',
        },
      ],
      handler: subgraphDeployHandler,
      output: {
        schema: SubgraphDeployOutputSchema,
        humanTemplate: SUBGRAPH_DEPLOY_TEMPLATE,
      },
    },
    {
      name: 'start-node',
      summary: 'Start local graph node (Docker)',
      description:
        'Start the local graph node, IPFS, and Postgres via Docker. Run from the subgraph project directory or pass --dir.',
      options: [
        {
          name: 'dir',
          short: 'd',
          type: OptionType.STRING,
          required: false,
          default: '.',
          description:
            'Subgraph project directory containing graph-node/docker-compose.yaml',
        },
      ],
      handler: subgraphStartNodeHandler,
      output: {
        schema: SubgraphStartNodeOutputSchema,
        humanTemplate: SUBGRAPH_START_NODE_TEMPLATE,
      },
    },
  ],
};

export default subgraphPluginManifest;
