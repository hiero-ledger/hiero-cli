import type { ConfigService } from '@/core/services/config/config-service.interface';
import type { IdentityResolutionService } from '@/core/services/identity-resolution/identity-resolution-service.interface';

import {
  makeConfigMock,
  makeIdentityResolutionServiceMock,
} from '@/__tests__/mocks/mocks';

import { VALID_PAT } from './fixtures';

export const makeFaucetConfigMock = (): jest.Mocked<ConfigService> => {
  const mock = makeConfigMock();
  mock.getOption.mockReturnValue(VALID_PAT);
  return mock;
};

export const makeFaucetIdentityResolutionMock =
  (): jest.Mocked<IdentityResolutionService> => {
    const mock = makeIdentityResolutionServiceMock();
    mock.resolveReferenceToEntityOrEvmAddress.mockImplementation(
      ({ entityReference }) => ({ entityIdOrEvmAddress: entityReference }),
    );
    return mock;
  };
