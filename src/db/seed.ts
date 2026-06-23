import type { CategoryRepository, CreateCategoryInput } from '../features/categories/categoryRepository';

export const defaultCategories: CreateCategoryInput[] = [
  { name: 'Rent', type: 'expense', color: '#7f1d1d' },
  { name: 'Groceries', type: 'expense', color: '#15803d' },
  { name: 'Restaurants', type: 'expense', color: '#c2410c' },
  { name: 'Transportation', type: 'expense', color: '#0369a1' },
  { name: 'Utilities', type: 'expense', color: '#7c3aed' },
  { name: 'Subscriptions', type: 'expense', color: '#be123c' },
  { name: 'Shopping', type: 'expense', color: '#a16207' },
  { name: 'Healthcare', type: 'expense', color: '#0f766e' },
  { name: 'Entertainment', type: 'expense', color: '#4338ca' },
  { name: 'Miscellaneous', type: 'expense', color: '#64748b' },
  { name: 'Paycheck', type: 'income', color: '#166534' },
  { name: 'Bonus', type: 'income', color: '#4d7c0f' },
  { name: 'Interest', type: 'income', color: '#047857' },
  { name: 'Other Income', type: 'income', color: '#0f766e' },
  { name: 'Transfer', type: 'transfer', color: '#475569' },
];

export async function seedDefaultCategories(categoryRepository: CategoryRepository): Promise<void> {
  const existingCategories = await categoryRepository.list();
  if (existingCategories.length > 0) {
    return;
  }

  for (const category of defaultCategories) {
    await categoryRepository.create(category);
  }
}
