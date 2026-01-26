### ADR-008: Smart contract plugin implementation (proposal)

- Status: Proposed
- Date: 2026-01-20
- Related: `src/core/*`, `src/plugins/*`

## Context

The Hiero CLI requires implementation of Smart Contract plugin that would handle deployment and verification of smart contract on Hedera network.

Goals:

- Compilation of Smart Contract defined in Solidity
- Deployment of compiled Smart Contract to the Hedera network
- Verification of deployed Smart Contract
- Command for listing deployed smart contract

## Decision

- We will use Solidity Compiler `solc` for compiling Solidity files which hold Smart Contract definitions
- We will use Hashgraph SDK to deploy compiled Smart Contract code
- For verification of deployed Smart Contract we will use `Smart Contract Verification API`
- This three steps mentioned above will be executed in a single command
- Deployed Smart Contract's information should be persisted in state and we should implement `list` command to view them

## Implementation Strategy

**1. Contract plugin**

Contract plugin will consist of two commands:

- `create` - the definition of this command will look like this

```ts
{
  name: 'create',
          summary: 'Create smart contract',
          description:
  'Command manages smart contract creation by compiling smart contract definition file, deploy and verification',
          options: [
    {
      name: 'name',
      short: 'n',
      type: 'string',
      required: true,
      description:
              'Smart contract name represented in the state. Option required',
    },
    {
      name: 'file',
      short: 'f',
      type: 'string',
      required: true,
      description:
              'Smart contract definition file path (absolute or relative) to a Solidity file. Option required',
    },
    {
      name: 'base-path',
      short: 'b',
      type: 'string',
      required: false,
      description:
              'Base path to the smart contract file directory. Defaults to current directory',
    },
    {
      name: 'gas',
      short: 'g',
      type: 'number',
      required: false,
      default: 1000000,
      description: 'Gas for smart contract creation. Default: 1000000',
    },
    {
      name: 'admin-key',
      short: 'a',
      type: 'string',
      required: false,
      description: 'Smart contract admin key.',
    },
    {
      name: 'memo',
      short: 'm',
      type: 'string',
      required: false,
      description: 'Smart contract memo.',
    },
    {
      name: 'constructor-parameter',
      short: 'c',
      type: 'repeatable',
      required: false,
      description:
              'Repeatable parameter to be set for smart contract constructor',
    },
    {
      name: 'key-manager',
      short: 'k',
      type: 'string',
      required: false,
      description:
              'Key manager to use: local or local_encrypted (defaults to config setting)',
    },
  ],
          handler: createContract,
          output: {
    schema: ContractCreateOutputSchema,
            humanTemplate: CONTRACT_CREATE_TEMPLATE,
  },
},
```

The `create` command will take five options:

- option `name` - it will be used for representing contract in the state as alias
- option `file` - it will be pointing to the smart contract file definition you want to deploy to Hedera network.
- option `base-path` - it will be pointing to the directory in which you want to execute compilation of smart contract so that all imports will be searched from the level of this directory. It will default to the current directory you are executing your command when this option is not provided.
- option `admin-key` - it will be used for setting up an admin key for smart contract
- option `constructor-parameter` - a new type of parameter `repetable`. The `repeatable` parameter can be set many set and each assign results in putting new value to the list of this option. This `constructor-parameter` will be a list consisting of parameters that are needed for constructor of deployed smart contract.
- option `memo` - it will be used to pass string field as contract memo
- option `key-manager` - points to the key manager for using in the command execution

The example of this command execution will look like this:

`hcli contract create --name test-contract --file ../directory/contracts/Contract.sol --base-path '../directory --constuctor-parameter Alice -c 11111`

- `list` - command responsible for listing deployed contracts

```ts

{
        name: 'list',
        summary: 'List all contracts',
        description: 'List all smart contracts stored in the state',
        options: [],
        handler: listContracts,
        output: {
          schema: ContractListOutputSchema,
          humanTemplate: CONTRACT_LIST_TEMPLATE,
        },
},
```

**2. Contract schema**

The contract schema will be represented as follows

```ts
export const ContractDataSchema = z.object({
  contractId: EntityIdSchema.describe('Contract ID'),
  contractName: ContractNameSchema,

  contractEvmAddress: EvmAddressSchema.describe(
    'Deployed contract EVM address',
  ),
  adminPublicKey: z.string().optional(),

  network: z.enum(SupportedNetwork, {
    error: () => ({
      message: 'Network must be mainnet, testnet, previewnet, or localnet',
    }),
  }),

  memo: z.string().max(100).optional(),
});

// TypeScript type inferred from Zod schema
export type ContractData = z.infer<typeof ContractDataSchema>;
```

It will be stored in separate file. Also the alias will be used, so we would additionally put this information into the `alias` state with the type `contract`.

**3. Core services**

Our implementation will introduce three new services and it would be:

3.1. `ContractCompilerService` - service responsible for using Solidity Compiler `solc` and its high-level API to compile provided smart contract file written in Solidity language.
The result will provide us with binary, abi and metadata result that we can use for deploying the smart contract on Hedera network

```ts
export interface ContractCompilerService {
  compileContract(params: CompilationParams): CompilationResult;
}
```

```ts
export interface CompilationParams {
  contractFilename: string;
  contractName: string;
  contractContent: string;
  basePath: string;
}

export interface CompilationResult {
  bytecode: string;
  abiDefinition: string;
  metadata: string;
}
```

What does this service do:

- firstly it build a Solidity compiler input

```ts
const input: SolcInput = {
  language: 'Solidity',
  sources: {
    [params.contractFilename]: {
      content: params.contractContent,
    },
  },
  settings: {
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode.object', 'metadata'],
      },
    },
  },
};
```

This tells Solidity compiler that we want to compile one file written in `Solidity` language and the output should be:
deployable bytecode `evm.bytecode.object`, ABI definitoin of the cotnract `abi`, JSON metadata of the contract `metadata`

- runs the Solidity compiler by executing `solc.compile` with resolved imports and compiler input

```ts
const output = JSON.parse(
  solc.compile(JSON.stringify(input), {
    import: this.createImportPath(params.basePath),
  }),
) as SolcOutput;
```

- the last thing is extracting ABI, metadata and bytecode of compiled smart contract and returning these values

**3.2. `ContractTransactionService`** - this service constructs a smart-contract deployment transaction by attaching bytecode, optional metadata, gas settings, and ABI-encoded constructor parameters, returning a ready-to-sign contract creation transaction.

Purposes of service are:

- creating a contract deployment transaction

- configuring optional deployment parameters (bytecode, gas, admin key, memo)

- encoding constructor arguments using the contract’s ABI

- returning a ready-to-sign transaction object

**3.3 `ContractVerifierService`** - service responsible for verifying smart contract on Hedera Hashscan using `Smart Contract Verification API`.
It takes a smart contract's source code and address, packages them up, and ships them off to HashScan so that the contract can be marked as "Verified" on the block explorer.

The `verifyContract` will construct payload that is visible below

```json
{
    "address": "0000000000000000000000000000000000753312", // address of smart contract (result of smart contract deployment
    "chain": "296", // chainId of specific Hedera chain on network
    "files": { // files will consist of two files, one is content of metadata (result of Solidity compiler output) and the second one is cotnract definition in Solidity
        "metadata.json": "" // to the
        "LookupContract.sol":""

    }
}
```

and then use it as payload when creating POST request using `axios` to the address `https://server-verify.hashscan.io/verify` and send POST request to address 'https://server-verify.hashscan.io/verify'.

## Testing

1. Implementation of unit tests for new core services and handlers for new commands.
2. Integration tests for deploying smart contract and listing contracts in the state will need to be created.
