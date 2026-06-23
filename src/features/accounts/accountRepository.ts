import type { Account, AccountType } from './accountTypes';

export interface CreateAccountInput {
  name: string;
  type: AccountType;
  startingBalanceCents: number;
}

export interface AccountRepository {
  create(input: CreateAccountInput): Promise<Account>;
  update(id: string, input: Partial<CreateAccountInput>): Promise<Account>;
  delete(id: string): Promise<void>;
  getById(id: string): Promise<Account | null>;
  list(): Promise<Account[]>;
}
