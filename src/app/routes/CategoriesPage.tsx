import { useEffect, useState } from 'react';
import { useAppServices } from '../appServicesContext';
import { PageHeader } from '../shared/PageHeader';
import { CategoryForm } from '../../features/categories/CategoryForm';
import { CategoryList } from '../../features/categories/CategoryList';
import type { CreateCategoryInput } from '../../features/categories/categoryRepository';
import type { Category } from '../../features/categories/categoryTypes';

export function CategoriesPage() {
  const { categories: categoryService } = useAppServices();
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    void loadCategories();
  }, []);

  async function loadCategories() {
    setIsLoading(true);
    setPageError(null);
    try {
      setCategories(await categoryService.list());
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Unable to load categories.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(input: CreateCategoryInput) {
    setIsSubmitting(true);
    setPageError(null);
    try {
      if (editingCategory) {
        await categoryService.update(editingCategory.id, input);
        setEditingCategory(null);
      } else {
        await categoryService.create(input);
      }
      await loadCategories();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(category: Category) {
    setPageError(null);
    try {
      await categoryService.delete(category.id);
      if (editingCategory?.id === category.id) {
        setEditingCategory(null);
      }
      await loadCategories();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Unable to delete category.');
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Categories"
        eyebrow="Review labels"
        description="Income, expense, and transfer categories will be created and edited here."
      />
      <CategoryForm
        category={editingCategory}
        isSubmitting={isSubmitting}
        onCancelEdit={() => setEditingCategory(null)}
        onSubmit={handleSubmit}
      />
      {pageError ? <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-ledger-loss">{pageError}</p> : null}
      {isLoading ? (
        <p className="text-sm text-ledger-muted">Loading categories...</p>
      ) : (
        <CategoryList categories={categories} onDelete={handleDelete} onEdit={setEditingCategory} />
      )}
    </section>
  );
}
