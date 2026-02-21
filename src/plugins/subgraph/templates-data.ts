/**
 * Embedded subgraph template content (Hedera testnet Greeter example).
 * Placeholders: {{contractAddress}}, {{startBlock}}
 */
export const SUBGRAPH_YAML = `specVersion: 0.0.4
description: Graph for Greeter contracts on Hedera testnet
repository: https://github.com/hashgraph/hedera-subgraph-example
schema:
  file: ./schema.graphql
dataSources:
  - kind: ethereum/contract
    name: Greeter
    network: testnet
    source:
      address: "{{contractAddress}}"
      abi: IGreeter
      startBlock: {{startBlock}}
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.6
      language: wasm/assemblyscript
      entities:
        - Greeting
      abis:
        - name: IGreeter
          file: ./abis/IGreeter.json
      eventHandlers:
        - event: GreetingSet(string)
          handler: handleGreetingSet
      file: ./src/mappings.ts
`;

export const SCHEMA_GRAPHQL = `type Greeting @entity {
  id: ID!
  currentGreeting: String!
}
`;

export const MAPPINGS_TS = `/*
 * Hedera Subgraph Example - Hedera testnet
 * Scaffolded by hiero-cli subgraph plugin.
 */

import { GreetingSet } from '../generated/Greeter/IGreeter';
import { Greeting } from '../generated/schema';

export function handleGreetingSet(event: GreetingSet): void {
  let entity = Greeting.load(event.transaction.hash.toHexString());

  if (!entity) {
    entity = new Greeting(event.transaction.hash.toHex());
  }

  entity.currentGreeting = event.params._greeting;
  entity.save();
}
`;

export const TESTNET_JSON = `{
  "startBlock": "{{startBlock}}",
  "Greeter": "{{contractAddress}}"
}
`;

export const DOCKER_COMPOSE_YAML = `version: '3'
services:
  graph-node:
    image: graphprotocol/graph-node:v0.27.0
    ports:
      - '8000:8000'
      - '8001:8001'
      - '8020:8020'
      - '8030:8030'
      - '8040:8040'
    depends_on:
      - ipfs
      - postgres
    extra_hosts:
      - host.docker.internal:host-gateway
    environment:
      postgres_host: postgres
      postgres_user: 'graph-node'
      postgres_pass: 'let-me-in'
      postgres_db: 'graph-node'
      ipfs: 'ipfs:5001'
      ethereum: 'testnet:https://testnet.hashio.io/api'
      GRAPH_LOG: info
      GRAPH_ETHEREUM_GENESIS_BLOCK_NUMBER: 1
  ipfs:
    image: ipfs/go-ipfs:v0.10.0
    ports:
      - '5001:5001'
    volumes:
      - ./data/ipfs:/data/ipfs
  postgres:
    image: postgres
    ports:
      - '5432:5432'
    command: ['postgres', '-cshared_preload_libraries=pg_stat_statements']
    environment:
      POSTGRES_USER: 'graph-node'
      POSTGRES_PASSWORD: 'let-me-in'
      POSTGRES_DB: 'graph-node'
      PGDATA: '/data/postgres'
    volumes:
      - ./data/postgres:/var/lib/postgresql/data
`;

export const IGREETER_ABI = `[
  {
    "inputs": [{"internalType": "string", "name": "_greeting", "type": "string"}],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": false, "internalType": "string", "name": "_greeting", "type": "string"}
    ],
    "name": "GreetingSet",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "greet",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "string", "name": "_greeting", "type": "string"}],
    "name": "setGreeting",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]
`;

export const PACKAGE_JSON = (subgraphName: string) => `{
  "name": "hedera-subgraph-${subgraphName.toLowerCase()}",
  "version": "1.0.0",
  "description": "Hedera subgraph on testnet - scaffolded by hiero-cli",
  "scripts": {
    "codegen": "graph codegen",
    "build": "graph build",
    "create-local": "graph create --node http://localhost:8020/ ${subgraphName}",
    "deploy-local": "graph deploy --node http://localhost:8020/ --ipfs http://localhost:5001 ${subgraphName}",
    "graph-node": "docker-compose -f ./graph-node/docker-compose.yaml up -d",
    "graph-node-down": "docker-compose -f ./graph-node/docker-compose.yaml down"
  },
  "dependencies": {
    "@graphprotocol/graph-cli": "0.33.0",
    "@graphprotocol/graph-ts": "0.27.0"
  }
}
`;
