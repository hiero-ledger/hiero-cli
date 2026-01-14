### ADR-007: Smart contract plugin implementation (proposal)

- Status: Proposed
- Date: 2026-01-14
- Related: `src/core/*`, `src/plugins/*`

## Context

The Hiero CLI requires implementation of Smart Contract plugin that would handle deployment and verification of smart contract on Hedera network.
We should also add support for calling smart contract if for ERC-20 or ERC-721 smart contracts.

Goals:

- Compilation of Smart Contract defined in Solidity
- Deployment of compiled Smart Contract to the Hedera network
- Verification of deployed Smart Contract
- Calling and querying Smart Contract functions that are ERC-20 and ERC-721 type
- Command for listing deployed smart contract

## Decision

- We will use Solidity Compiler `solc` for compiling Solidity files which hold Smart Contract definitions
- We will use Hashgraph SDK to deploy compiled Smart Contract code
- For verification of deployed Smart Contract we will use `Smart Contract Verification API`
- This three steps mentioned above will be executed in a single command
- Deployed Smart Contract's information should be persisted in state and we should implement `list` command to view them
- Contracts marked as ERC-20 and ERC-721 should be supported for calling and querying the result of this operation.
  Each type should be put inside different plugin that will implement set of functions available for this type of SC

## Implementation Strategy

## Testing

1. Implementation of unit tests for new core services, and handlers inside new plugins
2. Additional integration tests for

## Consequences

**Positive:**

**Negative:**
