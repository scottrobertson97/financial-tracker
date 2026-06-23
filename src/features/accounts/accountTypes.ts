export const accountTypes = ['checking', 'savings', 'credit', 'cash', 'investment', 'other'] as const;

export type AccountType = (typeof accountTypes)[number];

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  startingBalanceCents: number;
  createdAt: string;
  updatedAt: string;
}
