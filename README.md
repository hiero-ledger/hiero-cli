# Hedera CLI

[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/hiero-ledger/hiero-cli/badge)](https://scorecard.dev/viewer/?uri=github.com/hiero-ledger/hiero-cli)
[![CII Best Practices](https://bestpractices.coreinfrastructure.org/projects/10697/badge)](https://bestpractices.coreinfrastructure.org/projects/10697)
[![License](https://img.shields.io/badge/license-apache2-blue.svg)](LICENSE)

Welcome to the Hedera CLI Tool, a powerful and intuitive command-line interface designed to streamline your interactions with the Hedera network. Whether you're a developer needing to set up test environments, automate network-related tasks, or explore the extensive capabilities of the Hedera mainnet and testnet, this tool is your one-stop solution.

The Hedera CLI Tool elegantly addresses the complexities associated with distributed ledger technologies. It simplifies the process of executing actions such as creating new accounts, sending transactions, managing tokens, and associating with existing tokens directly from the CLI. This high level of functionality and ease of use significantly reduces the barrier to entry for developers working on Hedera-based projects.

A key advantage of the Hedera CLI Tool is its potential to enhance your workflow. It's not just about performing individual tasks; it's about integrating these tasks into a larger, more efficient development process. With plans for future integration into Continuous Integration/Continuous Deployment (CI/CD) pipelines, this tool promises to be a versatile asset in the automation and management of Hedera network operations.

> **🎯 Feature requests** can be submitted on the Hedera CLI repository as an issue. Please check the [issues](https://github.com/hashgraph/hedera-cli/issues) before submitting a new one and tag it with the `Feature Request` label.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Connecting the CLI tool with your Local Hedera Network](#connecting-the-cli-tool-with-your-local-hedera-network)
- [Video Guide](#video-guide)
- [Commands](#commands)
  - [Setup Commands](#setup-commands)
  - [Telemetry Commands](#telemetry-commands)
  - [Smart Contract Commands](#smart-contract-commands)
  - [Network Commands](#network-commands)
  - [Wait Command](#wait-command)
  - [Account Commands](#account-commands)
  - [Token Commands](#token-commands)
  - [Topic Commands](#topic-commands)
  - [Hbar Command](#hbar-command)
  - [Backup Commands](#backup-commands)
  - [State Commands](#state-commands)
  - [Script Commands](#script-commands)
    - [Dynamic Variables in Scripts](#dynamic-variables-in-scripts)
- [Configuration & State Storage](#configuration--state-storage)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before proceeding with the installation and setup of the Hedera CLI Tool, ensure the following prerequisites are met:

### 1. Node.js Installation

The Hedera CLI Tool requires Node.js (version LTS 16.20.2 or higher). You can check your current version by running `node -v` in your terminal. If you do not have Node.js installed, you can download it from [Node.js official website](https://nodejs.org/en).

### 2. Hedera Account Setup

You will need an account on the Hedera network to interact with the ledger. Follow these steps to set up your account:

- Visit the [Hedera Portal](https://portal.hedera.com/) and create a new account.
- During the account creation process, you will receive a DER encoded private key and an account ID. The private key corresponds to your `OPERATOR_KEY`, and the account ID is your `OPERATOR_ID`. These credentials are essential for authenticating and performing operations using the Hedera CLI Tool.

Make sure to securely store your DER encoded private key and account ID, as they are crucial for accessing and managing your Hedera account.

## Installation

### 1. Clone the repository

Make sure to clone the repository. You can do this by running the following command in your terminal:

```sh
git clone https://github.com/hashgraph/hedera-cli.git
```

### 2. Install Dependencies

Navigate to the repository folder and install the necessary packages using `npm`. This sets up everything you need to get started with the Hedera CLI Tool.

```sh
cd hedera-cli && npm install
```

### 3. Build the Package

Compile the package to ensure all components are ready for use.

```sh
npm run build
```

### 4. Set Up Operator Credentials

Make a copy of the `.env.sample` file to create your own `.env` file. This file will store your operator credentials securely.

```sh
cp .env.sample .env
```

Add your operator ID and key for previewnet, testnet, and mainnet. It's **not mandatory** to set keys for all networks. If you only want to use one network, you can leave the other credentials blank. Make sure that each operator account **contains at least 1 Hbar**. We've added the default account for the [Hiero Local Node](https://github.com/hashgraph/hedera-local-node).

```text
PREVIEWNET_OPERATOR_KEY=
PREVIEWNET_OPERATOR_ID=
TESTNET_OPERATOR_KEY=
TESTNET_OPERATOR_ID=
MAINNET_OPERATOR_KEY=
MAINNET_OPERATOR_ID=
LOCALNET_OPERATOR_ID=0.0.2
LOCALNET_OPERATOR_KEY=302e020100300506032b65700422042091132178e72057a1d7528025956fe39b0b847f200ab59b2fdd367017f3087137
```

Next, set up the CLI tool with the command. **The `--telemetry` flag is optional and enables telemetry. By default, telemetry is disabled. Hedera collects anonymous data to improve the CLI tool. For example, it records the command name, not the parameters or any other sensitive information. If you don't want us to collect telemetry data, run the command without the `--telemetry` flag.**

```sh
node dist/hedera-cli.js setup init --telemetry
```

The `setup init` command will also create the different operator accounts in your address book (persisted state file) so you can use them in your commands.

### 5. Verify Installation

You can verify the installation by listing all accounts in your address book. When you first run this command, you'll see the operator keys you've defined.

```sh
node dist/hedera-cli.js account list
testnet-operator, 0.0.2224463, ECDSA
preview-operator, 0.0.1110, ECDSA
[...]
```

### 6. Set Network

When first using the network, the CLI tool will use the `testnet` network. You can switch to the `mainnet` or other networks like `previewnet` or `localnet` using the following command:

```sh
node dist/hedera-cli.js network use mainnet
```

### 7. Optional: Setting Up an Alias

To avoid typing the full command each time, you can set an alias in your shell profile. For example, in bash or Z shell, you can add the following line to your `.bashrc`/`.bash_profile` or `.zshrc`. Replace the path with the absolute path to your `hedera-cli` installation path.

```sh
alias hcli="node /Users/myUser/hedera-cli/dist/hedera-cli.js"
```

Make sure you reload your shell, whether it's `bashrc`, `zshrc`, or another shell profile.

```sh
source ~/.bashrc
```

You can verify the alias by listing all accounts in your address book.

```sh
hcli account list
```

If you haven't added any accounts yet, you should see the same output like in step 5.

### 8. Optional: Download Example Scripts

You can download example scripts from the [examples file](./src/commands/script/examples.json) and add them to your state. This allows you to quickly test the CLI tool and see how scripting functionality works. You can download the example scripts using the following command:

```sh
node dist/hedera-cli.js state download --url https://raw.githubusercontent.com/hashgraph/hedera-cli/main/src/commands/script/examples.json --merge
```

## Connecting the CLI tool with your Local Hedera Network

The Hedera CLI tool can be used to interact with a local Hedera network. This is useful for testing and development purposes. To connect the CLI tool with your local Hedera network, you need to set up a local Hedera network. You can follow the instructions in the [Hedera documentation](https://docs.hedera.com/hedera/tutorials/more-tutorials/how-to-set-up-a-hedera-local-node) to set up a local Hedera network.

By default, the `src/state/config.ts` file contains the default configuration for the localnet. You can change the configuration to match your local network by editing the `src/state/config.ts` file and then setting the operator key and ID using the `setup init` command. The default configuration for the localnet is:

```json
{
  "localNodeAddress": "127.0.0.1:50211",
  "localNodeAccountId": "0.0.3",
  "localNodeMirrorAddressGRPC": "127.0.0.1:5600"
}
```

The `localnet` network can be configured in your `.env` file, so you can use the `setup init` command to add the localnet operator key and ID to your state. The default values for the localnet operator key and ID are:

```sh
LOCALNET_OPERATOR_ID=0.0.2
LOCALNET_OPERATOR_KEY=302e020100300506032b65700422042091132178e72057a1d7528025956fe39b0b847f200ab59b2fdd367017f3087137
```

## Video Guide

Learn how to use the Hedera CLI Tool by watching the video below.

> Video coming soon ⚠️

## Commands

Let's explore the different commands, their options, and outputs.

- [Setup Commands](#setup-commands): Instantiate or reset the Hedera CLI tool
- [Telemetry Commands](#telemetry-commands): Enable or disable telemetry
- [Network Commands](#network-commands): Switch Hedera networks
- [Wait Command](#wait-command): Wait for a specified amount of seconds
- [Account Commands](#account-commands): Create and manage accounts
- [Token Commands](#token-commands): Create and manage tokens
- [Topic Commands](#topic-commands): Create and manage topics
- [Hbar Command](#hbar-command): Transfer hbars between accounts
- [Backup Commands](#backup-commands): Create a backup of your state
- [State Commands](#state-commands): Manage the state of the CLI tool
- [Script Commands](#script-commands): Replay and manage script blocks containing CLI commands
  - [Dynamic Variables in Scripts](#dynamic-variables-in-scripts): Use dynamic variables in scripts

> Each of the commands can be run with the `--help` flag to display the command's options and usage.
>
> Use the `--quiet` flag to suppress the output of the command or the `--verbose` flag to display more information.
>
> Use the `--debug` flag to enable detailed debugging information including API URLs, network configuration, and request parameters.

## Setup Commands

### setup

#### Overview

The setup command is an essential component of the Hedera CLI tool, designed to initialize and configure your working environment. This command facilitates the process of setting up the CLI with your operator key and ID.

```sh
setup init
setup reload
```

#### Usage

**1. Initialization:**
Sets up the CLI with the operator key and ID.

```sh
hcli setup init [--telemetry]
```

Flags:

- **Telemetry:** (optional) Enables telemetry. By default disabled. Hedera collects anonymous data to improve the CLI tool. For example, it records the command name, not the parameters or any other sensitive information.

When executed, the setup command performs several key functions:

**Environment Variable Validation:**
It reads the `PREVIEWNET_OPERATOR_KEY`, `PREVIEWNET_OPERATOR_KEY`, `TESTNET_OPERATOR_KEY`, `TESTNET_OPERATOR_ID`, `MAINNET_OPERATOR_KEY`, `MAINNET_OPERATOR_ID`, `LOCALNET_OPERATOR_ID`, and `LOCALNET_OPERATOR_KEY` variables from the `.env` file in the root of the CLI project.

**State Update:**
Once the localnet, previewnet, testnet, and mainnet operator key and ID are validated, these credentials are written to the persisted state file, which holds the configuration state of the CLI tool. The command will also add the operator accounts to your address book.

**2. Reload Operator Key and Id:**

Reload the operator key and ID from the `.env` file. This command is useful when you add new networks to your `.env` file and want to update the state, so you can use the new networks.

```sh
hcli setup reload [--telemetry]
```

Flags:

- **Telemetry:** (optional) Enables telemetry. By default disabled. Hedera collects anonymous data to improve the CLI tool. For example, it records the command name, not the parameters or any other sensitive information.

## Telemetry Commands

### Overview

The telemetry command in the Hedera CLI tool is designed to enable or disable telemetry. This feature allows users to opt-in or opt-out of telemetry data collection. Hedera **anonymizes data** and only records the command name, not the parameters or any other sensitive information. For example, it records `account create` but not the account name or ID. The data is used to improve the CLI tool and provide better features and functionality, by trying to understand how users use the CLI. However, the CLI tool uses a UUID to identify the user, so no personal information is collected. This allows us to better understand how users interact with the CLI tool.

```sh
telemetry enable
telemetry disable
```

#### Usage

**1. Enable telemetry:**

This command enables telemetry and sets the `telemetry` variable in the state to `1`.

```sh
hcli telemetry enable
```

**2. Disable telemetry:**

This command disables telemetry and sets the `telemetry` variable in the state to `0`.

```sh
hcli telemetry disable
```

## Smart Contract Commands

### Overview

The CLI tool uses Hardhat for all smart contract interactions. There are no dedicated commands for smart contracts in the CLI tool. Instead, you can use the Hardhat commands to deploy and interact with smart contracts.

### Contract Storage

Contracts are stored in the **`src/contracts` folder**. You can create a new contract by adding a new file in this folder. By default, you can find an `erc20.sol` and `erc721.sol` files.

### Hardhat Scripts

To deploy a smart contract and interact with it, you can use the Hardhat scripts. The CLI tool stores the scripts in the **`src/contracts/scripts` folder**. You can create a new script by adding a new file in this folder. By default, you can find a `deploy.js` file that demonstrates how to deploy the `erc20.sol` contract.

### Configuring Hardhat

Make sure the your `hardhat.config.js` file is configured correctly to interact with one of the Hedera networks. By default, the CLI tool uses the `local` network, which is configured for the Hedera Local Node. You can add the `mainnet`, `testnet`, or `previewnet` networks to the Hardhat configuration file.

> A sample config is included in the project. If you configure the `mainnet`, `testnet`, or `previewnet` networks, make sure to set the operator key and ID in your `.env` file in the HEX format. You can see the example config reads the operator key from the `.env` file using, for example the `process.env.TESTNET_OPERATOR_KEY_HEX`. Don't forget to set these HEX-based variables in your `.env` file.

```json
{
  // ... other Hardhat configuration options
  "defaultNetwork": "local",
  "networks": {
    /*mainnet: {
      url: stateController.default.get('rpcUrlMainnet'),
      accounts: [process.env.MAINNET_OPERATOR_KEY_HEX],
      chainId: 295,
    },*/
    /*testnet: {
      url: stateController.default.get('rpcUrlTestnet'),
      accounts: [process.env.TESTNET_OPERATOR_KEY_HEX],
    },*/
    /*previewnet: {
      url: stateController.default.get('rpcUrlPreviewnet'),
      accounts: [process.env.PREVIEWNET_OPERATOR_KEY_HEX],
      chainId: 297,
    },*/
    "local": {
      "url": "http://localhost:7546",
      "accounts": [
        "0x105d050185ccb907fba04dd92d8de9e32c18305e097ab41dadda21489a211524",
        "0x2e1d968b041d84dd120a5860cee60cd83f9374ef527ca86996317ada3d0d03e7"
      ],
      "chainId": 298
    }
  }
}
```

_Note: If you configure an account but don't provide a URL or accounts array, the CLI tool will fail upon starting. Make sure to provide a valid URL and accounts array for the network you want to use. If you don't want to use a network, leave it commented out._

### Running Hardhat Scripts

If you have added new Hardhat scripts to `src/contracts/scripts`, you need to compile the contracts first. You can do this by running the following command in the root of the CLI tool:

```sh
npx hardhat compile
```

This command compiles the contracts and generates the necessary artifacts in the `dist/contracts` folder. The compiled contracts will be used by the Hardhat scripts to deploy and interact with the contracts.

To run a script, make sure to point to the `dist` folder (after running `npm run build`) and use the `hardhat run` command. For example, to deploy the `erc721.sol` contract, you can run the following command in the root of the CLI tool:

```sh
npx hardhat run ./dist/contracts/scripts/erc721/deploy.js --network local
```

### Integrating Hardhat with the CLI Script Blocks Feature

The script feature let's you execute script blocks. Here's how you can integrate Hardhat commands into the CLI tool's script feature:

```json
"scripts": {
    "script-erc721": {
      "name": "erc721",
      "creation": 1742830623351,
      "commands": [
        "hardhat compile",
        "hardhat run ./dist/contracts/scripts/erc721/deploy.js --network local",
        "hardhat run ./dist/contracts/scripts/erc721/mint.js --network local",
        "hardhat run ./dist/contracts/scripts/erc721/balance.js --network local"
      ],
      "args": {}
    }
}
```

Next, it's possible to store data from Hardhat scripts in the `args` field of the script block you are executing. For example, this allows you to deploy a smart contract and store the contract address in the `args` field. You can then reference it as a varaible in other commands in this script block or use it in other Hardhat scripts.

```javascript
const stateController = require('../../../state/stateController.js').default; // default import

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log('Deploying contracts with the account:', deployer.address);

  // The deployer will also be the owner of our token contract
  const ERC721Token = await ethers.getContractFactory('ERC721Token', deployer);
  const contract = await ERC721Token.deploy(deployer.address);
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log('ERC721 Token contract deployed at:', contractAddress);

  // Store address in script arguments as "erc721address"
  stateController.saveScriptArgument('erc721address', contractAddress);
}

main().catch(console.error);
```

In this example, the `erc721address` variable is stored in the `args` object of the script you are executing. You can then use this variable in other scripts by retrieving it again (`stateController.getScriptArgument(erc721address)`) and using it in your Hardhat scripts.

_Don't forget to use `.default` when importing the `stateController` in your Hardhat scripts, as shown above._

As mentioned, you can build interesting script blocks that combine regular CLI command and the execution of Hardhat scripts. This allows you to automate the deployment and interaction with smart contracts directly from the CLI tool.

```json
{
  "name": "account-storage",
  "commands": [
    "account create -n alice --args accountId:aliceAccId", // Create account and store account Id
    "hardhat compile", // Compile contracts
    "hardhat run ./dist/contracts/scripts/account-storage/deploy-acc-storage.js", // Deploy the contract
    "hardhat run ./dist/contracts/scripts/account-storage/add-account-id.js" // Add Alice's account ID to the contract
  ],
  "args": {}
}
```

## Network Commands

### Overview

The network command in the Hedera CLI tool is designed to manage and interact with different Hedera networks. It allows users to switch between networks and list available networks. This flexibility is crucial for developers who need to test their applications in different network environments.

```sh
network use
network list
```

#### Usage

**1. Switching Networks:**

This command switches the current network context to the specified network.

```sh
hcli network use <name>
```

Replace `<name>` with the name of the network you wish to switch to (`mainnet`, `testnet`, `previewnet`, or `localnet` running the [Hedera network locally](https://docs.hedera.com/hedera/tutorials/more-tutorials/how-to-set-up-a-hedera-local-node)).

**2. Listing Available Networks:**

This command lists all available networks you've configured for the CLI tool. It's useful for confirming the network options and ensuring correct network names are used when switching networks.

```sh
hcli network list
// Available networks: mainnet, testnet, previewnet, localnet
```

#### Description

The network command includes a catch-all for unknown subcommands. If an unrecognized command is entered, it triggers an error message and displays the help text for the network command.

```sh
// Invalid network name. Available networks: mainnet, testnet, previewnet, and localnet
```

## Wait Command

### Overview

The wait command in the Hedera CLI tool is designed to pause the execution of commands for a specified amount of time. This command is useful for waiting for transactions to be confirmed on the network or the mirror node to update before executing subsequent commands.

```sh
hcli wait <seconds>

// Example
hcli wait 3
```

The `wait` command is used in the [examples section](#other-examples) below.

## Account Commands

### Overview

The `account` command in the Hedera CLI tool encompasses a suite of subcommands designed for managing Hedera accounts. These subcommands provide functionalities for creating new accounts, retrieving account balances, listing accounts in the address book, importing existing accounts, and clearing the address book.

```sh
account create
account balance
account list
account import
account clear
account delete
account view
```

#### Usage

**1. Create a New Account:**

Initializes a new Hedera account (the CLI only supports ECDSA keys) with a specified name for internal referencing in the CLI state, and balance. The balance is optional and has a default if not specified. If you set the `--name random` flag, the CLI tool will generate a random 20-character long name.

```sh
hcli account create -n,--name <name> [-b,--balance <balance>]

// Example
hcli account create -n alice -b 100000000
hcli account create -n random
```

Flags:

- **-n, --name:** (required) A unique identifier for the new account. If you set the name to `random`, the CLI tool will generate a random 20-character long name.
- **-b, --balance:** (optional) Initial balance in tinybars. Defaults to 1000.

> **Note:** Setting the **`<name>` to `random`** will generate a random 20-char long name. This is useful for scripting functionality to avoid running into non-unique name errors. It's not allowed to use the word **operator** as an name or as part of an name because it's reserved for the operator accounts.

**2. Retrieve Account Balance:**

Displays the balance of a specified account. Users can choose to view only the Hbar balance or the balance of a specific token. It's not possible to use both options at once.

```sh
hcli account balance -a,--account-id-or-name <accountIdOrName> [-h,--only-hbar] [-t,--token-id <tokenId>]

// Output
Balance for account 0.0.5892294:
1000 hbars

Token balances:
0.0.5892308: 2
```

**3. List All Accounts:**

Lists all accounts stored in the address book. An optional flag allows displaying private keys.

```sh
hcli account list [-p,--private]

// Example output with -p flag
Accounts:
- Name: bob
  Account ID: 0.0.4536938
  Type: ECDSA
  Private Key: 30300201[...]
```

Flags:

- **-p, --private:** (optional) Displays private keys for each account.

**4. Import an Existing Account:**

Allows users to import an existing account into the CLI tool using the account's name, ID, type, and optionally private key. You can import accounts without a private key, but you won't be able to sign transactions with them.

```sh
hcli account import -n,--name <name> -i,--id <id> [-k,--key <key>]

// Example
hcli account import -n alice -i 0.0.5892294 -k 30300201[...]
hcli account import -n alice -i 0.0.12450
```

Flags:

- **-n, --name:** (required) Set the name for the imported account.
- **-i, --id:** (required) Provide the account ID.
- **-k, --key:** (optional) Provide private key for imported account.

**5. Clear All Accounts:**

Removes all account information from the address book.

```sh
hcli account clear
```

**6. Delete an Account:**

Deletes an account from the address book by its name or ID, don't use both at the same time. **If you don't provide an name or ID, the CLI tool will prompt you to select an account from your address book.**

```sh
hcli account delete [-n,--name <name>] [-i,--id <id>]
```

Flags:

- **-n, --name:** (optional) Name of the account to delete.
- **-i, --id:** (optional) Account ID of the account to delete.

**7. View Account Information:**

Displays detailed information about a specified account by its ID. The account can be in the CLI's state or on the Hedera network.

```sh
hcli account view -i,--id <id>

// Output
Account: 0.0.5401160
Balance Tinybars: 1000000000
Deleted: false
EVM Address: 0x0000000000000000000000000000000000526a48
Key type: ECDSA - Key: 4832f1d396ff123e4e[...]
Max automatic token associations: 0
```

Flags:

- **-i, --id:** (required) Account ID to view.

## Token Commands

### Overview

The `token` command in the Hedera CLI tool provides functionality for creating, associating, and transferring tokens on the Hedera network. It includes subcommands for creating fungible tokens, associating tokens, and transferring tokens between accounts.

```sh
token create-from-file
token create
token associate
token transfer
```

#### Usage

**1. Create Token from File:**

This command allows users to create a new token by specifying a JSON file that contains the token's configuration. Files are stored in the `dist/input` folder of the project using the format `token.<filename>.json`. Replace `<filename>` with your desired filename.

```sh
hcli token create-from-file -f,--file <filename>
```

Flags:

- **File:** (required) Filename containing the token information in JSON format.

A token input file looks like below. You can define all properties you would normally define when using using the SDK to create a token. All of the properties are required except for the min/max values for custom fractional fees. If you don't need a key, leave it as an empty string.

```json
{
  "name": "myToken",
  "symbol": "MTK",
  "decimals": 2,
  "supplyType": "finite",
  "initialSupply": 1000,
  "maxSupply": 1000000,
  "keys": {
    "supplyKey": "<name:bob>",
    "treasuryKey": "<name:alice>",
    "adminKey": "<newkey:ecdsa:10000>",
    "feeScheduleKey": "",
    "freezeKey": "",
    "wipeKey": "",
    "pauseKey": "",
    "kycKey": ""
  },
  "customFees": [
    {
      "type": "fixed",
      "unitType": "token",
      "amount": 1,
      "denom": "0.0.3609946",
      "exempt": true,
      "collectorId": "0.0.2221463"
    },
    {
      "type": "fractional",
      "numerator": 1,
      "denominator": 100,
      "exempt": true,
      "collectorId": "0.0.2221463"
    }
  ],
  "memo": "Test token"
}
```

> **Note:** that you can use placeholders for all keys on a token. The format `<name:bob>` refers to an account with name `bob` in your address book. It will use Bob's key.
>
> You can also tell the CLI tool to create a new account with account type `ecdsa` and an initial balance in TinyBars. The `<newkey:ecdsa:10000>` placeholder creates a new ECDSA account with 10,000 TinyBars and uses its key for the admin key.

Here's how custom fees are defined in the token input file:

```json

### Token file schema & validation

The `token create-from-file` command validates your JSON definition against a strict schema (implemented with `zod`). The file must include ALL required fields; unknown or invalid values cause the command to fail (exit code set, no network transaction performed, and each validation error logged).

Key rules:

| Field | Rules |
| ----- | ----- |
| `name` | 1–100 characters |
| `symbol` | 1–20 characters |
| `decimals` | Integer 0–18 |
| `supplyType` | `finite` or `infinite` |
| `initialSupply` | Integer >= 0 |
| `maxSupply` | Required > 0 only when `supplyType` = `finite`; ignored (can be 0) for `infinite` |
| `memo` | Optional, up to 100 chars |
| `keys.treasuryKey` | REQUIRED (non‑empty string or placeholder). All other keys may be an empty string to omit |
| `customFees` | Array (can be empty). Each element must be a valid fixed or fractional fee (see below) |

Keys object (all properties must exist, but may be empty strings except `treasuryKey`):
```

{
"adminKey": "", "supplyKey": "", "wipeKey": "", "kycKey": "",
"freezeKey": "", "pauseKey": "", "feeScheduleKey": "", "treasuryKey": "<name:alice>"
}

````

Placeholders supported in any key field:

* `<name:ACCOUNT_NAME>` – replaced with the private key of an existing account in your address book.
* `<newkey:ecdsa:INITIAL_BALANCE_TINYBARS>` – creates a brand new ECDSA account with a random name and the given initial balance (tinybars), then substitutes its private key.

Notes:
* Only ECDSA new keys are allowed. `<newkey:ed25519:...>` is rejected.
* `treasuryId` is inferred automatically from the (resolved) `treasuryKey`'s account if not already known.
* Leave a key as an empty string (e.g. `"freezeKey": ""`) to omit that permission.

Custom fee validation:

Fixed fee (`type: "fixed"`):
* `amount`: positive integer
* `unitType`: one of `hbar`, `hbars`, `tinybar`, `tinybars`, `token`, `tokens`
* If `unitType` is `token`/`tokens`, `denom` (token ID) is required
* Optional: `collectorId` (account ID `shard.realm.num`), `exempt` (boolean)

Fractional fee (`type: "fractional"`):
* `numerator` / `denominator`: positive integers (denominator > 0)
* Optional: `min`, `max` (non‑negative integers); if both present then `min <= max`
* Optional: `collectorId`, `exempt`

Failure behavior:
* The CLI prints: `Token file validation failed` then each specific issue (e.g. `name: Required`) and sets `process.exitCode = 1`.
* No partial state is written and no token creation transaction is attempted.

Example minimal infinite‑supply definition (unused keys empty, no fees):
```json
{
  "name": "Example",
  "symbol": "EX",
  "decimals": 0,
  "supplyType": "infinite",
  "initialSupply": 0,
  "maxSupply": 0,
  "keys": {
    "supplyKey": "",
    "treasuryKey": "<name:alice>",
    "adminKey": "",
    "feeScheduleKey": "",
    "freezeKey": "",
    "pauseKey": "",
    "wipeKey": "",
    "kycKey": ""
  },
  "customFees": [],
  "memo": ""
}
````

Tip (scripting): Combine `--args` with placeholders to capture the newly created token's ID and keys for later commands, e.g. `--args tokenId:myTokenId`.

"customFees": [
{
"type": "fixed", // Indicates a fixed fee
"unitType": "token", // Indicates the denomination of the fee: "token", "hbar", or "tinybar"
"amount": 1, // Amount of the fee
"denom": "0.0.3609946", // If the unit type is "token", then you need to set a denominating token ID to collect the fees in
"exempt": true, // If true, exempts all the token's fee collector accounts from this fee.
"collectorId": "0.0.2221463" // Sets the fee collector account ID that collects the fee.
},
{
"type": "fractional", // Indicates a fractional fee
"numerator": 1, // Numerator of the fractional fee
"denominator": 100, // Denominator of the fractional fee: 1/100 = 1% fee on the transfer
"min": 1, // Optional: Minimum fee user has to pay
"max": 100, // Optional: Maximum fee user has to pay because fractional fees can become very costly
"exempt": true, // If true, exempts all the token's fee collector accounts from this fee.
"collectorId": "0.0.2221463" // Sets the fee collector account ID that collects the fee.
}
]

````

**2. Create Fungible Token:**

Creates a new fungible token with specified properties like name, symbol, treasury ID, treasury key, decimals, initial supply, and admin key.

```sh
hcli token create --treasury-id <treasuryId> --treasury-key <treasuryKey> --name <name> --symbol <symbol> --decimals <decimals> --supply-type <supplyType> --initial-supply <initialSupply> --admin-key <adminKey>
````

Flags:

- **Treasury ID:** (required) Treasury ID for the fungible token.
- **Treasury Key:** (required) Treasury key for the fungible token.
- **Name:** (required) Name of the fungible token.
- **Symbol:** (required) Symbol of the fungible token.
- **Decimals:** (required) Decimals of the fungible token.
- **Supply type:** (required) Supply type can be either `finite` or `infinite`.
- **Initial Supply:** (required) Initial supply of the fungible token.
- **Admin Key:** (required) Admin key of the fungible token.

> **Note:** It's better to use the `token create-from-file` if you want to set all properties for a token. The `token create` command only allows for a couple of options.

**3. Associate Token with Account:**

Associates a specified token with an account. Both the token ID and the account ID (or name) are required.

```sh
hcli token associate -a,--account-id <accountId> -t,--token-id <tokenId>

// Example
hcli token associate -a bob -t 0.0.5892309
```

Flags:

- Account ID: (required) Account ID or name to associate with the token.
- Token ID: (required) Token ID to be associated with the account.

**4. Transfer Fungible Token:**

Facilitates the transfer of a specified amount of a fungible token from one account to another.

```sh
hcli token transfer -t,--token-id <tokenId> --to <to> --from <from> -b,--balance <balance>
```

Flags:

- **Token ID:** (required) Token ID to transfer.
- **To:** (required) Account ID to transfer the token to (Can be an name or account ID).
- **From:** (required) Account ID to transfer the token from (Can be an name or account ID).
- **Balance:** (required) Amount of token to transfer. For example, if the token has 2 decimals, you need to transfer 100 to transfer 1 token.

## Topic Commands

### Overview

The `topic` command in the Hedera CLI tool provides functionality for creating topics and retrieving information about topics on the Hedera network.

```sh
topic create
topic list
topic message submit
topic message find
```

#### Usage

**1. Create Topic:**

Creates a new topic with a specified memo, submit key, and admin key. If you don't provide any options, a public topic will be generated. Setting the submit key creates a private topic. If you don't set an admin key, the topic is immutable.

```sh
hcli topic create [-s,--submit-key <submitKey>] [-a,--admin-key <adminKey>] [--memo <memo>]
```

Flags:

- **Submit Key:** (optional) Submit key for the topic.
- **Admin Key:** (optional) Admin key for the topic.
- **Memo:** (optional) Memo for the topic (100 bytes).

**2. List Topics:**

Lists all topics on the Hedera network known by the CLI tool.

```sh
hcli topic list
```

**3. Submit Message to Topic:**

Submits a message to a specified topic.

```sh
hcli topic message submit -t,--topic-id <topicId> -m,--message <message>
```

Flags:

- **Topic ID:** (required) Topic ID to submit the message to.
- **Message:** (required) Message to submit to the topic.

**4. Find Messages for Topic:**

Finds messages for a specified topic by its sequence number.

```sh
hcli topic message find -t,--topic-id <topicId> [-s,--sequence-number <sequenceNumber>] [--sequence-number-gt <sequenceNumberGreaterThan>] [--sequence-number-lt <sequenceNumberLessThan>] [--sequence-number-gte <sequenceNumberGreaterThanOrEqual>] [--sequence-number-lte <sequenceNumberLessThanOrEqual>] [--sequence-number-eq <sequenceNumberEqual>] [--sequence-number-ne <sequenceNumberNotEqual>]
```

Flags:

- **Topic ID:** (required) Topic ID to find the message for.
- **Sequence Number:** (optional) Sequence number of the message you want to find.
- **Sequence Number Greater than:** (optional) If you want to find all messages with a sequence number greater than the specified one.
- **Sequence Number Less than:** (optional) If you want to find all messages with a sequence number less than the specified one.
- **Sequence Number Greater than or Equal:** (optional) If you want to find all messages with a sequence number greater than or equal to the specified one.
- **Sequence Number Less than or Equal:** (optional) If you want to find all messages with a sequence number less than or equal to the specified one.
- **Sequence Number Equal:** (optional) If you want to find all messages with a sequence number equal to the specified one.
- **Sequence Number Not Equal:** (optional) If you want to find all messages with a sequence number not equal to the specified one.

## Hbar Command

### Overview

The `hbar` command in the Hedera CLI tool is designed for transferring tinybars (1 hbar = 100,000,000 tinybars) between accounts.

```sh
hcli hbar transfer -b,--balance <balance> [-f,--from <from>] [-t,--to <to>] [--memo <memo>]

// Example
hcli hbar transfer -f alice -t bob -b 100000000
hcli hbar transfer -f alice -t 0.0.12345 -b 100000000 --memo "Transfer memo"
```

Flags:

- **Balance:** (required) Amount of tinybars to transfer.
- **From:** (optional) Account ID or name to transfer the hbars from.
- **To:** (optional) Account ID or name to transfer the hbars to.
- **Memo:** (optional) Memo for the transfer.

> **Note:** If you don't specify a `from` or `to` account, the CLI tool will prompt you to select an account from your address book, listed by name.

## Backup Commands

### Overview

The `backup` command in the Hedera CLI tool is designed for creating backups of the `state.json` file, which contains configuration and state information.

```sh
backup create
backup restore
```

#### Usage

**1. Creating Backup:**

This command creates a backup of the `state.json` file. The backup file is named using a timestamp for easy identification and recovery. The format is: `state.backup.<timestamp>.json`. The backup is stored in the same `dist/state` directory as `state.json`. It's possible to provide a custom name for the backup file: `state.backup.<name>.json`.

Further, you can also provide a custom path for your backup, which is useful if you want to export a clean testing state in another application that can be used to run E2E tests.

```sh
hcli backup create [--path <path>] [--name <name>] [--accounts] [--safe]

// Example
hcli backup create --name e2e --path /Users/myUser/projects/xyz/
hcli backup create --accounts --safe
hcli backup create --safe
```

Flags:

- **Name:** (optional) Filename of the backup file. Defaults to `state.backup.<timestamp>.json`.
- **Accounts:** (optional) Creates a backup of the accounts section of the state. The backup file is named `accounts.backup.<timestamp>.json`.
- **Safe:** (optional) Removes private information from the backup like token keys, account keys, and operator key/ID. It does not remove the private keys in scripts' commands.

**2. Restoring Backup:**

This command restores a backup of the `state.json` file stored in the same `dist/state` directory, it can't detect backups stored elsewhere. It only restores state files with the format `*.backup.*.json`. If you don't provide a filename, the CLI tool will list all available backups that match this pattern and ask you to select one.

```sh
hcli backup restore -f,--file <filename> [--restore-accounts] [--restore-tokens] [--restore-scripts]
```

Flags:

- **File:** (optional) Filename of the backup file to restore. If you don't provide a filename, the CLI tool will list all available backups and ask you to select one.
- **Restore Accounts:** (optional) Restores the accounts section of the state.
- **Restore Tokens:** (optional) Restores the tokens section of the state.
- **Restore Scripts:** (optional) Restores the scripts section of the state.

Example: You can combine the flags to restore only certain parts of the state. For example, you can restore only the accounts and tokens section of the state by using the following command:

```sh
hcli backup restore -f state.backup.1704321015228.json --restore-accounts --restore-tokens
```

You can also restore an account backup by using the following command (which restores only the accounts section of the state):

```sh
hcli backup restore -f accounts.backup.7-nov-2024.json
```

> **Note: If you don't provide a filename, the CLI tool will list all available backups and ask you to select one.** You can still use the flags to restore only certain parts of the state.

## State Commands

### Overview

The `state` command in the Hedera CLI tool is designed for managing the state of the CLI tool. It allows users to view the current state, clear the state, and download a new state via a remote URL.

```sh
state download
state view
state clear
```

#### Usage

**1. Download State:**

Downloads a state file from an external URL and merges or overwrites it into your persisted state file. You can use this command to update your state with new accounts, tokens, or scripts.

```sh
hcli state download --url <url> [--overwrite] [--merge]
```

Flags:

- **URL:** (required) URL to download the state file from.
- **Overwrite:** (optional) Overwrites the current state file with the contents of the downloaded file.
- **Merge:** (optional) Merges the downloaded state file with the current state file. It won't fail when the state file contains duplicate keys.

Format for remote script files:

```json
{
  "accounts": {
    "myname": {
      "network": "testnet",
      "name": "myname",
      "accountId": "0.0.7426198",
      "type": "ecdsa",
      "publicKey": "302d300706052b8104000a03220003732a9daae40e2a41ccd10dd35b521cbcafdd4bf906a66e37d0a65512a1d7db23",
      "evmAddress": "a5accb5010ad3ee50c66a433d5b8fdfe0d0eab59",
      "solidityAddress": "0000000000000000000000000000000000715096",
      "solidityAddressFull": "0x0000000000000000000000000000000000715096",
      "privateKey": "303002010030[...]"
    }
  },
  "scripts": {
    "script-script1": {
      "name": "script1",
      "commands": ["account create -n alice", "account create -n bob"]
    }
  },
  "tokens": {
    "0.0.7426199": {
      "network": "testnet",
      "associations": [],
      "tokenId": "0.0.7426199",
      "name": "myToken",
      "symbol": "MTK",
      "treasuryId": "0.0.7426195",
      "decimals": 2,
      "initialSupply": 1000,
      "supplyType": "finite",
      "maxSupply": 1000000,
      "keys": {
        "adminKey": "303002010030[...]",
        "pauseKey": "",
        "kycKey": "",
        "wipeKey": "",
        "freezeKey": "",
        "supplyKey": "302e02010030[...]",
        "feeScheduleKey": "",
        "treasuryKey": "302e02010030[...]"
      }
    }
  },
  "topics": {
    "0.0.7426199": {
      "network": "testnet",
      "topicId": "0.0.7426199",
      "memo": "Test topic",
      "submitKey": "302a300506032b6570032100[...]",
      "adminKey": "302a300506032b6570032100[...]"
    }
  }
}
```

_You can access an example [here](https://gist.githubusercontent.com/michielmulders/f8ae878431d3d551ecf5e478e9e96ea5/raw/9d5c0329eb3fe5bfda02b8ec1880c5894bd4539e/stateUpdate.json). You can use it like this:_

```sh
hcli state download --url https://gist.githubusercontent.com/michielmulders/f8ae878431d3d551ecf5e478e9e96ea5/raw/9d5c0329eb3fe5bfda02b8ec1880c5894bd4539e/stateUpdate.json --overwrite
```

**2. View State:**

Displays the current state of the CLI tool.

```sh
hcli state view [--accounts] [--tokens] [--scripts] [--account-name <account-name>] [--account-id <account-id>] [--token-id <token-id>]
```

Flags:

- **Accounts:** (optional) Displays the accounts section of the state.
- **Tokens:** (optional) Displays the tokens section of the state.
- **Scripts:** (optional) Displays the scripts section of the state.
- **Account Name:** (optional) Displays the account with the specified name.
- **Account ID:** (optional) Displays the account with the specified ID.
- **Token ID:** (optional) Displays the token with the specified ID.

**3. Clear State:**

Clears the state of the CLI tool. This command is useful for resetting the state to its initial state. Depending on the flags provided, it resets the entire state or skips certain parts of the state, such as the accounts, tokens, or scripts sections in your state. For example, this might be useful when you want to reset your state but keep your address book (`state.accounts`).

```sh
hcli state clear [-a,--skip-accounts] [-t,--skip-tokens] [-s,--skip-scripts]
```

Flags:

- **-a, --skip-accounts**: (optional) Skips clearing accounts.
- **-t, --skip-tokens:** (optional) Skips clearing tokens.
- **-s, --skip-scripts:** (optional) Skips clearing scripts.

## Script Commands

### Overview

The `script` command in the Hedera CLI tool allows users to load and execute script blocks. This command is particularly useful for automating repetitive tasks or for quickly setting up specific states or environments that have been captured in a script.

```sh
script load
script list
script delete
```

#### Usage

**1. Load and Execute Script Blocks:**

Loads a script by name from state and sequentially executes each command in the script.

```sh
hcli script load -n,--name <name>
```

Each command is executed via [`execSync`](https://nodejs.org/api/child_process.html), which runs the command in a synchronous child process. Scripts are stored in the persisted state file, in the `scripts` section.

**Make sure to append each script with `script-` prefix. The name of the script is just the name without the `script-` prefix.** If you want to load this script, you use `hcli script load -n erc721`, without the `script-` prefix.

```
"scripts": {
    "script-erc721": {
      "name": "erc721",
      "creation": 1742830623351,
      "commands": [
        "hardhat compile",
        "hardhat run ./dist/contracts/scripts/erc721/deploy.js --network local",
        "hardhat run ./dist/contracts/scripts/erc721/mint.js --network local",
        "hardhat run ./dist/contracts/scripts/erc721/balance.js --network local"
      ],
      "args": {}
    }
}
```

**2. List All Scripts:**

Lists all scripts stored in the persisted state file.

```sh
hcli script list
```

**3. Delete Script:**

Deletes a script from the persisted state file.

```sh
hcli script delete -n,--name <name>
```

### Dynamic Variables in Scripts

The dynamic variables feature in our script execution command (`script load`) allows you to store variables during script execution and reference them in other commands within the script. This feature enhances script flexibility and reusability by enabling you to replace options with arguments or state variables, and store and retrieve variables as needed.

**Here's a [list of all commands and the variables](#mapping-dynamic-variables-to-commands) they expose, which you can use in your scripts.**

#### Examples

The following example shows how you can use dynamic variables to create a script that creates three accounts, creates a token, associates the token with the third account, and transfers one token from the second account (treasury) to the third account. Then, it displays the token state and the balance of the third account. Often, it will tell you that the third account has a `0` balance because the mirror node hasn't updated yet. _When a command fails, the script execution stops and the error is displayed._

```json
{
  "name": "transfer",
  "commands": [
    "network use testnet",
    "account create -n random --args privateKey:privKeyAcc1 --args name:nameAcc1 --args accountId:idAcc1",
    "account create -n random --args privateKey:privKeyAcc2 --args name:nameAcc2 --args accountId:idAcc2",
    "account create -n random --args privateKey:privKeyAcc3 --args name:nameAcc3 --args accountId:idAcc3",
    "token create -n mytoken -s MTK -d 2 -i 1000 --supply-type infinite -a {{privKeyAcc1}} -t {{idAcc2}} -k {{privKeyAcc2}} --args tokenId:tokenId",
    "token associate --account-id {{idAcc3}} --token-id {{tokenId}}",
    "token transfer -t {{tokenId}} -b 1 --from {{nameAcc2}} --to {{nameAcc3}}",
    "wait 3",
    "account balance --account-id-or-name {{nameAcc3}} --token-id {{tokenId}}",
    "state view --token-id {{tokenId}}"
  ],
  "args": {}
}
```

> Make sure to not use a space between the variable name and the arrow notation (`:`). Otherwise, the CLI tool will not recognize the variable. `--args name:nameAcc1` is correct, `--args name : nameAcc1` is not.

The below command shows how to create a new account on testnet with 1 hbar and prints the hbar balance.

```json
{
  "name": "account-create",
  "commands": [
    "network use testnet",
    "account create -n random -b 100000000 --args privateKey:privKeyAcc1 --args name:nameAcc1 --args accountId:idAcc1",
    "wait 3",
    "account balance --account-id-or-name {{idAcc1}} --only-hbar"
  ],
  "args": {}
}
```

This example shows how to use Hardhat scripts as part of your flow, mixing it with other commands. It creates a random account, waits for 3 seconds, and then runs a Hardhat script to deploy contracts:

```json
{
  "name": "hardhat-deploy",
  "commands": [
    "account create -n random --args privateKey:privKeyAcc1 --args name:nameAcc1 --args accountId:idAcc1",
    "wait 3",
    "hardhat run ./dist/contracts/scripts/deploy.js --network local"
  ],
  "args": {}
}
```

#### Mapping Dynamic Variables to Commands

Not each command exposes the same variables. Here's a list of commands and the variables they expose, which you can use in your scripts.

| Command                  | Variables                                                                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `account create`         | `name`, `accountId`, `type`, `publicKey`, `evmAddress`, `solidityAddress`, `solidityAddressFull`, `privateKey`                                    |
| `account import`         | `name`, `accountId`, `type`, `publicKey`, `evmAddress`, `solidityAddress`, `solidityAddressFull`, `privateKey`                                    |
| `account view`           | `accountId`, `balance`, `evmAddress`, `type`, `maxAutomaticTokenAssociations`                                                                     |
| `token create`           | `tokenId`, `name`, `symbol`, `treasuryId`, `adminKey`                                                                                             |
| `token create-from-file` | `tokenId`, `name`, `symbol`, `treasuryId`, `treasuryKey`, `adminKey`, `pauseKey`, `kycKey`, `wipeKey`, `freezeKey`, `supplyKey`, `feeScheduleKey` |
| `topic create`           | `topicId`, `adminKey`, `submitKey`                                                                                                                |
| `topic message submit`   | `sequenceNumber`                                                                                                                                  |

# Configuration & State Storage

The CLI externalizes both its immutable base configuration and mutable runtime state. No editable JSON lives in `src/state/` anymore.

## State file location

Default path (created on first write):

- macOS / Linux: `~/.config/hedera-cli/state.json` (respects `XDG_CONFIG_HOME`)
- Windows: `%APPDATA%/hedera-cli/state.json`

Override with an absolute path:

```sh
export HCLI_STATE_FILE=/custom/path/my-hcli-state.json
```

## User config overrides

Provide optional overrides with a cosmiconfig file (module name `hedera-cli`):

- `hedera-cli.config.{js,ts,cjs,mjs,json}`
- `.hedera-clirc` (JSON / YAML)
- `package.json` (key: `hedera-cli`)

Or explicitly:

```sh
export HCLI_CONFIG_FILE=/absolute/path/config.json
```

Only supplied keys override defaults; others fall back to `src/state/config.ts`.

### Example user config

An example cosmiconfig file is included as `hedera-cli.config.json` in the repository root. Treat this as a starting point – copy or rename it (e.g. to `hedera-cli.config.local.json`, which you should gitignore) and edit only the values you need. You can also point `HCLI_CONFIG_FILE` to a file stored elsewhere if you prefer to keep secrets out of the repo.

Example contents:

```json
{
  "network": "testnet",
  "telemetry": 0,
  "networks": {
    "localnet": {
      "rpcUrl": "http://localhost:7546",
      "mirrorNodeUrl": "http://localhost:5551/api/v1",
      "operatorKey": "",
      "operatorId": "",
      "hexKey": ""
    },
    "customnet": {
      "rpcUrl": "https://rpc.customnet.hedera.example/api",
      "mirrorNodeUrl": "https://mirror.customnet.hedera.example/api/v1",
      "operatorKey": "",
      "operatorId": "",
      "hexKey": ""
    }
  }
}
```

Guidelines:

- The file is a partial overlay; omit keys you don't want to override.
- Runtime sections (`accounts`, `tokens`, `topics`, `scripts`) are managed by the CLI and should not be placed here.
- Keep real operator keys out of version control; prefer environment variables or a private, untracked config file.
- To use a custom path:

```sh
export HCLI_CONFIG_FILE=/absolute/path/to/my-hcli-config.json
```

### Inspecting configuration at runtime

Use the new command to inspect the layered configuration:

```sh
hcli config view          # merged view (base + user overrides + runtime metadata)
hcli config view --active # just the active network's settings
hcli config view --json   # machine-readable output
```

### User config validation

User-provided configuration overlays are validated against a strict schema. If the file contains unknown keys, invalid URL fields, or out-of-range values (e.g. `telemetry: 2`), the entire overlay is ignored and a warning is printed. This prevents partially-applied ambiguous configuration.

Allowed keys:

- `network` (string)
- `telemetry` (0 or 1)
- `telemetryServer` (valid URL)
- `networks` (object mapping network name -> partial network config with `mirrorNodeUrl` (URL), `rpcUrl` (URL), `operatorKey`, `operatorId`, `hexKey` strings)

Example warning:

```
Invalid user config at /path/hedera-cli.config.json:
telemetry: Number must be less than or equal to 1
extraKey: Unrecognized key(s) in object
```

Fix the issues and re-run any command; the corrected file will be re-loaded automatically on next access.

## Layering order

1. Base defaults (`src/state/config.ts`)
2. User config (cosmiconfig or `HCLI_CONFIG_FILE`)
3. Persisted runtime state (accounts, tokens, topics, scripts, args, telemetry flag, selected network)

## Inspecting state

Use commands instead of editing the JSON manually:

```sh
hcli state view --accounts
hcli state view --tokens
```

## Backups

Create or restore backups via `hcli backup create|restore`. Backups sit beside your `state.json` unless you pass `--path`. Use `--safe` to strip private keys.

## Temporary / test usage

Run an isolated session without touching your main state:

```sh
HCLI_STATE_FILE=$(mktemp -t hcli-state.json) hcli account list
```

## Resetting

Delete the file or run `hcli state clear` (optionally skipping sections) to reinitialize.

## Contributing

Whether you’re fixing bugs, enhancing features, or improving documentation, your contributions are important — let’s build something great together!
Please read our [contributing guide](https://github.com/hiero-ledger/.github/blob/main/CONTRIBUTING.md) to see how you can get involved.

### Development Mode

You can run the application in development mode. It watches the `src` folder and recompiles automatically. The runtime state now lives outside the repository (e.g. `~/.config/hedera-cli/state.json`). No seeding or copying JSON files is required.

If you want an isolated state for a development session, point `HCLI_STATE_FILE` to a temporary path before starting the watcher:

```sh
export HCLI_STATE_FILE=$(pwd)/.dev-state.json
npm run dev-build
```

Remove that file or unset the variable to return to your default OS config path. Lint or format the code using:

```sh
npm run lint
npm run format
```

### Config

**How to handle config?**

If you add features that affect the initial config, make sure to update both the `state/config.ts` and `types/state.d.ts` files.

## Unit Testing

You need to create a local clone of commander program each time you run a unit test to ensure test encapsulation: `const program = new Command();`

Use `program.parseAsync` if you are testing an asynchronous command.

```js
const { Command } = require('commander');
const networkCommands = require('../../commands/network');

const fs = require('fs');

describe('network commands', () => {
  describe('network switch command', () => {
    test('switching networks successfully', () => {
      // Arrange
      fs.readFileSync = jest.fn(() => JSON.stringify({ network: 'mainnet' })); // Mock fs.readFileSync to return a sample config
      fs.writeFileSync = jest.fn(); // Mock fs.writeFileSync to do nothing
      //console.log = jest.fn(); // Mock console.log to check the log messages

      const program = new Command();
      networkCommands(program);

      // Act
      program.parse(['node', 'hedera-cli.js', 'network', 'use', 'testnet']);

      // Assert
      const opts = program.opts();
      expect(opts.network).toBe('testnet');
      // expect(program.args).toEqual(["--type", "order-cake"]);

      // Check that console.log was called with the correct message
      expect(console.log).toHaveBeenCalledWith('Switched to testnet');

      // Check that fs.writeFileSync was called with the updated config
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.any(String), // path
        JSON.stringify({ network: 'testnet' }, null, 2),
        'utf-8',
      );
    });
  });

  describe('network switch ls', () => {
    // [...]
  });
});
```

## E2E Testing

The E2E tests run on localnet and use the state from the resolved persisted state file path.

### Dynamic Variables

[Dynamic variables](#dynamic-variables-in-scripts) are variables that are stored in the state and can be used in scripts. They are useful for storing information that is generated during script execution and can be used in other commands within the script.

#### How to allow processing of dynamic variables in a command?

To allow processing of dynamic variables in a command, you need to add a single line of code converting the dynamic variables in your `options` to their actual values. Don't forget to import the `dynamicVariablesUtils` which holds the `replaceOptions` function.

```js
import dynamicVariablesUtils from '../../utils/dynamicVariables';

program
    .command('create')
    .action(async (options: CreateAccountOptions) => {
      options = dynamicVariablesUtils.replaceOptions(options);
      // [...]
    })
```

#### How to allow storing variables in the state?

To allow dynamic variables in a command, you need to add the `--args` flag to the command. The `--args` flag takes a list of arguments that are allowed to be dynamic variables.

```js
program
    .command('create')
    // ...
    .option(
      '--args <args>',
      'Store arguments for scripts',
      (value: string, previous: string) =>
        previous ? previous.concat(value) : [value],
      [],
    )
```

Further, for each command you want to allow the user to store variables, you need to define a command action. Command actions define the mapping between script commands and the corresponding actions. You can specify actions for different commands and use them when storing variables.

```js
const commandActions: CommandActions = {
  account: {
    create: {
      action: 'accountCreate',
    },
    import: {
      action: 'accountImport',
    },
  },
  token: {
    create: {
      action: 'tokenCreate',
    },
    createFromFile: {
      action: 'tokenCreateFromFile',
    }
  },
};
```

Next, you can define command outputs for your action. Command outputs define the output variables that can be captured and stored for specific actions. You can specify the output variables for each action to use them later in the script.

```js
const commandOutputs: CommandOutputs = {
  accountCreate: {
    name: 'name',
    accountId: 'accountId',
    type: 'type',
    publicKey: 'publicKey',
    evmAddress: 'evmAddress',
    solidityAddress: 'solidityAddress',
    solidityAddressFull: 'solidityAddressFull',
    privateKey: 'privateKey',
  },
  // Define outputs for other actions here
};
```

Make sure that each property you define exists in the output for the command. Here's the code for the `accountCreate` command. The `accountDetails` output contains all the properties defined in the `commandOutputs` object. If you define a property in the `commandOutputs` object that doesn't exist in the `accountDetails` output, the script execution will fail.

```js
.action(async (options: CreateAccountOptions) => {
  options = dynamicVariablesUtils.replaceOptions(options);
  try {
    let accountDetails = await accountUtils.createAccount(
      options.balance,
      options.type,
      options.name,
    );

    // Store dynamic variables
    dynamicVariablesUtils.storeArgs(
      options.args,
      dynamicVariablesUtils.commandActions.account.create.action,
      accountDetails,
    );
  } catch (error) {
    logger.error(error as object);
  }
});
```

The `storeArgs` function takes the `options.args` and the `commandAction` as arguments. It then stores the output variables in the state according to the user's instructions.

Whenever changing the `commandActions` or `commandOutputs` objects, make sure to update the documentation as well.

### Logging & Error Handling

The CLI uses a centralized logger singleton (`src/utils/logger.ts`) with four modes:

| Mode    | Set via CLI flag                    | Env (`HCLI_LOG_MODE`) | Behavior                                                                      |
| ------- | ----------------------------------- | --------------------- | ----------------------------------------------------------------------------- |
| normal  | (default)                           | normal                | Show standard logs only                                                       |
| verbose | `--verbose` or `--log-mode verbose` | verbose               | Adds verbose tracing lines                                                    |
| quiet   | `--quiet` or `--log-mode quiet`     | quiet                 | Suppresses standard logs (errors still shown)                                 |
| silent  | `--log-mode silent`                 | silent                | Suppresses all user-facing logs (still routed internally so tests can assert) |

### Debug Mode

The CLI includes a debug mode that provides detailed information about API calls, network configuration, and request parameters. This is particularly useful for troubleshooting network issues and understanding what URLs are being called.

**Debug mode can be enabled in three ways (in order of priority):**

1. **Command Line Flag** (highest priority):

   ```bash
   hedera-cli --debug account balance -a 0.0.2
   ```

2. **Environment Variable**:

   ```bash
   HCLI_DEBUG=true hedera-cli account balance -a 0.0.2
   # or
   HCLI_DEBUG=1 hedera-cli account balance -a 0.0.2
   ```

3. **Config File** (lowest priority):
   ```json
   {
     "network": "testnet",
     "debug": true,
     "networks": {
       // ... network configurations
     }
   }
   ```

**Debug output includes:**

- Current network configuration
- Account IDs, token IDs, and other request parameters
- Full mirror node URLs being called
- Base URLs for API endpoints
- Detailed error information including Axios error codes
- Request/response debugging information

**Example debug output:**

```
🔍 DEBUG: Current network: testnet
🔍 DEBUG: Account ID or name: 0.0.2
🔍 DEBUG: Only Hbar: false
🔍 DEBUG: Token ID: none
🔍 DEBUG: Resolved account ID: 0.0.2
🔍 DEBUG: Calling mirror node URL: https://testnet.mirrornode.hedera.com/api/v1/accounts/0.0.2
🔍 DEBUG: Mirror node base URL: https://testnet.mirrornode.hedera.com/api/v1
🔍 DEBUG: Account ID: 0.0.2
Balance for account 0.0.2:
1000000000 Hbars
```

Programmatic usage:

```ts
import { Logger } from '../../utils/logger';
const logger = Logger.getInstance();
logger.log('Hello');
logger.verbose('Diagnostic detail');
logger.error('Something failed');
```

All command handlers are wrapped with a standard error guard (`wrapAction` or `exitOnError`) ensuring that domain-specific failures (thrown as `DomainError`) set `process.exitCode` instead of abruptly exiting. This guarantees consistent telemetry flushing and avoids duplicated `try/catch` blocks. A unit test (`wrappingConsistency.test.ts`) enforces that every `.action(` is wrapped.

When adding a new command:

1. Prefer `wrapAction` from `src/commands/shared/wrapAction` (adds dynamic variable replacement + optional verbose pre-log + error handling).
2. If you need only error handling, use `exitOnError` directly.
3. Do not call `process.exit()` inside handlers; throw a `DomainError` instead.

Legacy env flags like `HCLI_SUPPRESS_CONSOLE` were removed—use the log modes above instead.

## Troubleshooting

### Common Issues

**Commands hanging or timing out:**
If commands seem to hang or take too long, enable debug mode to see what's happening:

```bash
hedera-cli --debug account balance -a 0.0.2
```

This will show you the exact URLs being called and help identify if the issue is with:

- Network connectivity
- Mirror node availability
- Incorrect network configuration
- API endpoint issues

**Network connection issues:**
Use debug mode to verify the correct mirror node URLs are being used:

```bash
HCLI_DEBUG=true hedera-cli network list
```

**API errors:**
Debug mode provides detailed error information including HTTP status codes and error messages from the Hedera Mirror Node API.

### Getting Help

- Join our [community discussions](https://discord.lfdecentralizedtrust.org/) on discord.
- Attend our [community calls](https://zoom-lfx.platform.linuxfoundation.org/meetings/hiero?view=week). 

## Support

If you have a question please refer to [our Hiero docs site](https://docs.hiero.org/).

## Code of Conduct

Hiero uses the Linux Foundation Decentralised Trust [Code of Conduct](https://www.lfdecentralizedtrust.org/code-of-conduct).

## License

[Apache License 2.0](LICENSE)
