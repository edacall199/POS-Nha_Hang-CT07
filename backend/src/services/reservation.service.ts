import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error.middleware';

export interface CreateReservationDto {
  tableId: string;
  customerName: string;
  customerPhone: string;
  partySize: number;
  reservedAt: Date | string;
  notes?: string;
  telegramChatId?: string;
}

export interface UpdateReservationDto extends Partial<CreateReservationDto> {
  status?: string;
}

export const reservationService = {
  async getAll(status?: string) {
    return prisma.reservation.findMany({
      where: status ? { status } : undefined,
      include: {
        table: { include: { zone: true } },
      },
      orderBy: { reservedAt: 'asc' },
    });
  },

  async getById(id: string) {
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        table: { include: { zone: true } },
      },
    });
    if (!reservation) throw new AppError('Không tìm thấy đặt bàn', 404);
    return reservation;
  },

  async create(dto: CreateReservationDto) {
    const table = await prisma.table.findUnique({ where: { id: dto.tableId } });
    if (!table) throw new AppError('Không tìm thấy bàn', 404);

    return prisma.reservation.create({
      data: {
        tableId: dto.tableId,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        partySize: dto.partySize,
        reservedAt: new Date(dto.reservedAt),
        notes: dto.notes,
        telegramChatId: dto.telegramChatId,
        status: 'pending',
      },
      include: {
        table: { include: { zone: true } },
      },
    });
  },

  async update(id: string, dto: UpdateReservationDto) {
    const reservation = await prisma.reservation.findUnique({ where: { id } });
    if (!reservation) throw new AppError('Không tìm thấy đặt bàn', 404);

    const validStatuses = ['pending', 'confirmed', 'seated', 'cancelled', 'completed'];
    if (dto.status && !validStatuses.includes(dto.status)) {
      throw new AppError('Trạng thái không hợp lệ', 400);
    }

    return prisma.reservation.update({
      where: { id },
      data: {
        ...(dto.tableId !== undefined && { tableId: dto.tableId }),
        ...(dto.customerName !== undefined && { customerName: dto.customerName }),
        ...(dto.customerPhone !== undefined && { customerPhone: dto.customerPhone }),
        ...(dto.partySize !== undefined && { partySize: dto.partySize }),
        ...(dto.reservedAt !== undefined && { reservedAt: new Date(dto.reservedAt) }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.telegramChatId !== undefined && { telegramChatId: dto.telegramChatId }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
      include: {
        table: { include: { zone: true } },
      },
    });
  },

  async remove(id: string) {
    const reservation = await prisma.reservation.findUnique({ where: { id } });
    if (!reservation) throw new AppError('Không tìm thấy đặt bàn', 404);
    return prisma.reservation.delete({ where: { id } });
  },
};
