export interface SetupData {
  accountId: string;
  privateKey: string;
  keyManager: 'local' | 'local_encrypted';
}

export interface PromptService {
  /**
   * Collects setup data from user (UI only, no persistence)
   */
  collectSetupData(): Promise<SetupData>;

  /**
   * Displays confirmation prompt with optional data
   */
  confirm(
    title: string,
    data?: Record<string, string | number>,
  ): Promise<boolean>;
}
