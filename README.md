# Hedera CLI

Welcome to the Hedera CLI Tool, a powerful and intuitive command-line interface designed to streamline your interactions with the Hedera network. Whether you're a developer needing to set up test environments, automate network-related tasks, or explore the extensive capabilities of the Hedera mainnet and testnet, this tool is your one-stop solution.

The Hedera CLI Tool elegantly addresses the complexities associated with distributed ledger technologies. It simplifies the process of executing actions such as creating new accounts, sending transactions, managing tokens, and associating with existing tokens directly from the CLI. This high level of functionality and ease of use significantly reduces the barrier to entry for developers working on Hedera-based projects.

A key advantage of the Hedera CLI Tool is its potential to enhance your workflow. It's not just about performing individual tasks; it's about integrating these tasks into a larger, more efficient development process. With plans for future integration into Continuous Integration/Continuous Deployment (CI/CD) pipelines, this tool promises to be a versatile asset in the automation and management of Hedera network operations.

> **🎯 Feature requests** can be submitted on the Hedera CLI repository as an issue. Please check the [issues](https://github.com/hiero-ledger/hiero-cli/issues) before submitting a new one and tag it with the `Feature Request` label.

## Table of Contents

- [Quick Start](#quick-start)
- [Manual Setup (For Developers)](#manual-setup-for-developers)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Video Guide](#video-guide)
- [Plugins](#plugins)
- [Configuration & State Storage](#configuration--state-storage)
  - [State directory location](#state-directory-location)
  - [Script mode](#script-mode)
- [Getting Help](#getting-help)
- [Support](#support)
- [Code of Conduct](#code-of-conduct)
- [Contributing](#contributing)
- [License](#license)

## Quick Start

The easiest way to get started with Hedera CLI is to install it globally via npm:

```sh
npm install -g @hiero-ledger/hiero-cli
```

Once installed, you can use the CLI with the `hcli` command:

```sh
# Check available commands
hcli --help

# Example: Check account balance
hcli account balance --account-id 0.0.123456

# Example: Transfer HBAR
hcli hbar transfer --to 0.0.123456 --amount 10
```

**First-time setup (Initialization)**: When you run any command that requires an operator (like transferring HBAR or creating tokens) in interactive mode, the CLI will automatically launch an **initialization wizard** to guide you through configuring the operator account, private key, and settings. In script mode (non-interactive), an error will be thrown instead, requiring you to use `hcli network set-operator` to configure the operator first.

## Manual Setup (For Developers)

If you want to contribute to the development of the Hedera CLI or run it from source, follow these instructions.

### Prerequisites

Before proceeding with the installation and setup of the Hedera CLI Tool, ensure the following prerequisites are met:

### 1. Node.js Installation

The Hedera CLI Tool requires Node.js (version LTS 16.20.2 or higher). You can check your current version by running `node -v` in your terminal. If you do not have Node.js installed, you can download it from [Node.js official website](https://nodejs.org/en).

### 2. Hedera Account Setup

You will need an account on the Hedera network to interact with the ledger. Follow these steps to set up your account:

- Visit the [Hedera Portal](https://portal.hedera.com/) and create a new account.
- During the account creation process, you will receive a DER encoded private key and an account ID. These credentials are essential for authenticating and performing operations using the Hedera CLI Tool.

Make sure to securely store your DER encoded private key and account ID, as they are crucial for accessing and managing your Hedera account.

### 3. Git Installation

The Hedera CLI Tool repository is hosted on GitHub. You need to have Git installed to clone the repository. You can check your current version by running `git --version` in your terminal. If you do not have Git installed, you can download it from [Git official website](https://git-scm.com/).

## Installation

### 1. Clone the repository

Make sure to clone the repository. You can do this by running the following command in your terminal:

```sh
git clone https://github.com/hiero-ledger/hiero-cli.git
```

### 2. Install Dependencies

Navigate to the repository folder and install the necessary packages using `npm`. This sets up everything you need to get started with the Hedera CLI Tool.

```sh
cd hiero-cli
npm install
```

### 3. Build the Package

Compile the package to ensure all components are ready for use.

```sh
npm run build
```

### 4. CLI Initialization

The Hedera CLI initializes automatically when you run any command. The CLI loads default plugins and registers their commands. No manual setup is required.

When you first run the CLI, it will:

- Load all default plugins from `dist/plugins/`
- Initialize the Core API with the selected output format
- Register all plugin commands
- Use `testnet` as the default network

Note: There is a `test` plugin available that is required for running integration tests.

You can verify the installation by checking available commands:

```sh
node dist/hedera-cli.js --help
```

### 5. Set Up Operator Credentials

To interact with Hedera networks, you need to configure operator credentials for each network you want to use. Use the network plugin's `set-operator` command:

```sh
# Set operator for testnet using account name (if already imported)
node dist/hedera-cli.js network set-operator --operator my-testnet-account --network testnet

# Set operator for testnet using account-id:private-key pair
node dist/hedera-cli.js network set-operator --operator 0.0.123456:302e020100300506032b657004220420... --network testnet

# Set operator for mainnet
node dist/hedera-cli.js network set-operator --operator 0.0.123456:302e020100300506032b657004220420... --network mainnet
```

The operator credentials are stored in the CLI's state management system. Make sure that each operator account **contains at least 1 Hbar** for transaction fees.

> **💡 Note on Initialization**: When running the CLI interactively, if an operator is not configured and you attempt to run a command that requires it, the CLI will automatically launch an **interactive setup wizard** that guides you through configuring the operator, private key, and related settings. In script mode (non-interactive), if the operator is not configured, an error will be thrown instead.

### 6. Set Network

The CLI uses `testnet` as the default network. You can switch to other networks using the network plugin:

```sh
# Switch to mainnet
node dist/hedera-cli.js network use --network mainnet

# Switch to previewnet
node dist/hedera-cli.js network use --network previewnet

# Switch to localnet
node dist/hedera-cli.js network use --network localnet
```

### 7. Optional: Setting Up an Alias

To avoid typing the full command each time, you can set an alias in your shell profile. Replace the path with the absolute path to your `hiero-cli` installation.

#### macOS / Linux (bash/zsh)

Add the following line to your `~/.bashrc`, `~/.bash_profile`, or `~/.zshrc`:

```sh
alias hcli="node /path/to/hiero-cli/dist/hedera-cli.js"
```

Then reload your shell:

```sh
# For bash
source ~/.bashrc
# or
source ~/.bash_profile

# For zsh
source ~/.zshrc
```

#### Windows (PowerShell)

Add the following line to your PowerShell profile. First, open PowerShell and check if your profile exists:

```powershell
# Check if profile exists
Test-Path $PROFILE

# If it doesn't exist, create it
New-Item -ItemType File -Path $PROFILE -Force
```

Then add the following function to your profile:

```powershell
function hcli {
    node C:\path\to\hiero-cli\dist\hedera-cli.js @args
}
```

Then reload your PowerShell:

```powershell
. $PROFILE
```

Now you can use `hcli` with arguments just like on Unix systems.

## Connecting the CLI tool with your Local Hedera Network

The Hedera CLI tool can be used to interact with a local Hedera network. This is useful for testing and development purposes. To connect the CLI tool with your local Hedera network, you need to set up a local Hedera network. You can follow the instructions in the [Hedera documentation](https://docs.hedera.com/hedera/tutorials/more-tutorials/how-to-set-up-a-hedera-local-node) to set up a local Hedera network.

By default, the `src/core/services/network/network.config.ts` file contains the default configuration for the localnet. The default configuration is:

```typescript
{
  "localNodeAddress": "127.0.0.1:50211",
  "localNodeAccountId": "0.0.3",
  "localNodeMirrorAddressGRPC": "127.0.0.1:5600",
  "rpcUrl": "http://localhost:7546",
  "mirrorNodeUrl": "http://localhost:5551/api/v1"
}
```

To use the localnet, set the operator credentials using the network plugin:

```sh
hcli network set-operator --operator 0.0.2:302e020100300506032b65700123456789132178e72057a1d7528025956fe39b0b847f200ab59b2fdd367017f3087137 --network localnet
```

Then switch to the localnet:

```sh
hcli network use --network localnet
```

## Plugins

The Hedera CLI is built on a plugin architecture. The following default plugins are loaded automatically:

- **[Account Plugin](src/plugins/account/README.md)** - Create, import, manage accounts, and view balances
- **[Token Plugin](src/plugins/token/README.md)** - Create, associate, and transfer tokens
- **[Network Plugin](src/plugins/network/README.md)** - Switch networks, manage operator credentials, and check network health
- **[HBAR Plugin](src/plugins/hbar/README.md)** - Transfer HBAR between accounts
- **[Credentials Plugin](src/plugins/credentials/README.md)** - Manage operator credentials and keys
- **[Plugin Management Plugin](src/plugins/plugin-management/README.md)** - Add, remove, enable/disable, and inspect plugins
- **[Topic Plugin](src/plugins/topic/README.md)** - Create topics and manage topic messages
- **[Config Plugin](src/plugins/config/README.md)** - Inspect and update CLI configuration values

Each plugin has its own README with detailed documentation about available commands, usage examples, and architecture details. Click on the plugin name above to learn more.

# Configuration & State Storage

The CLI externalizes both its immutable base configuration and mutable runtime state. No editable JSON lives in `src/state/` anymore.

## State directory location

By default, the CLI stores plugin state in your home directory:

- **Default location**: `~/.hedera-cli/state/` (in your home directory)

Each plugin (or state namespace) uses its own JSON file inside this directory. These files are managed by the CLI; you typically should not edit them manually.

## Key Management

The CLI supports two storage methods for private keys:

- **`local`** - Keys are stored as plain text in the state directory (suitable for development and testing)
- **`local_encrypted`** - Keys are encrypted using AES-256-GCM before storage (recommended for production use)

### Setting the Default Key Manager

Configure the default key storage method using the config command:

```bash
# Set to plain text storage (development/testing)
hcli config set -o default_key_manager -v local

# Set to encrypted storage (production)
hcli config set -o default_key_manager -v local_encrypted
```

### Per-Operation Override

You can override the default key manager for specific operations by providing the `--key-manager` flag:

```bash
# Import account with encrypted key storage
hcli account import --id 0.0.123456 --key <private-key> --name myaccount --key-manager local_encrypted

# Set operator with plain text storage
hcli network set-operator --operator 0.0.123456:302e... --network testnet --key-manager local
```

This allows you to use different storage methods for different keys based on your security requirements.

### Getting Help

If you encounter issues not covered here, please:

1. Check the [GitHub issues](https://github.com/hiero-ledger/hiero-cli/issues) for similar problems
2. Create a new issue with debug output included and with a clear description

## Support

If you have a question on how to use the product, please see our [support guide](https://github.com/hashgraph/.github/blob/main/SUPPORT.md).

## Code of Conduct

This project is governed by the [Contributor Covenant Code of Conduct](https://github.com/hashgraph/.github/blob/main/CODE_OF_CONDUCT.md). By participating, you are
expected to uphold this code of conduct.

## Contributing

Contributions are welcome! Please check out the [CONTRIBUTING.md](CONTRIBUTING.md) file for guidelines.

## License

[Apache License 2.0](LICENSE)
