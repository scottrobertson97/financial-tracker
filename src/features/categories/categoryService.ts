import { z } from 'zod';
import type { CategoryRepository, CreateCategoryInput } from './categoryRepository';
import { categoryTypes } from './categoryTypes';
import { parseOrThrow } from '../../shared/validation';

const createCategorySchema = z.object({
  name: z.string().trim().min(1, 'Category name is required.'),
  type: z.enum(categoryTypes),
  color: z.string().trim().min(1).optional().nullable(),
});

const updateCategorySchema = createCategorySchema.partial();

export class CategoryService {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  create(input: CreateCategoryInput) {
    return this.categoryRepository.create(parseOrThrow(createCategorySchema, input));
  }

  update(id: string, input: Partial<CreateCategoryInput>) {
    return this.categoryRepository.update(id, parseOrThrow(updateCategorySchema, input));
  }

  delete(id: string) {
    return this.categoryRepository.delete(id);
  }

  getById(id: string) {
    return this.categoryRepository.getById(id);
  }

  list() {
    return this.categoryRepository.list();
  }
}
