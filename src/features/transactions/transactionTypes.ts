export const transactionStatuses = ['pending', 'cleared', 'reconciled'] as const;

export type TransactionStatus = (typeof transactionStatuses)[number];

export interface Transaction {
  id: string;
  accountId: string;
  categoryId?: string | null;
  date: string;
  description: string;
  merchant?: string | null;
  amountCents: number;
  notes?: string | null;
  status: TransactionStatus;
  createdAt: string;
  updatedAt: string;
}
