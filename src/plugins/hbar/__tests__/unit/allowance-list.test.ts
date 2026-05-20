import '@/core/utils/json-serialize';

import {
  createMirrorNodeMock,
  makeArgs,
  makeIdentityResolutionServiceMock,
  makeLogger,
} from '@/__tests__/mocks/mocks';
import { assertOutput } from '@/__tests__/utils/assert-output';
import { NotFoundError } from '@/core/errors';
import { EntityReferenceType } from '@/core/types/shared.types';
import {
  hbarAllowanceList,
  HbarAllowanceListOutputSchema,
} from '@/plugins/hbar/commands/allowance-list';

const ACCOUNT_ID = '0.0.1234';
const SPENDER_ID = '0.0.5678';

const makeHbarAllowances = () => ({
  allowances: [
    {
      owner: ACCOUNT_ID,
      spender: SPENDER_ID,
      amount: 2500000000n,
    },
  ],
  links: { next: null },
});

const makeMirror = (getHbarAllowances: jest.Mock) => ({
  ...createMirrorNodeMock(),
  getHbarAllowances,
});

const makeIdentityResolution = () => {
  const identityResolution = makeIdentityResolutionServiceMock();
  identityResolution.resolveAccount.mockImplementation(({ accountReference }) =>
    Promise.resolve({ accountId: accountReference, accountPublicKey: '' }),
  );
  return identityResolution;
};

describe('hbarAllowanceList', () => {
  test('returns HBAR allowances for account alias', async () => {
    const logger = makeLogger();
    const getHbarAllowances = jest.fn().mockResolvedValue(makeHbarAllowances());
    const identityResolution = makeIdentityResolution();
    identityResolution.resolveAccount.mockResolvedValue({
      accountId: ACCOUNT_ID,
      accountPublicKey: '',
    });
    const args = makeArgs(
      { identityResolution, mirror: makeMirror(getHbarAllowances) },
      logger,
      {
        account: 'treasury',
      },
    );

    const result = await hbarAllowanceList(args);
    const output = assertOutput(result.result, HbarAllowanceListOutputSchema);

    expect(output.accountId).toBe(ACCOUNT_ID);
    expect(output.total).toBe(1);
    expect(output.allowances[0].spenderAccountId).toBe(SPENDER_ID);
    expect(output.allowances[0].amountTinybar).toBe(2500000000n);
    expect(output.allowances[0].amountDisplay).toBe('25');
    expect(getHbarAllowances).toHaveBeenCalledWith(ACCOUNT_ID);
    expect(identityResolution.resolveAccount).toHaveBeenCalledWith({
      accountReference: 'treasury',
      type: EntityReferenceType.ALIAS,
      network: 'testnet',
    });
    expect(args.api.alias.resolve).not.toHaveBeenCalled();
  });

  test('filters by spender', async () => {
    const logger = makeLogger();
    const getHbarAllowances = jest.fn().mockResolvedValue({
      allowances: [
        ...makeHbarAllowances().allowances,
        { owner: ACCOUNT_ID, spender: '0.0.9999', amount: 1n },
      ],
      links: { next: null },
    });
    const identityResolution = makeIdentityResolution();
    const args = makeArgs(
      { identityResolution, mirror: makeMirror(getHbarAllowances) },
      logger,
      {
        account: ACCOUNT_ID,
        spender: SPENDER_ID,
      },
    );

    const result = await hbarAllowanceList(args);
    const output = assertOutput(result.result, HbarAllowanceListOutputSchema);

    expect(output.total).toBe(1);
    expect(output.allowances[0].spenderAccountId).toBe(SPENDER_ID);
    expect(identityResolution.resolveAccount).toHaveBeenCalledWith({
      accountReference: SPENDER_ID,
      type: EntityReferenceType.ENTITY_ID,
      network: 'testnet',
    });
  });

  test('fetches all pages through mirror service when showAll is true', async () => {
    const logger = makeLogger();
    const getHbarAllowances = jest.fn();
    const getAllHbarAllowances = jest.fn().mockResolvedValue({
      allowances: [
        ...makeHbarAllowances().allowances,
        { owner: ACCOUNT_ID, spender: '0.0.9999', amount: 1n },
      ],
      links: { next: null },
    });
    const args = makeArgs(
      {
        identityResolution: makeIdentityResolution(),
        mirror: {
          ...makeMirror(getHbarAllowances),
          getAllHbarAllowances,
        },
      },
      logger,
      {
        account: ACCOUNT_ID,
        showAll: true,
      },
    );

    const result = await hbarAllowanceList(args);
    const output = assertOutput(result.result, HbarAllowanceListOutputSchema);

    expect(output.total).toBe(2);
    expect(getHbarAllowances).not.toHaveBeenCalled();
    expect(getAllHbarAllowances).toHaveBeenCalledWith(ACCOUNT_ID);
  });

  test('returns empty list when no allowances exist', async () => {
    const logger = makeLogger();
    const getHbarAllowances = jest.fn().mockResolvedValue({
      allowances: [],
      links: { next: null },
    });
    const args = makeArgs(
      {
        identityResolution: makeIdentityResolution(),
        mirror: makeMirror(getHbarAllowances),
      },
      logger,
      { account: ACCOUNT_ID },
    );

    const result = await hbarAllowanceList(args);
    const output = assertOutput(result.result, HbarAllowanceListOutputSchema);

    expect(output.total).toBe(0);
    expect(output.allowances).toHaveLength(0);
  });

  test('throws NotFoundError for unknown account alias', async () => {
    const logger = makeLogger();
    const args = makeArgs(
      {
        identityResolution: {
          ...makeIdentityResolutionServiceMock(),
          resolveAccount: jest
            .fn()
            .mockRejectedValue(new NotFoundError('missing')),
        },
        mirror: makeMirror(jest.fn()),
      },
      logger,
      { account: 'missing' },
    );

    await expect(hbarAllowanceList(args)).rejects.toThrow(NotFoundError);
  });
});
