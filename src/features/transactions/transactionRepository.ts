import type { Transaction, TransactionStatus } from './transactionTypes';

export interface TransactionFilters {
  accountId?: string;
  categoryId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface CreateTransactionInput {
  accountId: string;
  categoryId?: string | null;
  date: string;
  description: string;
  merchant?: string | null;
  amountCents: number;
  notes?: string | null;
  status?: TransactionStatus;
}

export interface UpdateTransactionInput extends Partial<CreateTransactionInput> {}

export interface TransactionRepository {
  create(input: CreateTransactionInput): Promise<Transaction>;
  update(id: string, input: UpdateTransactionInput): Promise<Transaction>;
  delete(id: string): Promise<void>;
  getById(id: string): Promise<Transaction | null>;
  list(filters?: TransactionFilters): Promise<Transaction[]>;
}
