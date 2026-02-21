/**
 * Subgraph create command - scaffold a Hedera testnet subgraph project.
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import * as fs from 'fs';
import * as path from 'path';

import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';

import { DEFAULT_START_BLOCK, PLACEHOLDER_CONTRACT } from '../../constants';
import {
  DOCKER_COMPOSE_YAML,
  IGREETER_ABI,
  MAPPINGS_TS,
  PACKAGE_JSON,
  SCHEMA_GRAPHQL,
  SUBGRAPH_YAML,
  TESTNET_JSON,
} from '../../templates-data';
import type { SubgraphCreateOutput } from './output';
import { SubgraphCreateInputSchema } from './input';

function replacePlaceholders(
  content: string,
  contractAddress: string,
  startBlock: number,
): string {
  return content
    .replace(/\{\{contractAddress\}\}/g, contractAddress)
    .replace(/\{\{startBlock\}\}/g, String(startBlock));
}

export async function subgraphCreateHandler(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { logger } = args;

  const parsed = SubgraphCreateInputSchema.safeParse(args.args);
  if (!parsed.success) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Invalid arguments', parsed.error),
    };
  }

  const {
    dir,
    name,
    contractAddress = PLACEHOLDER_CONTRACT,
    startBlock = DEFAULT_START_BLOCK,
  } = parsed.data;

  const baseDir = path.resolve(dir);
  const filesCreated: string[] = [];

  try {
    if (fs.existsSync(baseDir)) {
      const stat = fs.statSync(baseDir);
      if (!stat.isDirectory()) {
        return {
          status: Status.Failure,
          errorMessage: `Path exists and is not a directory: ${baseDir}`,
        };
      }
      const existing = fs.readdirSync(baseDir);
      if (existing.length > 0) {
        return {
          status: Status.Failure,
          errorMessage: `Directory is not empty: ${baseDir}. Use an empty directory or a new path.`,
        };
      }
    } else {
      fs.mkdirSync(baseDir, { recursive: true });
    }

    const dirs = [
      path.join(baseDir, 'abis'),
      path.join(baseDir, 'config'),
      path.join(baseDir, 'src'),
      path.join(baseDir, 'graph-node'),
    ];
    for (const d of dirs) {
      fs.mkdirSync(d, { recursive: true });
    }

    const subgraphYaml = replacePlaceholders(
      SUBGRAPH_YAML,
      contractAddress,
      startBlock,
    );
    const subgraphPath = path.join(baseDir, 'subgraph.yaml');
    fs.writeFileSync(subgraphPath, subgraphYaml, 'utf-8');
    filesCreated.push('subgraph.yaml');

    fs.writeFileSync(
      path.join(baseDir, 'schema.graphql'),
      SCHEMA_GRAPHQL,
      'utf-8',
    );
    filesCreated.push('schema.graphql');

    fs.writeFileSync(
      path.join(baseDir, 'src', 'mappings.ts'),
      MAPPINGS_TS,
      'utf-8',
    );
    filesCreated.push('src/mappings.ts');

    fs.writeFileSync(
      path.join(baseDir, 'abis', 'IGreeter.json'),
      IGREETER_ABI,
      'utf-8',
    );
    filesCreated.push('abis/IGreeter.json');

    const testnetJson = replacePlaceholders(
      TESTNET_JSON,
      contractAddress,
      startBlock,
    );
    fs.writeFileSync(
      path.join(baseDir, 'config', 'testnet.json'),
      testnetJson,
      'utf-8',
    );
    filesCreated.push('config/testnet.json');

    fs.writeFileSync(
      path.join(baseDir, 'graph-node', 'docker-compose.yaml'),
      DOCKER_COMPOSE_YAML,
      'utf-8',
    );
    filesCreated.push('graph-node/docker-compose.yaml');

    const packageJson = PACKAGE_JSON(name);
    fs.writeFileSync(path.join(baseDir, 'package.json'), packageJson, 'utf-8');
    filesCreated.push('package.json');

    const nextSteps = [
      `cd ${baseDir}`,
      'npm install (first run may take several minutes — Graph CLI has many dependencies)',
      'Start local graph node: npm run graph-node (requires Docker)',
      'graph codegen && graph build',
      `graph create --node http://localhost:8020/ ${name}`,
      `graph deploy --node http://localhost:8020/ --ipfs http://localhost:5001 ${name}`,
      `Or use: hcli subgraph deploy --dir . --name ${name}`,
    ];

    const outputData: SubgraphCreateOutput = {
      dir: baseDir,
      name,
      contractAddress,
      startBlock,
      filesCreated,
      nextSteps,
    };

    logger.info(`[subgraph] Created project at ${baseDir}`);

    return {
      status: Status.Success,
      outputJson: JSON.stringify(outputData),
    };
  } catch (err) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to create subgraph project', err),
    };
  }
}
