import * as clack from '@clack/prompts';

import { requireConfirmation } from '@/core/utils/confirmation';

jest.mock('@clack/prompts', () => ({
  confirm: jest.fn(),
  isCancel: jest.fn(),
  cancel: jest.fn(),
  CANCEL_SYMBOL: Symbol('clack:cancel'),
}));

const clackMock = jest.mocked(clack);
const CANCEL_SYMBOL: typeof clack.CANCEL_SYMBOL = clack.CANCEL_SYMBOL;

describe('requireConfirmation', () => {
  let exitSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    clackMock.isCancel.mockImplementation(
      (value: unknown) => value === CANCEL_SYMBOL,
    );
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });
  });

  afterEach(() => {
    exitSpy.mockRestore();
  });

  it('asks for confirmation with the given message and a negative default', async () => {
    clackMock.confirm.mockResolvedValue(true);

    await requireConfirmation('Delete everything?');

    expect(clackMock.confirm).toHaveBeenCalledWith({
      message: 'Delete everything?',
      initialValue: false,
    });
  });

  it('returns true when the user confirms', async () => {
    clackMock.confirm.mockResolvedValue(true);

    await expect(requireConfirmation('Proceed?')).resolves.toBe(true);
  });

  it('returns false when the user declines', async () => {
    clackMock.confirm.mockResolvedValue(false);

    await expect(requireConfirmation('Proceed?')).resolves.toBe(false);
  });

  it('exits with code 0 and reports the cancellation when the user cancels', async () => {
    clackMock.confirm.mockResolvedValue(CANCEL_SYMBOL);

    await expect(requireConfirmation('Proceed?')).rejects.toThrow(
      'process.exit',
    );

    expect(clackMock.cancel).toHaveBeenCalledWith('Operation cancelled.');
    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});
