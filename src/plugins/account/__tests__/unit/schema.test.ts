import { safeParseAccountData } from '@/plugins/account/schema';

import { makeAccountData } from './helpers/mocks';

describe('account plugin - state schema origin', () => {
  test('accepts a record without origin (state written by an older CLI)', () => {
    const legacyRecord = makeAccountData();

    expect(legacyRecord.origin).toBeUndefined();
    expect(safeParseAccountData(legacyRecord).success).toBe(true);
  });

  test('accepts both known origins', () => {
    expect(
      safeParseAccountData(makeAccountData({ origin: 'created' })),
    ).toEqual(expect.objectContaining({ success: true }));
    expect(
      safeParseAccountData(makeAccountData({ origin: 'imported' })),
    ).toEqual(expect.objectContaining({ success: true }));
  });

  test('rejects an unknown origin', () => {
    const record = { ...makeAccountData(), origin: 'inherited' };

    expect(safeParseAccountData(record).success).toBe(false);
  });
});
