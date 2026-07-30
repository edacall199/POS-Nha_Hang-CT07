import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error.middleware';

export interface CreateMenuItemDto {
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  costPrice?: number;
  imageUrl?: string;
  isAvailable?: boolean;
  isFeatured?: boolean;
  prepTimeMinutes?: number;
}

export interface UpdateMenuItemDto extends Partial<CreateMenuItemDto> {}

export interface SetRecipeDto {
  recipes: { ingredientId: string; quantity: number; unit: string; note?: string }[];
}

export const menuService = {
  async getAll(categoryId?: string) {
    return prisma.menuItem.findMany({
      where: {
        deletedAt: null,
        ...(categoryId ? { categoryId } : {}),
      },
      include: { category: true },
      orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }],
    });
  },

  async getById(id: string) {
    const item = await prisma.menuItem.findFirst({
      where: { id, deletedAt: null },
      include: { category: true },
    });
    if (!item) throw new AppError('Không tìm thấy món ăn', 404);
    return item;
  },

  async create(dto: CreateMenuItemDto) {
    const category = await prisma.category.findUnique({ where: { id: dto.categoryId } });
    if (!category) throw new AppError('Không tìm thấy danh mục', 404);

    return prisma.menuItem.create({
      data: {
        categoryId: dto.categoryId,
        name: dto.name,
        description: dto.description,
        price: dto.price,
        costPrice: dto.costPrice,
        imageUrl: dto.imageUrl,
        isAvailable: dto.isAvailable ?? true,
        isFeatured: dto.isFeatured ?? false,
        prepTimeMinutes: dto.prepTimeMinutes ?? 15,
      },
      include: { category: true },
    });
  },

  async update(id: string, dto: UpdateMenuItemDto) {
    await menuService.getById(id); // ensure exists and not deleted

    return prisma.menuItem.update({
      where: { id },
      data: {
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.costPrice !== undefined && { costPrice: dto.costPrice }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
        ...(dto.isAvailable !== undefined && { isAvailable: dto.isAvailable }),
        ...(dto.isFeatured !== undefined && { isFeatured: dto.isFeatured }),
        ...(dto.prepTimeMinutes !== undefined && { prepTimeMinutes: dto.prepTimeMinutes }),
      },
      include: { category: true },
    });
  },

  async remove(id: string) {
    await menuService.getById(id); // ensure exists and not deleted
    return prisma.menuItem.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },

  async getRecipes(menuItemId: string) {
    return prisma.recipe.findMany({
      where: { menuItemId },
      include: { ingredient: true },
    });
  },

  async setRecipes(menuItemId: string, dto: SetRecipeDto) {
    await menuService.getById(menuItemId); // ensure exists

    return prisma.$transaction(async (tx) => {
      // Delete existing recipes
      await tx.recipe.deleteMany({ where: { menuItemId } });
      
      // Insert new recipes
      if (dto.recipes.length > 0) {
        await tx.recipe.createMany({
          data: dto.recipes.map(r => ({
            menuItemId,
            ingredientId: r.ingredientId,
            quantity: r.quantity,
            unit: r.unit,
            note: r.note,
          })),
        });
      }
      return tx.recipe.findMany({
        where: { menuItemId },
        include: { ingredient: true },
      });
    });
  },
};
