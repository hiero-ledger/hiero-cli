import { makeStateMock } from '@/__tests__/mocks/mocks';
import { NotFoundError, ValidationError } from '@/core/errors';
import { HEDERA_MAX_TRANSFER_ENTRIES_PER_TRANSACTION } from '@/core/shared/constants';
import {
  SWAP_STATE_NAMESPACE,
  SwapStateServiceImpl,
} from '@/plugins/swap/services/swap-state.service';

import {
  mockEmptySwap,
  mockSwapWithHbar,
  mockSwapWithMultipleTransfers,
  SWAP_NAME,
} from './helpers/fixtures';

describe('swap plugin - swap state service', () => {
  test('saves swap in swap namespace', () => {
    const state = makeStateMock();
    const service = new SwapStateServiceImpl(state);

    service.saveSwap(SWAP_NAME, mockEmptySwap);

    expect(state.set).toHaveBeenCalledWith(
      SWAP_STATE_NAMESPACE,
      SWAP_NAME,
      mockEmptySwap,
    );
  });

  test('gets existing swap and validates state shape', () => {
    const state = makeStateMock();
    state.get.mockReturnValue(mockSwapWithHbar);
    const service = new SwapStateServiceImpl(state);

    expect(service.getSwap(SWAP_NAME)).toEqual(mockSwapWithHbar);
    expect(state.get).toHaveBeenCalledWith(SWAP_STATE_NAMESPACE, SWAP_NAME);
  });

  test('returns undefined when swap is missing', () => {
    const state = makeStateMock();
    state.get.mockReturnValue(undefined);
    const service = new SwapStateServiceImpl(state);

    expect(service.getSwap(SWAP_NAME)).toBeUndefined();
  });

  test('throws NotFoundError when required swap is missing', () => {
    const state = makeStateMock();
    state.get.mockReturnValue(undefined);
    const service = new SwapStateServiceImpl(state);

    expect(() => service.getSwapOrThrow(SWAP_NAME)).toThrow(NotFoundError);
  });

  test('lists swaps from state keys', () => {
    const state = makeStateMock();
    state.getKeys.mockReturnValue([SWAP_NAME]);
    state.get.mockReturnValue(mockSwapWithHbar);
    const service = new SwapStateServiceImpl(state);

    expect(service.listSwaps()).toEqual([
      { name: SWAP_NAME, entry: mockSwapWithHbar },
    ]);
    expect(state.getKeys).toHaveBeenCalledWith(SWAP_STATE_NAMESPACE);
  });

  test('checks existence through getSwap', () => {
    const state = makeStateMock();
    state.get.mockReturnValue(mockSwapWithHbar);
    const service = new SwapStateServiceImpl(state);

    expect(service.exists(SWAP_NAME)).toBe(true);
  });

  test('throws ValidationError when transfer limit would be exceeded', () => {
    const state = makeStateMock();
    const [transfer] = mockSwapWithHbar.transfers;
    if (!transfer) {
      throw new Error('Missing swap transfer fixture');
    }
    state.get.mockReturnValue({
      transfers: Array.from(
        { length: HEDERA_MAX_TRANSFER_ENTRIES_PER_TRANSACTION },
        () => transfer,
      ),
    });
    const service = new SwapStateServiceImpl(state);

    expect(() => service.assertCanAdd(SWAP_NAME, 1)).toThrow(ValidationError);
  });

  test('adds transfer with immutable update', () => {
    const state = makeStateMock();
    const [transfer] = mockSwapWithHbar.transfers;
    if (!transfer) {
      throw new Error('Missing swap transfer fixture');
    }
    state.get.mockReturnValue(mockSwapWithMultipleTransfers);
    const service = new SwapStateServiceImpl(state);

    const updated = service.addTransfer(SWAP_NAME, transfer);

    expect(updated).not.toBe(mockSwapWithMultipleTransfers);
    expect(updated.transfers).not.toBe(mockSwapWithMultipleTransfers.transfers);
    expect(updated.transfers).toHaveLength(
      mockSwapWithMultipleTransfers.transfers.length + 1,
    );
    expect(state.set).toHaveBeenCalledWith(
      SWAP_STATE_NAMESPACE,
      SWAP_NAME,
      updated,
    );
  });

  test('throws when stored swap has invalid shape', () => {
    const state = makeStateMock();
    state.get.mockReturnValue({ transfers: [{ type: 'invalid' }] });
    const service = new SwapStateServiceImpl(state);

    expect(() => service.getSwap(SWAP_NAME)).toThrow();
  });
});
