export const ERROR_MESSAGES = {
  failedToCallFunction: (functionName: string, detail?: string) =>
    detail
      ? `Failed to call ${functionName} function: ${detail}`
      : `Failed to call ${functionName} function`,
  couldNotResolveEvmAddress: (accountRef: string) =>
    `Couldn't resolve EVM address for an account ${accountRef}`,
  contractQueryDecodeError: (contractIdOrEvm: string, functionName: string) =>
    `There was a problem with decoding contract ${contractIdOrEvm} "${functionName}" function result`,
} as const;
