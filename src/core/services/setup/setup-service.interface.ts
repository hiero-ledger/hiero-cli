export interface SetupResult {
  accountId: string;
  privateKey: string;
  keyManager: 'local' | 'local_encrypted';
  network: string;
}

export interface SetupService {
  /**
   * Checks if initial setup is needed
   * @returns true if no operator configured for current network
   */
  needsSetup(): boolean;

  /**
   * Runs interactive setup to configure default operator
   * @throws Error when format === 'json' (script mode)
   */
  runInitialSetup(): Promise<void>;
}
