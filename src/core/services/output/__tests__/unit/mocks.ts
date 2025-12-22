/**
 * Mocks specific to OutputService tests
 */

export const setupFileMocks = (
  overrides: {
    dirExists?: boolean;
    dirname?: string;
    mkdirSyncError?: Error;
    writeFileSyncError?: Error;
  } = {},
) => {
  const fs = jest.requireMock('fs');
  const path = jest.requireMock('path');
  const dirnameSpy = path.dirname as jest.Mock;
  dirnameSpy.mockReturnValue(overrides.dirname || '/tmp/output');
  (fs.existsSync as jest.Mock).mockReturnValue(overrides.dirExists ?? false);
  if (overrides.mkdirSyncError) {
    (fs.mkdirSync as jest.Mock).mockImplementation(() => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw overrides.mkdirSyncError;
    });
  }
  if (overrides.writeFileSyncError) {
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw overrides.writeFileSyncError;
    });
  }
  return { fs, path };
};
