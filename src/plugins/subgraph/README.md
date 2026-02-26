# Subgraph Plugin

Create and deploy **Hedera testnet** subgraphs from the CLI using [The Graph](https://thegraph.com/) and the [Hedera JSON-RPC relay](https://docs.hedera.com/hedera/core-concepts/smart-contracts/json-rpc-relay) (e.g. Hashio testnet).

## Prerequisites

- **Docker** – for running the local graph node (IPFS + Postgres + graph-node).
- **Node.js** – the plugin uses `npx @graphprotocol/graph-cli` for deploy; no global install required.

**Note:** The first `npm install` in a new subgraph project can take several minutes; the Graph CLI and its dependencies are large. If it seems stuck, try `npm cache clean --force` and run `npm install` again, or use `yarn` instead.

## Commands

### `hcli subgraph create`

Scaffolds a new subgraph project (Greeter example) for Hedera testnet.

```bash
hcli subgraph create --dir ./my-subgraph
# With contract and start block (replace after deploying your Greeter contract):
hcli subgraph create --dir ./my-subgraph --contract-address 0x... --start-block 12345 --name MyGreeter
```

Creates: `subgraph.yaml`, `schema.graphql`, `src/mappings.ts`, `abis/IGreeter.json`, `config/testnet.json`, `graph-node/docker-compose.yaml`, `package.json`.

### `hcli subgraph start-node`

Starts the local graph node (Docker). Run from the subgraph project directory or pass `--dir`.

```bash
cd my-subgraph
hcli subgraph start-node
# Or: hcli subgraph start-node --dir ./my-subgraph
```

### `hcli subgraph deploy`

Runs `graph codegen`, `graph build`, and deploys to your local graph node. Start the node first with `subgraph start-node`.

```bash
cd my-subgraph
npm install
hcli subgraph start-node
# Wait ~1 minute, then:
hcli subgraph deploy --dir . --name Greeter --version-label v0.0.1
```

Options: `--dir`, `--name`, `--version-label`, `--skip-codegen`, `--skip-build`.

## References

- [Hedera: Deploy a Subgraph Using The Graph and JSON-RPC](https://docs.hedera.com/hedera/tutorials/smart-contracts/deploy-a-subgraph-using-the-graph-and-json-rpc)
- [hedera-subgraph-example](https://github.com/hashgraph/hedera-subgraph-example)
- [The Graph docs](https://thegraph.com/docs/)
