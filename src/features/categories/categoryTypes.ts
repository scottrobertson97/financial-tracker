export const categoryTypes = ['income', 'expense', 'transfer'] as const;

export type CategoryType = (typeof categoryTypes)[number];

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  color?: string | null;
  createdAt: string;
  updatedAt: string;
}
