import type { AccountRepository } from '../features/accounts/accountRepository';
import type { CategoryRepository, CreateCategoryInput } from '../features/categories/categoryRepository';
import type { Category } from '../features/categories/categoryTypes';
import type {
  CreateTransactionInput,
  TransactionRepository,
} from '../features/transactions/transactionRepository';
import type { SqliteClient } from './sqliteClient';

const STARTER_LEDGER_KEY = 'starter_ledger_v1';

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

interface SeedStarterLedgerInput {
  accountRepository: AccountRepository;
  categoryRepository: CategoryRepository;
  client: SqliteClient;
  referenceDate?: Date;
  transactionRepository: TransactionRepository;
}

export async function seedStarterLedger({
  accountRepository,
  categoryRepository,
  client,
  referenceDate = new Date(),
  transactionRepository,
}: SeedStarterLedgerInput): Promise<void> {
  await seedDefaultCategories(categoryRepository);

  const seedState = client.queryOne<{ value: string }>(
    'SELECT value FROM app_metadata WHERE key = ?',
    [STARTER_LEDGER_KEY],
  );
  if (seedState) {
    return;
  }

  await client.transaction(async () => {
    const [existingAccounts, existingTransactions] = await Promise.all([
      accountRepository.list(),
      transactionRepository.list(),
    ]);

    if (existingAccounts.length > 0 || existingTransactions.length > 0) {
      await setStarterLedgerState(client, 'existing-ledger');
      return;
    }

    const categories = await ensureStarterCategories(categoryRepository);
    const categoryId = (name: string, type: Category['type']) =>
      getCategoryId(categories, name, type);

    const checking = await accountRepository.create({
      name: 'Everyday Checking',
      type: 'checking',
      startingBalanceCents: 285000,
    });
    const savings = await accountRepository.create({
      name: 'Emergency Savings',
      type: 'savings',
      startingBalanceCents: 750000,
    });
    const credit = await accountRepository.create({
      name: 'Rewards Card',
      type: 'credit',
      startingBalanceCents: -42000,
    });
    const cash = await accountRepository.create({
      name: 'Cash Wallet',
      type: 'cash',
      startingBalanceCents: 8000,
    });
    const investment = await accountRepository.create({
      name: 'Brokerage',
      type: 'investment',
      startingBalanceCents: 1200000,
    });
    const other = await accountRepository.create({
      name: 'Health Savings Account',
      type: 'other',
      startingBalanceCents: 90000,
    });

    const transactions: CreateTransactionInput[] = [];
    const groceryAmounts = [8425, 9178, 7894, 9650, 8732, 9064];
    const utilityAmounts = [13840, 12675, 14920, 13110, 14280, 13650];

    for (let monthOffset = -5; monthOffset <= 0; monthOffset += 1) {
      const index = monthOffset + 5;
      const settledStatus = monthOffset < 0 ? 'reconciled' : 'cleared';

      transactions.push(
        {
          accountId: checking.id,
          amountCents: 320000,
          categoryId: categoryId('Paycheck', 'income'),
          date: getSeedDate(referenceDate, monthOffset, 1),
          description: 'Monthly paycheck',
          merchant: 'Acme Studio',
          notes: monthOffset === 0 ? 'Sample income transaction' : null,
          status: settledStatus,
        },
        {
          accountId: checking.id,
          amountCents: -145000,
          categoryId: categoryId('Rent', 'expense'),
          date: getSeedDate(referenceDate, monthOffset, 3),
          description: 'Apartment rent',
          merchant: 'Oak Street Properties',
          status: settledStatus,
        },
        {
          accountId: credit.id,
          amountCents: -groceryAmounts[index],
          categoryId: categoryId('Groceries', 'expense'),
          date: getSeedDate(referenceDate, monthOffset, 8),
          description: 'Weekly groceries',
          merchant: 'Neighborhood Market',
          status: settledStatus,
        },
        {
          accountId: checking.id,
          amountCents: -utilityAmounts[index],
          categoryId: categoryId('Utilities', 'expense'),
          date: getSeedDate(referenceDate, monthOffset, 12),
          description: 'Electric and water',
          merchant: 'City Utilities',
          status: settledStatus,
        },
        {
          accountId: credit.id,
          amountCents: -1599,
          categoryId: categoryId('Subscriptions', 'expense'),
          date: getSeedDate(referenceDate, monthOffset, 15),
          description: 'Streaming subscription',
          merchant: 'StreamBox',
          status: settledStatus,
        },
        {
          accountId: credit.id,
          amountCents: -(3850 + index * 275),
          categoryId: categoryId('Restaurants', 'expense'),
          date: getSeedDate(referenceDate, monthOffset, 20),
          description: 'Dinner out',
          merchant: 'Juniper Kitchen',
          status: settledStatus,
        },
      );
    }

    transactions.push(
      {
        accountId: savings.id,
        amountCents: 1425,
        categoryId: categoryId('Interest', 'income'),
        date: getSeedDate(referenceDate, 0, 6),
        description: 'Savings interest',
        merchant: 'Community Bank',
        status: 'cleared',
      },
      {
        accountId: credit.id,
        amountCents: -8999,
        categoryId: categoryId('Shopping', 'expense'),
        date: getSeedDate(referenceDate, 0, 18),
        description: 'Desk lamp and supplies',
        merchant: 'Home Goods',
        notes: 'Pending sample transaction',
        status: 'pending',
      },
      {
        accountId: other.id,
        amountCents: -4200,
        categoryId: categoryId('Healthcare', 'expense'),
        date: getSeedDate(referenceDate, 0, 10),
        description: 'Prescription refill',
        merchant: 'Green Cross Pharmacy',
        status: 'cleared',
      },
      {
        accountId: checking.id,
        amountCents: 45000,
        categoryId: categoryId('Bonus', 'income'),
        date: getSeedDate(referenceDate, -1, 14),
        description: 'Quarterly bonus',
        merchant: 'Acme Studio',
        status: 'reconciled',
      },
      {
        accountId: credit.id,
        amountCents: -3200,
        categoryId: categoryId('Entertainment', 'expense'),
        date: getSeedDate(referenceDate, -1, 22),
        description: 'Concert tickets',
        merchant: 'Civic Theater',
        status: 'reconciled',
      },
      {
        accountId: checking.id,
        amountCents: -50000,
        categoryId: categoryId('Transfer', 'transfer'),
        date: getSeedDate(referenceDate, 0, 7),
        description: 'Transfer to savings',
        notes: 'Sample transfer pair',
        status: 'cleared',
      },
      {
        accountId: savings.id,
        amountCents: 50000,
        categoryId: categoryId('Transfer', 'transfer'),
        date: getSeedDate(referenceDate, 0, 7),
        description: 'Transfer from checking',
        notes: 'Sample transfer pair',
        status: 'cleared',
      },
      {
        accountId: cash.id,
        amountCents: -850,
        categoryId: null,
        date: getSeedDate(referenceDate, 0, 9),
        description: 'Coffee and pastry',
        merchant: 'Corner Cafe',
        status: 'cleared',
      },
      {
        accountId: investment.id,
        amountCents: 2200,
        categoryId: categoryId('Interest', 'income'),
        date: getSeedDate(referenceDate, 0, 11),
        description: 'Dividend payment',
        merchant: 'Index Fund',
        status: 'cleared',
      },
      {
        accountId: checking.id,
        amountCents: -4350,
        categoryId: categoryId('Transportation', 'expense'),
        date: getSeedDate(referenceDate, 0, 16),
        description: 'Transit pass',
        merchant: 'Metro Transit',
        status: 'cleared',
      },
    );

    for (const transaction of transactions) {
      await transactionRepository.create(transaction);
    }

    await setStarterLedgerState(client, 'seeded');
  });
}

export async function markStarterLedgerAsRestored(client: SqliteClient): Promise<void> {
  await setStarterLedgerState(client, 'restored-ledger');
}

export async function resetToStarterLedger(input: SeedStarterLedgerInput): Promise<void> {
  await input.client.transaction(async () => {
    await input.client.execute('DELETE FROM transaction_tags');
    await input.client.execute('DELETE FROM budgets');
    await input.client.execute('DELETE FROM transactions');
    await input.client.execute('DELETE FROM accounts');
    await input.client.execute('DELETE FROM categories');
    await input.client.execute('DELETE FROM app_metadata WHERE key = ?', [STARTER_LEDGER_KEY]);
  });

  await seedStarterLedger(input);
}

async function ensureStarterCategories(categoryRepository: CategoryRepository): Promise<Category[]> {
  const categories = await categoryRepository.list();

  for (const category of defaultCategories) {
    const exists = categories.some(
      (candidate) => candidate.name.toLocaleLowerCase() === category.name.toLocaleLowerCase()
        && candidate.type === category.type,
    );
    if (!exists) {
      categories.push(await categoryRepository.create(category));
    }
  }

  return categories;
}

function getCategoryId(categories: Category[], name: string, type: Category['type']): string {
  const category = categories.find(
    (candidate) => candidate.name.toLocaleLowerCase() === name.toLocaleLowerCase()
      && candidate.type === type,
  );
  if (!category) {
    throw new Error(`Unable to create starter ledger category: ${name}.`);
  }

  return category.id;
}

function getSeedDate(referenceDate: Date, monthOffset: number, preferredDay: number): string {
  const year = referenceDate.getFullYear();
  const monthIndex = referenceDate.getMonth() + monthOffset;
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const currentMonthLimit = monthOffset === 0 ? referenceDate.getDate() : lastDay;
  const day = Math.min(preferredDay, lastDay, currentMonthLimit);
  const date = new Date(year, monthIndex, day);

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function setStarterLedgerState(client: SqliteClient, value: string): Promise<void> {
  return client.execute(
    `INSERT INTO app_metadata (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [STARTER_LEDGER_KEY, value],
  );
}
