import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationDto, NotificationsListResponseDto, CreateNotificationDto } from './dto/notification-response.dto';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateNotificationDto, companyId: string): Promise<NotificationDto> {
    const notification = await this.prisma.notification.create({
      data: {
        type: dto.type,
        title: dto.title,
        message: dto.message,
        link: dto.link ?? null,
        userId: dto.userId ?? null,
        companyId,
      },
    });
    return this.toDto(notification);
  }

  async findAll(
    companyId: string,
    userId?: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<NotificationsListResponseDto> {
    const skip = (page - 1) * limit;

    const where: any = { companyId };

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { ...where, read: false } }),
    ]);

    return {
      notifications: notifications.map((n) => this.toDto(n)),
      total,
      unreadCount,
    };
  }

  async markAsRead(id: string, companyId: string): Promise<NotificationDto> {
    const notification = await this.prisma.notification.findFirst({
      where: { id, companyId },
    });
    if (!notification) throw new Error('Notification not found');

    const updated = await this.prisma.notification.update({
      where: { id },
      data: { read: true },
    });
    return this.toDto(updated);
  }

  async markAllAsRead(companyId: string): Promise<{ count: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { companyId, read: false },
      data: { read: true },
    });
    return { count: result.count };
  }

  private toDto(n: any): NotificationDto {
    return {
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      read: n.read,
      link: n.link || undefined,
      createdAt: n.createdAt.toISOString(),
    };
  }
}
