import type { Category, CategoryType } from './categoryTypes';

export interface CreateCategoryInput {
  name: string;
  type: CategoryType;
  color?: string | null;
}

export interface CategoryRepository {
  create(input: CreateCategoryInput): Promise<Category>;
  update(id: string, input: Partial<CreateCategoryInput>): Promise<Category>;
  delete(id: string): Promise<void>;
  getById(id: string): Promise<Category | null>;
  list(): Promise<Category[]>;
}
