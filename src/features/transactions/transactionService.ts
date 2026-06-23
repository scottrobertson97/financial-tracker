import { z } from 'zod';
import type {
  CreateTransactionInput,
  TransactionFilters,
  TransactionRepository,
  UpdateTransactionInput,
} from './transactionRepository';
import { transactionStatuses } from './transactionTypes';
import { parseOrThrow } from '../../shared/validation';

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a YYYY-MM-DD date.');

const createTransactionSchema = z.object({
  accountId: z.string().trim().min(1, 'Account is required.'),
  categoryId: z.string().trim().min(1).optional().nullable(),
  date: isoDateSchema,
  description: z.string().trim().min(1, 'Description is required.'),
  merchant: z.string().trim().optional().nullable(),
  amountCents: z.number().int().safe(),
  notes: z.string().trim().optional().nullable(),
  status: z.enum(transactionStatuses).default('cleared'),
});

const updateTransactionSchema = createTransactionSchema.partial();

export class TransactionService {
  constructor(private readonly transactionRepository: TransactionRepository) {}

  create(input: CreateTransactionInput) {
    return this.transactionRepository.create(parseOrThrow(createTransactionSchema, input));
  }

  update(id: string, input: UpdateTransactionInput) {
    return this.transactionRepository.update(id, parseOrThrow(updateTransactionSchema, input));
  }

  delete(id: string) {
    return this.transactionRepository.delete(id);
  }

  getById(id: string) {
    return this.transactionRepository.getById(id);
  }

  list(filters?: TransactionFilters) {
    return this.transactionRepository.list(filters);
  }
}
