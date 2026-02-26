/**
 * Subgraph deploy command - codegen, build, and deploy to local graph node (Hedera testnet).
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';

import {
  GRAPH_IPFS_URL,
  GRAPH_NODE_URL,
  GRAPH_QUERY_URL,
} from '../../constants';
import type { SubgraphDeployOutput } from './output';
import { SubgraphDeployInputSchema } from './input';

const GRAPH_CLI = 'npx';
const GRAPH_CLI_ARGS = ['@graphprotocol/graph-cli'];

function runGraph(
  args: string[],
  cwd: string,
  logger: { info: (s: string) => void },
): void {
  const cmd = [GRAPH_CLI, ...GRAPH_CLI_ARGS, ...args].join(' ');
  logger.info(`[subgraph] Running: ${cmd}`);
  const opts: import('child_process').ExecSyncOptions = {
    cwd,
    stdio: 'inherit',
    shell:
      process.platform === 'win32'
        ? (process.env.COMSPEC ?? 'cmd.exe')
        : '/bin/sh',
  };
  execSync(cmd, opts);
}

export async function subgraphDeployHandler(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { logger } = args;

  const parsed = SubgraphDeployInputSchema.safeParse(args.args);
  if (!parsed.success) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Invalid arguments', parsed.error),
    };
  }

  const { dir, name, versionLabel, skipCodegen, skipBuild } = parsed.data;
  const baseDir = path.resolve(dir);

  if (!fs.existsSync(baseDir)) {
    return {
      status: Status.Failure,
      errorMessage: `Directory not found: ${baseDir}`,
    };
  }

  const subgraphYaml = path.join(baseDir, 'subgraph.yaml');
  if (!fs.existsSync(subgraphYaml)) {
    return {
      status: Status.Failure,
      errorMessage: `subgraph.yaml not found in ${baseDir}. Run 'hcli subgraph create' first or point --dir to a subgraph project.`,
    };
  }

  const stepsCompleted: string[] = [];

  try {
    if (!skipCodegen) {
      runGraph(['codegen'], baseDir, logger);
      stepsCompleted.push('graph codegen');
    }
    if (!skipBuild) {
      runGraph(['build'], baseDir, logger);
      stepsCompleted.push('graph build');
    }

    try {
      runGraph(['create', '--node', GRAPH_NODE_URL, name], baseDir, logger);
      stepsCompleted.push(`graph create ${name}`);
    } catch {
      // create may fail if subgraph already exists; continue to deploy
      stepsCompleted.push(`graph create ${name} (skipped - may already exist)`);
    }

    runGraph(
      [
        'deploy',
        '--node',
        GRAPH_NODE_URL,
        '--ipfs',
        GRAPH_IPFS_URL,
        '--version-label',
        versionLabel,
        name,
      ],
      baseDir,
      logger,
    );
    stepsCompleted.push(`graph deploy ${name} @ ${versionLabel}`);

    const graphqlUrl = `${GRAPH_QUERY_URL}/${name}/graphql`;

    const outputData: SubgraphDeployOutput = {
      dir: baseDir,
      name,
      version: versionLabel,
      graphqlUrl,
      stepsCompleted,
    };

    return {
      status: Status.Success,
      outputJson: JSON.stringify(outputData),
    };
  } catch (err) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Subgraph deploy failed', err),
    };
  }
}
