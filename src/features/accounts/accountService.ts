import { z } from 'zod';
import type { AccountRepository, CreateAccountInput } from './accountRepository';
import { accountTypes } from './accountTypes';
import { parseOrThrow } from '../../shared/validation';

const createAccountSchema = z.object({
  name: z.string().trim().min(1, 'Account name is required.'),
  type: z.enum(accountTypes),
  startingBalanceCents: z.number().int().safe(),
});

const updateAccountSchema = createAccountSchema.partial();

export class AccountService {
  constructor(private readonly accountRepository: AccountRepository) {}

  create(input: CreateAccountInput) {
    return this.accountRepository.create(parseOrThrow(createAccountSchema, input));
  }

  update(id: string, input: Partial<CreateAccountInput>) {
    return this.accountRepository.update(id, parseOrThrow(updateAccountSchema, input));
  }

  delete(id: string) {
    return this.accountRepository.delete(id);
  }

  getById(id: string) {
    return this.accountRepository.getById(id);
  }

  list() {
    return this.accountRepository.list();
  }
}
