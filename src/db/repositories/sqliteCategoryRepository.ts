import type { Category } from '../../features/categories/categoryTypes';
import type { CategoryRepository, CreateCategoryInput } from '../../features/categories/categoryRepository';
import { createId } from '../../shared/ids';
import type { SqliteClient, SqliteRow } from '../sqliteClient';

interface CategoryRow extends SqliteRow {
  id: string;
  name: string;
  type: Category['type'];
  color: string | null;
  created_at: string;
  updated_at: string;
}

export class SqliteCategoryRepository implements CategoryRepository {
  constructor(private readonly client: SqliteClient) {}

  async create(input: CreateCategoryInput): Promise<Category> {
    const now = new Date().toISOString();
    const category: Category = {
      id: createId(),
      name: input.name,
      type: input.type,
      color: input.color ?? null,
      createdAt: now,
      updatedAt: now,
    };

    await this.client.execute(
      `INSERT INTO categories (id, name, type, color, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [category.id, category.name, category.type, category.color ?? null, category.createdAt, category.updatedAt],
    );

    return category;
  }

  async update(id: string, input: Partial<CreateCategoryInput>): Promise<Category> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error('Category not found.');
    }

    const updated: Category = {
      ...existing,
      ...input,
      color: input.color === undefined ? existing.color : input.color,
      updatedAt: new Date().toISOString(),
    };

    await this.client.execute(
      `UPDATE categories
       SET name = ?, type = ?, color = ?, updated_at = ?
       WHERE id = ?`,
      [updated.name, updated.type, updated.color ?? null, updated.updatedAt, id],
    );

    return updated;
  }

  async delete(id: string): Promise<void> {
    const dependentTransactions = this.client.queryOne<{ count: number }>(
      'SELECT COUNT(*) AS count FROM transactions WHERE category_id = ?',
      [id],
    );
    if ((dependentTransactions?.count ?? 0) > 0) {
      throw new Error('Cannot delete a category that has transactions.');
    }

    await this.client.execute('DELETE FROM categories WHERE id = ?', [id]);
  }

  async getById(id: string): Promise<Category | null> {
    const row = this.client.queryOne<CategoryRow>(
      `SELECT id, name, type, color, created_at, updated_at
       FROM categories
       WHERE id = ?`,
      [id],
    );

    return row ? mapCategory(row) : null;
  }

  async list(): Promise<Category[]> {
    return this.client
      .queryAll<CategoryRow>(
        `SELECT id, name, type, color, created_at, updated_at
         FROM categories
         ORDER BY
           CASE type WHEN 'expense' THEN 1 WHEN 'income' THEN 2 WHEN 'transfer' THEN 3 ELSE 4 END,
           name COLLATE NOCASE ASC`,
      )
      .map(mapCategory);
  }
}

function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    color: row.color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
