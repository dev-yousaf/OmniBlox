import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InboxMessageDto, InboxListResponseDto } from './dto/inbox-response.dto';

@Injectable()
export class InboxService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    companyId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<InboxListResponseDto> {
    const skip = (page - 1) * limit;

    const where: any = { companyId };

    const [messages, total, unreadCount] = await Promise.all([
      this.prisma.inboxMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          fromUser: { select: { id: true, name: true } },
        },
      }),
      this.prisma.inboxMessage.count({ where }),
      this.prisma.inboxMessage.count({ where: { ...where, read: false } }),
    ]);

    return {
      messages: messages.map((m) => this.toDto(m)),
      total,
      unreadCount,
    };
  }

  async markAsRead(id: string, companyId: string): Promise<InboxMessageDto> {
    const message = await this.prisma.inboxMessage.findFirst({
      where: { id, companyId },
    });
    if (!message) throw new Error('Message not found');

    const updated = await this.prisma.inboxMessage.update({
      where: { id },
      data: { read: true },
    });
    return this.toDto(updated);
  }

  async markAllAsRead(companyId: string): Promise<{ count: number }> {
    const result = await this.prisma.inboxMessage.updateMany({
      where: { companyId, read: false },
      data: { read: true },
    });
    return { count: result.count };
  }

  private toDto(m: any): InboxMessageDto {
    return {
      id: m.id,
      subject: m.subject,
      body: m.body,
      read: m.read,
      fromUserId: m.fromUserId || undefined,
      fromUserName: m.fromUser?.name || undefined,
      createdAt: m.createdAt.toISOString(),
    };
  }
}
