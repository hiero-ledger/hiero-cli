import { EntityIdSchema } from '../schemas/common-schemas';

export function validateAccountId(accountId: string): void {
  EntityIdSchema.parse(accountId);
}
