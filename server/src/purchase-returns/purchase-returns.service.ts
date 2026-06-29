import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseReturnDto } from './dto/create-purchase-return.dto';
import { UpdatePurchaseReturnDto } from './dto/update-purchase-return.dto';

@Injectable()
export class PurchaseReturnsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new purchase return and update inventory atomically
   * This is the MOST CRITICAL METHOD - it must be transactional
   */
  async create(
    dto: CreatePurchaseReturnDto,
    userId: string,
    companyId: string,
  ) {
    // Validate warehouse belongs to company
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: dto.warehouseId, companyId },
    });

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    // Validate supplier belongs to company
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: dto.supplierId, companyId },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    // Validate all products exist
    const productIds = dto.items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, companyId },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('One or more products not found');
    }

    // Reject if the linked purchase order has all items already fully returned
    if (dto.purchaseOrderId) {
      const poItems = await this.prisma.purchaseOrderItem.findMany({
        where: { purchaseOrderId: dto.purchaseOrderId },
        select: { quantity: true, returnedQuantity: true },
      });
      const allReturned = poItems.every(
        (poi) => poi.returnedQuantity >= poi.quantity,
      );
      if (allReturned) {
        throw new BadRequestException(
          'All items on this purchase order have already been fully returned.',
        );
      }
    }

    // Check inventory levels before proceeding
    for (const item of dto.items) {
      const inventory = await this.prisma.inventory.findUnique({
        where: {
          productId_warehouseId: {
            productId: item.productId,
            warehouseId: dto.warehouseId,
          },
        },
      });

      if (!inventory || inventory.quantity < item.quantity) {
        const product = products.find((p) => p.id === item.productId);
        throw new BadRequestException(
          `Insufficient stock for product ${product?.name || item.productId}. Available: ${inventory?.quantity || 0}, Required: ${item.quantity}`,
        );
      }

      // Validate against purchase order item remaining quantity
      if (item.purchaseOrderItemId) {
        const poi = await this.prisma.purchaseOrderItem.findUnique({
          where: { id: item.purchaseOrderItemId },
          select: { quantity: true, returnedQuantity: true },
        });

        if (!poi) {
          throw new BadRequestException('Purchase order item not found');
        }

        const available = poi.quantity - poi.returnedQuantity;
        if (item.quantity > available) {
          throw new BadRequestException(
            `Cannot return ${item.quantity} of this item. Only ${available} remaining unreturned.`,
          );
        }
      }
    }

    // Use transaction to ensure atomicity
    return await this.prisma.$transaction(
      async (tx) => {
        // Generate unique reference number
        const referenceNumber = `PR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        // Calculate total
        const totalAmount = dto.items.reduce(
          (sum, item) => sum + item.quantity * item.unitPrice,
          0,
        );

        // Create purchase return with items
        const purchaseReturn = await tx.purchaseReturn.create({
          data: {
            referenceNumber,
            totalAmount,
            reason: dto.reason,
            warehouseId: dto.warehouseId,
            supplierId: dto.supplierId,
            purchaseOrderId: dto.purchaseOrderId, // Link to original purchase if provided
            userId,
            companyId,
            items: {
              create: dto.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                purchaseOrderItemId: item.purchaseOrderItemId, // Link to original purchase item if provided
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
            supplier: true,
          },
        });

        // Note: Inventory will be decremented when status changes to COMPLETED
        // Update inventory - SUBTRACT stock (returning goods to supplier)
        // for (const item of dto.items) {
        //   await tx.inventory.update({
        //     where: {
        //       productId_warehouseId: {
        //         productId: item.productId,
        //         warehouseId: dto.warehouseId,
        //       },
        //     },
        //     data: {
        //       quantity: {
        //         decrement: item.quantity, // Atomic decrement
        //       },
        //     },
        //   });
        // }

        return purchaseReturn;
      },
      { timeout: 20000 },
    );
  }

  /**
   * Get all purchase returns for a company
   */
  async findAll(companyId: string) {
    return this.prisma.purchaseReturn.findMany({
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
        supplier: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get a single purchase return by ID
   */
  async findOne(id: string, companyId: string) {
    const purchaseReturn = await this.prisma.purchaseReturn.findFirst({
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
        supplier: true,
      },
    });

    if (!purchaseReturn) {
      throw new NotFoundException(`Purchase return with ID ${id} not found`);
    }

    return purchaseReturn;
  }

  /**
   * Update a purchase return (status changes primarily)
   */
  async update(id: string, dto: UpdatePurchaseReturnDto, companyId: string) {
    // Get existing purchase return
    const existing = await this.findOne(id, companyId);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.purchaseReturn.update({
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
          supplier: true,
        },
      });

      // Handle inventory adjustments based on status changes
      const newStatus = dto.status;
      if (newStatus && newStatus !== existing.status) {
        if (newStatus === 'COMPLETED' && existing.status !== 'COMPLETED') {
          // Purchase return completed - decrement inventory
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
                  decrement: item.quantity, // Atomic decrement
                },
              },
            });

            // Update returned quantity on original purchase item if linked
            if (item.purchaseOrderItemId) {
              const poi = await tx.purchaseOrderItem.findUnique({
                where: { id: item.purchaseOrderItemId },
                select: { quantity: true, returnedQuantity: true },
              });

              if (poi) {
                const newReturned = poi.returnedQuantity + item.quantity;
                if (newReturned > poi.quantity) {
                  throw new BadRequestException(
                    `Cannot return more than ordered quantity (${poi.quantity}). Already returned: ${poi.returnedQuantity}.`,
                  );
                }
              }

              await tx.purchaseOrderItem.update({
                where: { id: item.purchaseOrderItemId },
                data: {
                  returnedQuantity: {
                    increment: item.quantity,
                  },
                },
              });
            }

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
                note: `Purchase return #${updated.referenceNumber} completed`,
              },
            });
          }

          // Mark the purchase order as having returns if linked
          if (updated.purchaseOrderId) {
            await tx.purchaseOrder.update({
              where: { id: updated.purchaseOrderId },
              data: { hasReturns: true },
            });
          }
        } else if (
          newStatus === 'CANCELLED' &&
          existing.status === 'COMPLETED'
        ) {
          // Purchase return cancelled after being completed - increment inventory back
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
                  increment: item.quantity,
                },
              },
            });

            // Reverse returned quantity on original purchase item if linked
            if (item.purchaseOrderItemId) {
              await tx.purchaseOrderItem.update({
                where: { id: item.purchaseOrderItemId },
                data: {
                  returnedQuantity: {
                    decrement: item.quantity,
                  },
                },
              });
            }

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
                quantity: item.quantity,
                balance: inv?.quantity ?? 0,
                type: 'RETURN',
                reference: updated.referenceNumber,
                note: `Purchase return #${updated.referenceNumber} cancelled`,
              },
            });
          }

          // Check if purchase order still has any returns
          if (updated.purchaseOrderId) {
            const purchaseItems = await tx.purchaseOrderItem.findMany({
              where: { purchaseOrderId: updated.purchaseOrderId },
              select: { returnedQuantity: true },
            });
            const hasAnyReturns = purchaseItems.some(
              (item) => item.returnedQuantity > 0,
            );

            await tx.purchaseOrder.update({
              where: { id: updated.purchaseOrderId },
              data: { hasReturns: hasAnyReturns },
            });
          }
        } else if (newStatus === 'PENDING' && existing.status === 'COMPLETED') {
          // Purchase return reset to pending after being completed - increment inventory back
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
                  increment: item.quantity,
                },
              },
            });

            // Reverse returned quantity on original purchase item if linked
            if (item.purchaseOrderItemId) {
              await tx.purchaseOrderItem.update({
                where: { id: item.purchaseOrderItemId },
                data: {
                  returnedQuantity: {
                    decrement: item.quantity,
                  },
                },
              });
            }

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
                quantity: item.quantity,
                balance: inv?.quantity ?? 0,
                type: 'RETURN',
                reference: updated.referenceNumber,
                note: `Purchase return #${updated.referenceNumber} reset to pending`,
              },
            });
          }

          // Check if purchase order still has any returns
          if (updated.purchaseOrderId) {
            const purchaseItems = await tx.purchaseOrderItem.findMany({
              where: { purchaseOrderId: updated.purchaseOrderId },
              select: { returnedQuantity: true },
            });
            const hasAnyReturns = purchaseItems.some(
              (item) => item.returnedQuantity > 0,
            );

            await tx.purchaseOrder.update({
              where: { id: updated.purchaseOrderId },
              data: { hasReturns: hasAnyReturns },
            });
          }
        }
      }

      return updated;
    });
  }

  /**
   * Delete a purchase return
   * NOTE: This should reverse inventory changes if status is COMPLETED
   */
  async remove(id: string, companyId: string) {
    const purchaseReturn = await this.findOne(id, companyId);

    // If completed, we need to reverse inventory changes
    if (purchaseReturn.status === 'COMPLETED') {
      return await this.prisma.$transaction(async (tx) => {
        // Reverse inventory changes (add back what was removed)
        for (const item of purchaseReturn.items) {
          await tx.inventory.upsert({
            where: {
              productId_warehouseId: {
                productId: item.productId,
                warehouseId: purchaseReturn.warehouseId,
              },
            },
            update: {
              quantity: {
                increment: item.quantity,
              },
            },
            create: {
              productId: item.productId,
              warehouseId: purchaseReturn.warehouseId,
              quantity: item.quantity,
            },
          });
        }

          // Revert returned quantity on original purchase items
          for (const item of purchaseReturn.items) {
            if (item.purchaseOrderItemId) {
              await tx.purchaseOrderItem.update({
                where: { id: item.purchaseOrderItemId },
                data: {
                  returnedQuantity: {
                    decrement: item.quantity,
                  },
                },
              });
            }
          }

          // Recalculate purchase order hasReturns
          if (purchaseReturn.purchaseOrderId) {
            const purchaseItems = await tx.purchaseOrderItem.findMany({
              where: { purchaseOrderId: purchaseReturn.purchaseOrderId },
              select: { returnedQuantity: true },
            });
            const hasAnyReturns = purchaseItems.some(
              (item) => item.returnedQuantity > 0,
            );
            await tx.purchaseOrder.update({
              where: { id: purchaseReturn.purchaseOrderId },
              data: { hasReturns: hasAnyReturns },
            });
          }

          // Create stock ledger entries
          for (const item of purchaseReturn.items) {
            const inv = await tx.inventory.findUnique({
              where: {
                productId_warehouseId: {
                  productId: item.productId,
                  warehouseId: purchaseReturn.warehouseId,
                },
              },
            });

            await tx.stockLedger.create({
              data: {
                productId: item.productId,
                warehouseId: purchaseReturn.warehouseId,
                userId: purchaseReturn.userId,
                quantity: item.quantity,
                balance: inv?.quantity ?? 0,
                type: 'RETURN',
                reference: purchaseReturn.referenceNumber,
                note: `Purchase return #${purchaseReturn.referenceNumber} deleted`,
              },
            });
          }

        // Delete the return
        await tx.purchaseReturn.delete({ where: { id } });

        return { message: 'Purchase return deleted successfully' };
      });
    }

    // If not completed, just delete but revert purchase order item quantities if linked
    return await this.prisma.$transaction(async (tx) => {
      if (purchaseReturn.purchaseOrderId) {
        for (const item of purchaseReturn.items) {
          if (item.purchaseOrderItemId) {
            await tx.purchaseOrderItem.update({
              where: { id: item.purchaseOrderItemId },
              data: {
                returnedQuantity: {
                  decrement: item.quantity,
                },
              },
            });
          }
        }

        const purchaseItems = await tx.purchaseOrderItem.findMany({
          where: { purchaseOrderId: purchaseReturn.purchaseOrderId },
          select: { returnedQuantity: true },
        });
        const hasAnyReturns = purchaseItems.some(
          (item) => item.returnedQuantity > 0,
        );
        await tx.purchaseOrder.update({
          where: { id: purchaseReturn.purchaseOrderId },
          data: { hasReturns: hasAnyReturns },
        });
      }

      await tx.purchaseReturn.delete({ where: { id } });
      return { message: 'Purchase return deleted successfully' };
    });
  }
}
