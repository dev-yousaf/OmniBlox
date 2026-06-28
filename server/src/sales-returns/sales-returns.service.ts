import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateSalesReturnDto,
  CreateSalesReturnItemDto,
} from './dto/create-sales-return.dto';
import { UpdateSalesReturnDto } from './dto/update-sales-return.dto';

@Injectable()
export class SalesReturnsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new sales return and update inventory atomically
   * This is the MOST CRITICAL METHOD - it must be transactional
   */
  async create(dto: CreateSalesReturnDto, userId: string, companyId: string) {
    // Validate warehouse belongs to company
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: dto.warehouseId, companyId },
    });

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    // Validate all products exist
    const productIds = dto.items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, companyId },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('One or more products not found');
    }

    // Use transaction to ensure atomicity
    return await this.prisma.$transaction(
      async (tx) => {
        // Generate unique reference number
        const referenceNumber = `SR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        // Calculate total
        const totalAmount = dto.items.reduce(
          (sum, item) => sum + item.quantity * item.unitPrice,
          0,
        );

        // Create sales return with items
        const salesReturn = await tx.salesReturn.create({
          data: {
            referenceNumber,
            totalAmount,
            reason: dto.reason,
            warehouseId: dto.warehouseId,
            saleId: dto.saleId, // Link to original sale if provided
            userId,
            companyId,
            items: {
              create: dto.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                saleItemId: item.saleItemId, // Link to original sale item if provided
              })),
            },
          },
          include: {
            items: {
              include: {
                product: true,
              },
            },
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            warehouse: true,
          },
        });

        // Note: Inventory will be incremented when status changes to COMPLETED
        // Update inventory - ADD stock back (customer returning goods)
        // for (const item of dto.items) {
        //   await tx.inventory.upsert({
        //     where: {
        //       productId_warehouseId: {
        //         productId: item.productId,
        //         warehouseId: dto.warehouseId,
        //       },
        //     },
        //     update: {
        //       quantity: {
        //         increment: item.quantity, // Atomic increment
        //       },
        //     },
        //     create: {
        //       productId: item.productId,
        //       warehouseId: dto.warehouseId,
        //       quantity: item.quantity,
        //     },
        //   });
        // }

        return salesReturn;
      },
      { timeout: 20000 },
    );
  }

  /**
   * Get all sales returns for a company
   */
  async findAll(companyId: string) {
    return this.prisma.salesReturn.findMany({
      where: { companyId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        warehouse: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get a single sales return by ID
   */
  async findOne(id: string, companyId: string) {
    const salesReturn = await this.prisma.salesReturn.findFirst({
      where: { id, companyId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        warehouse: true,
      },
    });

    if (!salesReturn) {
      throw new NotFoundException(`Sales return with ID ${id} not found`);
    }

    return salesReturn;
  }

  /**
   * Update a sales return (status changes primarily)
   */
  async update(id: string, dto: UpdateSalesReturnDto, companyId: string) {
    // Get existing sales return
    const existing = await this.findOne(id, companyId);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.salesReturn.update({
        where: { id },
        data: {
          ...(dto.status && { status: dto.status }),
          ...(dto.reason && { reason: dto.reason }),
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          warehouse: true,
        },
      });

      // Handle inventory adjustments based on status changes
      const newStatus = dto.status;
      if (newStatus && newStatus !== existing.status) {
        if (newStatus === 'COMPLETED' && existing.status !== 'COMPLETED') {
          // Sales return completed - increment inventory
          for (const item of updated.items) {
            await tx.inventory.upsert({
              where: {
                productId_warehouseId: {
                  productId: item.productId,
                  warehouseId: updated.warehouseId,
                },
              },
              update: {
                quantity: {
                  increment: item.quantity, // Atomic increment
                },
              },
              create: {
                productId: item.productId,
                warehouseId: updated.warehouseId,
                quantity: item.quantity,
              },
            });

            // Get updated inventory for ledger balance
            const inv = await tx.inventory.findUnique({
              where: {
                productId_warehouseId: {
                  productId: item.productId,
                  warehouseId: updated.warehouseId,
                },
              },
            });

            // Create stock ledger entry
            await tx.stockLedger.create({
              data: {
                productId: item.productId,
                warehouseId: updated.warehouseId,
                userId: updated.userId,
                quantity: item.quantity,
                balance: inv?.quantity ?? item.quantity,
                type: 'RETURN',
                reference: updated.referenceNumber,
                note: `Sales return #${updated.referenceNumber}`,
              },
            });

            // Update returned quantity on original sale item if linked
            if (item.saleItemId) {
              await tx.saleItem.update({
                where: { id: item.saleItemId },
                data: {
                  returnedQuantity: {
                    increment: item.quantity,
                  },
                },
              });
            }
          }

          // Mark the sale as having returns if linked
          if (updated.saleId) {
            await tx.sale.update({
              where: { id: updated.saleId },
              data: { hasReturns: true },
            });
          }
        } else if (
          newStatus === 'CANCELLED' &&
          existing.status === 'COMPLETED'
        ) {
          // Sales return cancelled after being completed - decrement inventory back
          for (const item of updated.items) {
            await tx.inventory.update({
              where: {
                productId_warehouseId: {
                  productId: item.productId,
                  warehouseId: updated.warehouseId,
                },
              },
              data: {
                quantity: {
                  decrement: item.quantity,
                },
              },
            });

            // Get updated inventory for ledger balance
            const inv = await tx.inventory.findUnique({
              where: {
                productId_warehouseId: {
                  productId: item.productId,
                  warehouseId: updated.warehouseId,
                },
              },
            });

            // Create stock ledger entry (negative for reversal)
            await tx.stockLedger.create({
              data: {
                productId: item.productId,
                warehouseId: updated.warehouseId,
                userId: updated.userId,
                quantity: -(item.quantity),
                balance: inv?.quantity ?? 0,
                type: 'RETURN',
                reference: updated.referenceNumber,
                note: `Sales return #${updated.referenceNumber} cancelled`,
              },
            });

            // Reverse returned quantity on original sale item if linked
            if (item.saleItemId) {
              await tx.saleItem.update({
                where: { id: item.saleItemId },
                data: {
                  returnedQuantity: {
                    decrement: item.quantity,
                  },
                },
              });
            }
          }

          // Check if sale still has any returns
          if (updated.saleId) {
            const saleItems = await tx.saleItem.findMany({
              where: { saleId: updated.saleId },
              select: { returnedQuantity: true },
            });
            const hasAnyReturns = saleItems.some(
              (item) => item.returnedQuantity > 0,
            );

            await tx.sale.update({
              where: { id: updated.saleId },
              data: { hasReturns: hasAnyReturns },
            });
          }
        } else if (newStatus === 'PENDING' && existing.status === 'COMPLETED') {
          // Sales return reset to pending after being completed - decrement inventory back
          for (const item of updated.items) {
            await tx.inventory.update({
              where: {
                productId_warehouseId: {
                  productId: item.productId,
                  warehouseId: updated.warehouseId,
                },
              },
              data: {
                quantity: {
                  decrement: item.quantity,
                },
              },
            });

            const inv = await tx.inventory.findUnique({
              where: {
                productId_warehouseId: {
                  productId: item.productId,
                  warehouseId: updated.warehouseId,
                },
              },
            });

            await tx.stockLedger.create({
              data: {
                productId: item.productId,
                warehouseId: updated.warehouseId,
                userId: updated.userId,
                quantity: -(item.quantity),
                balance: inv?.quantity ?? 0,
                type: 'RETURN',
                reference: updated.referenceNumber,
                note: `Sales return #${updated.referenceNumber} reset to pending`,
              },
            });

            // Reverse returned quantity on original sale item if linked
            if (item.saleItemId) {
              await tx.saleItem.update({
                where: { id: item.saleItemId },
                data: {
                  returnedQuantity: {
                    decrement: item.quantity,
                  },
                },
              });
            }
          }

          // Check if sale still has any returns
          if (updated.saleId) {
            const saleItems = await tx.saleItem.findMany({
              where: { saleId: updated.saleId },
              select: { returnedQuantity: true },
            });
            const hasAnyReturns = saleItems.some(
              (item) => item.returnedQuantity > 0,
            );

            await tx.sale.update({
              where: { id: updated.saleId },
              data: { hasReturns: hasAnyReturns },
            });
          }
        }
      }

      return updated;
    });
  }

  /**
   * Delete a sales return
   * NOTE: This should reverse inventory changes if status is COMPLETED
   */
  async remove(id: string, companyId: string) {
    const salesReturn = await this.findOne(id, companyId);

    return await this.prisma.$transaction(async (tx) => {
      // If completed, reverse inventory changes
      if (salesReturn.status === 'COMPLETED') {
        for (const item of salesReturn.items) {
          await tx.inventory.update({
            where: {
              productId_warehouseId: {
                productId: item.productId,
                warehouseId: salesReturn.warehouseId,
              },
            },
            data: {
              quantity: {
                decrement: item.quantity,
              },
            },
          });

          const inv = await tx.inventory.findUnique({
            where: {
              productId_warehouseId: {
                productId: item.productId,
                warehouseId: salesReturn.warehouseId,
              },
            },
          });

          await tx.stockLedger.create({
            data: {
              productId: item.productId,
              warehouseId: salesReturn.warehouseId,
              userId: salesReturn.userId,
              quantity: -(item.quantity),
              balance: inv?.quantity ?? 0,
              type: 'RETURN',
              reference: salesReturn.referenceNumber,
              note: `Sales return #${salesReturn.referenceNumber} deleted`,
            },
          });
        }
      }

      // Revert returnedQuantity on sale items if linked
      for (const item of salesReturn.items) {
        if ((item as any).saleItemId) {
          await tx.saleItem.update({
            where: { id: (item as any).saleItemId },
            data: {
              returnedQuantity: {
                decrement: item.quantity,
              },
            },
          });
        }
      }

      // Recalculate sale.hasReturns if linked
      if (salesReturn.saleId) {
        const saleItems = await tx.saleItem.findMany({
          where: { saleId: salesReturn.saleId },
          select: { returnedQuantity: true },
        });
        const hasAnyReturns = saleItems.some((si) => si.returnedQuantity > 0);
        await tx.sale.update({
          where: { id: salesReturn.saleId },
          data: { hasReturns: hasAnyReturns },
        });
      }

      // Delete the return
      await tx.salesReturn.delete({ where: { id } });

      return { message: 'Sales return deleted successfully' };
    });
  }
}
