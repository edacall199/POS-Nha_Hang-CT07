import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error.middleware';

export interface CreateCategoryDto {
  name: string;
  icon?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateCategoryDto extends Partial<CreateCategoryDto> {}

export const categoryService = {
  async getAll() {
    return prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { menuItems: { where: { deletedAt: null } } } },
      },
    });
  },

  async getById(id: string) {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        menuItems: { where: { deletedAt: null }, orderBy: { name: 'asc' } },
      },
    });
    if (!category) throw new AppError('Không tìm thấy danh mục', 404);
    return category;
  },

  async create(dto: CreateCategoryDto) {
    return prisma.category.create({
      data: {
        name: dto.name,
        icon: dto.icon,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  },

  async update(id: string, dto: UpdateCategoryDto) {
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) throw new AppError('Không tìm thấy danh mục', 404);

    return prisma.category.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.icon !== undefined && { icon: dto.icon }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  },

  async remove(id: string) {
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) throw new AppError('Không tìm thấy danh mục', 404);

    // Check if category has active menu items
    const itemCount = await prisma.menuItem.count({
      where: { categoryId: id, deletedAt: null },
    });
    if (itemCount > 0) {
      throw new AppError(`Không thể xóa danh mục đang có ${itemCount} món ăn`, 400);
    }

    return prisma.category.delete({ where: { id } });
  },
};
