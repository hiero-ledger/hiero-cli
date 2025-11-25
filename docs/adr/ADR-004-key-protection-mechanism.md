### ADR-004: Key Protection Mechanism for Hedera CLI (Revised)

- Status: Proposed
- Date: 2025-11-03
- Supersedes: ADR-004 (original version dated 2025-10-31)
- Related: `src/hedera-cli.ts`, `src/core/*`, `src/plugins/*`

## Context

The Hedera CLI requires secure storage and management of sensitive cryptographic material, particularly private keys used for transaction signing. These keys must be protected at rest while remaining accessible to the CLI for authorized operations. The solution must balance security, usability, and cross-platform compatibility.

Goals:

- Protect private keys from unauthorized access when stored locally
- Minimize user friction while maintaining security
- Provide consistent behavior across Windows, macOS, and Linux
- Avoid plaintext key storage in configuration files or environment variables
- Enable secure key access without requiring constant re-authentication
- Avoid password prompts during normal CLI operations for seamless UX
- Keep implementation simple and avoid over-engineering
- Allow opt-out for development and testing environments
- Eliminate external dependencies and native module compilation requirements

## Decision

We will implement a two-layer key protection mechanism with **optional global opt-out for development environments**:

1. **File-Based Secret Storage**: For secure storage of auto-generated encryption passwords
2. **AES-256-GCM Encryption**: For encrypting private keys before persistence

### Layer 1: File-Based Secret Storage

Use a dedicated secure file in the CLI's configuration directory to store the auto-generated encryption password:

- **Storage Location**: `~/.hedera-cli/.secret`
- **Content**: Auto-generated cryptographically secure password (base64-encoded 32-byte random value)

**Key Design Decision**: The encryption password is generated automatically on first use and stored in a protected file, eliminating the need for user password input during normal operations.

**Alternatives Considered and Rejected:**

1. **System Keyring Integration (keytar/OS credential storage)**
   - Native module compilation issues across platforms
   - Unreliable in Linux (multiple keyring implementations)
   - Fails in headless/CI/CD environments
   - Additional 200KB+ dependency with native bindings
   - Maintenance concerns (limited active development)
   - Over-engineering for threat model (provides marginal security improvement over file-based approach)

2. **External Secret Managers (Vault, AWS Secrets Manager)**
   - Requires network connectivity for every operation
   - Adds external service dependency and latency
   - Complex setup for individual developers
   - Potential cost implications for users

3. **User Password for Each Operation**
   - Poor UX - interrupts workflow constantly
   - Password fatigue leads to weak passwords
   - Incompatible with automation and CI/CD
   - Users would disable it anyway

4. **Environment Variables**
   - Exposed in process listings and to child processes
   - Visible to all processes of the user
   - Often logged in crash dumps or system logs
   - Not suitable for long-term secret storage

### Layer 2: AES-256-GCM Encryption

Apply AES-256 in Galois/Counter Mode (GCM) for authenticated encryption of private keys:

- 256-bit key derived from auto-generated password via Argon2id
- Storage format: Same as current, but with encrypted keys
- Storage location: `~/.hedera-cli/state/` (same as current, but in encrypted files)

**Technical Advantages:**

- Industry Standard: NIST-approved, FIPS 140-2 compliant, widely audited
- Hardware Acceleration: AES-NI instructions available on most modern CPUs
- Authenticated Encryption: GCM mode provides both confidentiality and integrity in a single pass
- Optimal Key Size: 256-bit provides strong security margin without performance penalty

**Performance Characteristics:**
Based on Node.js 24 benchmarks with hardware acceleration (AES-NI):

- **Throughput**: ~733 MB/s on modern CPUs
- **Small payloads** (typical private key ~500 bytes): **< 0.05 milliseconds per operation**
- **Impact on UX**: Imperceptible - encryption/decryption adds < 1ms to any key operation

This means key encryption/decryption is effectively instantaneous from a user experience perspective, adding negligible latency to CLI commands.

**Implementation Benefits:**

- Library Support: Native in Node.js crypto module, no external dependencies
- Well-Documented: Extensive documentation and security guidance available
- Proven Track Record: Used by TLS 1.3, AWS KMS, Google Cloud KMS
- Simple API: Reduces implementation errors compared to manual MAC computation

### File Structure and Permissions

**Secret File** (`~/.hedera-cli/.secret`):

```
Format: Base64-encoded 32-byte random value
Example: dGhpcyBpcyBhIDMyIGJ5dGUgc2VjcmV0IGtleQ==

Permissions:
- Unix/Linux/macOS: 0600 (rw-------)
- Windows: NTFS ACL for current user only
```

The CLI verifies these permissions (and file ownership) at startup and before any cryptographic operation; if they are too permissive or owned incorrectly, it emits a warning with remediation steps (and, in strict mode, aborts execution until permissions are fixed).

### Opt-Out Configuration for Development Environments

Users can disable encryption entirely for development and testing scenarios:

**Configuration Method:**

- First-run wizard will prompt: "Enable key encryption? (Recommended for production, can be disabled for local development)"
- In the future, it can be toggled via: `hedera config set encryption true|false`

**When Encryption is Disabled:**

- Keys are stored in plaintext same as before in `~/.hedera-cli/state/` directory
- Warning message displayed on CLI startup: "⚠️ Key encryption is disabled. Keys are stored in plaintext."
- `.secret` file is not created or used
- This setting is stored in the configuration file for persistence

**Security Considerations:**

- Opt-out is global (affects all keys)
- Intended for development environments only
- Clear warnings prevent accidental production use
- Can be re-enabled at any time (will encrypt existing plaintext keys)

## Implementation Strategy

The encryption functionality will be implemented as a new storage provider that implements the existing `KmsStorageService` interface, ensuring seamless integration with the current architecture.

**Key Components:**

1. **SecretManager**: Handles generation, storage, and retrieval of the encryption password
   - Auto-generates secure random password on first use
   - Stores in `~/.hedera-cli/.secret` with proper permissions
   - Verifies file permissions on every access
   - Provides fallback and error handling

2. **EncryptedStorageProvider**: Implements `KmsStorageService` interface
   - Encrypts/decrypts keys using AES-256-GCM
   - Derives encryption key from password via Argon2id
   - Maintains backward compatibility with plaintext storage (when encryption disabled)

## Testing Strategy

- Unit tests for SecretManager (generation, storage, retrieval)
- Unit tests for EncryptedStorageProvider (encrypt/decrypt operations)
- Cross-platform verification on Windows 10/11, macOS 12+, Ubuntu 22.04+
- Development mode tests: Verify plaintext storage works when encryption disabled
- Error handling tests: Missing .secret file, corrupted keys, permission issues
- Migration tests: Verify smooth transition from plaintext to encrypted storage
- File permission tests: Verify proper permissions on creation and access

## Consequences

**Positive:**

- Enhanced security without sacrificing usability
- Zero-friction security: Protection without password prompts
- No external dependencies or native module compilation
- Works reliably in all environments (headless, CI/CD, Docker)
- Simple troubleshooting and debugging
- Reduced risk of key exposure through configuration files or logs
- Compliance with security best practices
- Flexibility for development environments
- Negligible performance impact (< 1ms per operation)
- Easier deployment and distribution (no native binaries)

**Negative:**

- Security depends on filesystem permissions
- `.secret` file can be read by processes running as the same user
- Does not protect against root/admin access or sophisticated malware
- Less "defense in depth" compared to OS keyring approach (marginal difference in practice)

**Trade-off Analysis:**

The file-based approach sacrifices theoretical maximum security for:

- **Reliability**: Works consistently across all environments
- **Simplicity**: No native dependencies, easier to maintain
- **Debuggability**: File-based storage is transparent and verifiable
- **Practicality**: Real-world security improvement over plaintext with minimal complexity

## Unsolved Questions

**Key Backup and Remote Restore:**
It is still unclear how the backup and remote restore functionality should operate with the file-based secret storage.

Potential approaches under consideration:

1. Export encrypted keys with user-defined password (password-based key wrapping) or encrypt whole backup
2. Backup both `.secret` and encrypted keys together with additional encryption layer
3. Provide key export command that re-encrypts with user password for portability

**Impact on Implementation:**

- This question **does not block** the initial implementation
- Basic encrypt/decrypt functionality works independently
- Backup/restore can be added as an enhancement in a future iteration

**Cloud Sync Integration:**

Should the CLI automatically detect and warn about common cloud sync directories (Dropbox, Google Drive, OneDrive)?

**Impact on Implementation:**

- Nice-to-have feature, not critical for initial release
- Can be added as enhancement based on user feedback

## References

- [NIST Special Publication 800-38D](https://csrc.nist.gov/publications/detail/sp/800-38d/final) - AES-GCM Specification
- [Node.js Crypto Documentation](https://nodejs.org/api/crypto.html)
- [Node.js File System Permissions](https://nodejs.org/api/fs.html#file-modes)
