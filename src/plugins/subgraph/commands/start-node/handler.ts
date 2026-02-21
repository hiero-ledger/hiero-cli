/**
 * Subgraph start-node command - start local graph node (Docker) for Hedera testnet.
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';

import type { SubgraphStartNodeOutput } from './output';
import { SubgraphStartNodeInputSchema } from './input';

export async function subgraphStartNodeHandler(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { logger } = args;

  const parsed = SubgraphStartNodeInputSchema.safeParse(args.args);
  if (!parsed.success) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Invalid arguments', parsed.error),
    };
  }

  const { dir } = parsed.data;
  const baseDir = path.resolve(dir);
  const composePath = path.join(baseDir, 'graph-node', 'docker-compose.yaml');

  if (!fs.existsSync(composePath)) {
    return {
      status: Status.Failure,
      errorMessage: `docker-compose not found: ${composePath}. Run 'hcli subgraph create' first or use --dir.`,
    };
  }

  try {
    logger.info(
      `[subgraph] Starting graph node: docker-compose -f ${composePath} up -d`,
    );
    const execOpts: import('child_process').ExecSyncOptions = {
      stdio: 'inherit',
      shell:
        process.platform === 'win32'
          ? (process.env.COMSPEC ?? 'cmd.exe')
          : '/bin/sh',
    };
    execSync(`docker-compose -f "${composePath}" up -d`, execOpts);

    const outputData: SubgraphStartNodeOutput = {
      dir: baseDir,
      composeFile: composePath,
      message:
        'Graph node, IPFS, and Postgres are starting. Wait a minute then run: hcli subgraph deploy --dir .',
    };

    return {
      status: Status.Success,
      outputJson: JSON.stringify(outputData),
    };
  } catch (err) {
    return {
      status: Status.Failure,
      errorMessage: formatError(
        'Failed to start graph node. Ensure Docker is running and docker-compose is available.',
        err,
      ),
    };
  }
}
