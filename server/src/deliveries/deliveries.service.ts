import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { DeliveryResponseDto } from './dto/delivery-response.dto';
import { DispatchDeliveryDto } from './dto/dispatch-delivery.dto';
import { UpdateDeliveryDto } from './dto/update-delivery.dto';

@Injectable()
export class DeliveriesService {
  private readonly LIST_KEY = (cid: string) => `deliveries:list:${cid}`;
  private readonly ITEM_KEY = (cid: string, id: string) => `deliveries:item:${cid}:${id}`;

  constructor(
    private readonly prisma: PrismaService,
    private cache: CacheService,
  ) {}

  async findAll(companyId: string): Promise<DeliveryResponseDto[]> {
    const cacheKey = this.LIST_KEY(companyId);
    const cached = await this.cache.get<any[]>(cacheKey);
    if (cached) return cached;

    const deliveries = await this.prisma.delivery.findMany({
      where: { companyId },
      include: {
        sale: {
          select: {
            id: true,
            invoiceNumber: true,
            saleDate: true,
            totalAmount: true,
            items: {
              select: {
                id: true,
                quantity: true,
                unitPrice: true,
                product: {
                  select: {
                    id: true,
                    name: true,
                    sku: true,
                  },
                },
              },
            },
            customer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = deliveries.map((delivery) => this.transformDelivery(delivery));

    await this.cache.set(cacheKey, result, 120);
    return result;
  }

  async findOne(id: string, companyId: string): Promise<DeliveryResponseDto> {
    const cacheKey = this.ITEM_KEY(companyId, id);
    const cached = await this.cache.get<any>(cacheKey);
    if (cached) return cached;

    const delivery = await this.prisma.delivery.findUnique({
      where: { id, companyId },
      include: {
        sale: {
          select: {
            id: true,
            invoiceNumber: true,
            saleDate: true,
            totalAmount: true,
            items: {
              select: {
                id: true,
                quantity: true,
                unitPrice: true,
                product: {
                  select: {
                    id: true,
                    name: true,
                    sku: true,
                  },
                },
              },
            },
            customer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    const result = this.transformDelivery(delivery);

    await this.cache.set(cacheKey, result, 300);
    return result;
  }

  async dispatch(
    id: string,
    companyId: string,
    dto: DispatchDeliveryDto,
  ): Promise<DeliveryResponseDto> {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id, companyId },
    });

    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    const updated = await this.prisma.delivery.update({
      where: { id },
      data: {
        status: 'IN_TRANSIT',
        dispatchDate: new Date(),
        trackingNumber: dto.trackingNumber ?? null,
      },
      include: {
        sale: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    sku: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    await this.cache.del(this.LIST_KEY(companyId));
    await this.cache.del(this.ITEM_KEY(companyId, id));

    return this.transformDelivery(updated);
  }

  async complete(id: string, companyId: string): Promise<DeliveryResponseDto> {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id, companyId },
    });

    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    const updated = await this.prisma.delivery.update({
      where: { id },
      data: {
        status: 'DELIVERED',
        deliveredDate: new Date(),
      },
      include: {
        sale: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    sku: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    await this.cache.del(this.LIST_KEY(companyId));
    await this.cache.del(this.ITEM_KEY(companyId, id));

    return this.transformDelivery(updated);
  }

  async update(
    id: string,
    companyId: string,
    dto: UpdateDeliveryDto,
  ): Promise<DeliveryResponseDto> {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id, companyId },
    });

    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    const updated = await this.prisma.delivery.update({
      where: { id },
      data: {
        ...(dto.trackingNumber !== undefined && {
          trackingNumber: dto.trackingNumber,
        }),
        ...(dto.deliveryAddress !== undefined && {
          deliveryAddress: dto.deliveryAddress,
        }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
      include: {
        sale: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    sku: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    await this.cache.del(this.LIST_KEY(companyId));
    await this.cache.del(this.ITEM_KEY(companyId, id));

    return this.transformDelivery(updated);
  }

  async remove(id: string, companyId: string): Promise<void> {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id, companyId },
    });

    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    await this.prisma.delivery.delete({
      where: { id },
    });

    await this.cache.del(this.LIST_KEY(companyId));
    await this.cache.del(this.ITEM_KEY(companyId, id));
  }

  private transformDelivery(delivery: any): DeliveryResponseDto {
    return {
      id: delivery.id,
      status: delivery.status,
      trackingNumber: delivery.trackingNumber,
      deliveryAddress: delivery.deliveryAddress,
      dispatchDate: delivery.dispatchDate?.toISOString() ?? null,
      deliveredDate: delivery.deliveredDate?.toISOString() ?? null,
      createdAt: delivery.createdAt.toISOString(),
      updatedAt: delivery.updatedAt.toISOString(),
      sale: {
        id: delivery.sale.id,
        invoiceNumber: delivery.sale.invoiceNumber,
        totalAmount: delivery.sale.totalAmount.toString(),
        saleDate: delivery.sale.saleDate.toISOString(),
        customer: {
          id: delivery.sale.customer.id,
          name: delivery.sale.customer.name,
          email: delivery.sale.customer.email,
        },
        items: delivery.sale.items.map((item: any) => ({
          id: item.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toString(),
          product: {
            id: item.product.id,
            name: item.product.name,
            sku: item.product.sku,
          },
        })),
      },
    };
  }
}
