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

1. Contract plugin

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
            'The base path on which you want to execute smart contract compiliation so that all imports will be included. If not given base path will default to the directory where you execute this command',
        },
        {
          name: 'admin-key',
          short: 'a',
          type: 'string',
          required: false,
          description:
            'Smart contract admin key.',
        },
        {
          name: 'constructor-parameter',
          short: 'c',
          type: 'repeatable',
          required: false,
          description:
            'Repeatable parameter to be set for smart contract constructor',
        },
      ],
      handler: createContract,
      output: {
        schema: CreateContractOutputSchema,
        humanTemplate: CREATE_CONTRACT_TEMPLATE,
      },
},
```

The `create` command will take five options.

The first one is `name` and this option is used for representing contract in the state as alias

The second one is `file` and this option will be pointing to the smart contract file definition you want to deploy to Hedera network.

The third one is `base-path` and it will point out to the directory in which you want to execute compilation of smart contract so that all imports will be searched from the level of this directory. It will default to the current directory you are executing your command when this option is not provided.

The fourth one is `admin-key` that is used for setting up an admin key for smart contract

The fifth option is `constructor-parameter` that will be new type of parameter `repetable`. The `repeatable` parameter can be set many set and each assign results in putting new value to the list of this option. This `constructor-parameter` will be a list consisting of parameters that are needed for constructor of deployed smart contract.

The example usage will look like this:

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
        schema: ListContractOutputSchema,
        humanTemplate: LIST_CONTRACT_TEMPLATE,
      },
    },
```

2. Contract schema

The contract schema will be represented as follows

```ts
export const ContractDataSchema = z.object({
  contractId: EntityIdSchema,
  fileId: EntityIdSchema,

  name: z
    .string()
    .min(1, 'Contract name is required')
    .max(100, 'Contract name must be 100 characters or less'),

  contractEvmAddress: EvmAddressSchema.describe(
    'Deployed contract EVM address',
  ),
  usedGas: z
    .number()
    .describe('Gas used to deploy smart contract to the network'),

  adminPublicKey: z.string().optional(),
  network: z.enum(SupportedNetwork, {
    error: () => ({
      message: 'Network must be mainnet, testnet, previewnet, or localnet',
    }),
  }),

  memo: z.string().max(100).optional(),
});
```

It will be stored in separate file. Also the alias will be used, so we would additionally put this information into the `alias` state with the type `contract`.

3. Core services

Our implementation will introduce three new services and it would be:

- `ContractCompilerService` - service responsible for using Solidity Compiler `solc` and its high-level API to compile provided smart contract file written in Solidity and the result will provide us with binary, abi and metadata output

```ts
export interface ContractCompilerService {
  compileContract(params: CompilerParams): CompilerOutput;
}
```

```ts
export interface CompilerParams {
  source: string;
}

export interface CompilerOutput {
  bin: string;
  abi: string;
  metadata: string;
}
```

- `ContractTransactionService` - service responsible for constructing Hashgraph SDK Transaction body for operations which invoke contrct operations like deployment, contract call and queries ready for execution.
  Mentioned service will consist of 3 methods, first two will be connected to deploying smart contract to Hedera network. First one will be responsible for invoking `FileCreateTransaction` for setting contract bytecode (result of compiler step) to Hedera network.
  The second method will be responsible for invoking `ContractCreateTransaction` for creating contract that will take `FileId` (result of the first method) and constructor parameters given by user. With them we will create contract on Hedera.
  The third method will be method for calling specific method from contract using SDK method `ContractCall`. We will need to pass `ContractId`, function parameters encoded with `ethers.js`. This method will be used for now only for calling method specified by ERC-721 and ERC-20 standard.

- `ContractVerifierService` - service responsible for verifying smart contract on Hedera. It will `Smart Contract Verification API` and send POST request to address 'https://server-verify.hashscan.io/verify' with body that will use this format

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

## Testing

1. Implementation of unit tests for new core services and handlers for new commands.
2. Integration tests for deploying smart contract and listing contracts in the state will need to be created.
