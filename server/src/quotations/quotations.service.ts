import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';
import { UpdateQuotationStatusDto } from './dto/update-quotation-status.dto';
import { OrderStatus } from '@prisma/client';
import { SalesService } from '../sales/sales.service';
import { CreateSaleDto } from '../sales/dto/create-sale.dto';

@Injectable()
export class QuotationsService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => SalesService))
    private salesService: SalesService,
  ) {}

  /**
   * Create a new quotation
   */
  async create(
    createQuotationDto: CreateQuotationDto,
    userId: string,
    companyId: string,
  ) {
    // Generate reference number
    const count = await this.prisma.quotation.count({
      where: { companyId },
    });
    const referenceNumber = `QT-${String(count + 1).padStart(6, '0')}`;

    // Calculate total amount
    const totalAmount = createQuotationDto.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );

    // Create quotation with items in a transaction
    const quotation = await this.prisma.quotation.create({
      data: {
        referenceNumber,
        totalAmount,
        quoteDate: new Date(createQuotationDto.quoteDate),
        expiryDate: createQuotationDto.expiryDate
          ? new Date(createQuotationDto.expiryDate)
          : null,
        status: OrderStatus.PENDING,
        companyId,
        customerId: createQuotationDto.customerId,
        userId,
        items: {
          create: createQuotationDto.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        customer: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return quotation;
  }

  /**
   * Find all quotations for a company
   */
  async findAll(companyId: string) {
    const quotations = await this.prisma.quotation.findMany({
      where: { companyId },
      include: {
        customer: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return quotations;
  }

  /**
   * Find a single quotation by ID
   */
  async findOne(id: string, companyId: string) {
    const quotation = await this.prisma.quotation.findFirst({
      where: {
        id,
        companyId,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        customer: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!quotation) {
      throw new NotFoundException(`Quotation with ID ${id} not found`);
    }

    return quotation;
  }

  /**
   * Update a quotation
   */
  async update(
    id: string,
    updateQuotationDto: UpdateQuotationDto,
    companyId: string,
  ) {
    // Check if quotation exists
    const existingQuotation = await this.findOne(id, companyId);

    // Calculate new total if items are being updated
    let totalAmount = existingQuotation.totalAmount;
    if (updateQuotationDto.items) {
      totalAmount = updateQuotationDto.items.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0,
      );
    }

    // Update quotation in a transaction
    const quotation = await this.prisma.$transaction(async (tx) => {
      // If items are being updated, delete old items first
      if (updateQuotationDto.items) {
        await tx.quotationItem.deleteMany({
          where: { quotationId: id },
        });
      }

      // Update quotation
      return tx.quotation.update({
        where: { id },
        data: {
          ...(updateQuotationDto.quoteDate && {
            quoteDate: new Date(updateQuotationDto.quoteDate),
          }),
          ...(updateQuotationDto.expiryDate && {
            expiryDate: new Date(updateQuotationDto.expiryDate),
          }),
          ...(updateQuotationDto.customerId && {
            customerId: updateQuotationDto.customerId,
          }),
          ...(updateQuotationDto.items && {
            totalAmount,
            items: {
              create: updateQuotationDto.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
              })),
            },
          }),
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          customer: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    });

    return quotation;
  }

  /**
   * Update quotation status
   */
  async updateStatus(
    id: string,
    updateStatusDto: UpdateQuotationStatusDto,
    companyId: string,
  ) {
    // Check if quotation exists
    await this.findOne(id, companyId);

    const quotation = await this.prisma.quotation.update({
      where: { id },
      data: {
        status: updateStatusDto.status,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        customer: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return quotation;
  }

  /**
   * Delete a quotation
   */
  async remove(id: string, companyId: string) {
    // Check if quotation exists
    await this.findOne(id, companyId);

    await this.prisma.quotation.delete({
      where: { id },
    });

    return { message: 'Quotation deleted successfully' };
  }

  /**
   * Convert an accepted quotation to a sale
   * This is the critical method that handles the conversion workflow
   */
  async convertToSale(
    id: string,
    userId: string,
    companyId: string,
    warehouseId?: string,
  ) {
    // 1) Load quotation and validate status (no long-running transaction)
    const quotation = await this.prisma.quotation.findFirst({
      where: { id, companyId },
      include: {
        items: { include: { product: true } },
        customer: true,
      },
    });

    if (!quotation) {
      throw new NotFoundException(`Quotation with ID ${id} not found`);
    }

    if (quotation.status !== OrderStatus.COMPLETED) {
      throw new BadRequestException(
        'Only accepted quotations can be converted to sales',
      );
    }

    // Check for duplicate conversion
    const existingSale = await this.prisma.sale.findFirst({
      where: { sourceQuotationId: id, companyId },
    });
    if (existingSale) {
      throw new BadRequestException(
        'This quotation has already been converted to a sale',
      );
    }

    // 2) Resolve warehouse (use provided or default)
    let warehouse;
    if (warehouseId) {
      warehouse = await this.prisma.warehouse.findFirst({
        where: { id: warehouseId, companyId },
      });
      if (!warehouse) {
        throw new BadRequestException('Selected warehouse not found.');
      }
    } else {
      warehouse = await this.prisma.warehouse.findFirst({
        where: { companyId },
      });
      if (!warehouse) {
        throw new BadRequestException(
          'No warehouse found. Please create a warehouse first.',
        );
      }
    }

    // 3) Build CreateSaleDto and delegate to SalesService (which handles its own atomic transaction)
    const createSaleDto: CreateSaleDto = {
      customer: {
        id: quotation.customer.id,
        name: quotation.customer.name,
        email: quotation.customer.email || undefined,
        phone: quotation.customer.phone || undefined,
        address: quotation.customer.address || undefined,
      },
      warehouseId: warehouse.id,
      saleDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      items: quotation.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
      })),
      taxRate: 0,
      discount: 0,
      notes: `Converted from Quotation ${quotation.referenceNumber}`,
      shippingAddress: quotation.customer.address || undefined,
    };

    const sale = await this.salesService.create(
      createSaleDto,
      userId,
      companyId,
      quotation.id,
    );

    return {
      sale,
      quotation,
      message: 'Quotation successfully converted to sale',
    };
  }

  /**
   * Get stock levels for all products in a quotation across all warehouses
   */
  async getStockLevels(id: string, companyId: string) {
    const quotation = await this.prisma.quotation.findFirst({
      where: { id, companyId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!quotation) {
      throw new NotFoundException(`Quotation with ID ${id} not found`);
    }

    // Get all warehouses for the company
    const warehouses = await this.prisma.warehouse.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        location: true,
      },
    });

    if (!warehouses.length) {
      throw new BadRequestException(
        'No warehouses found. Please create a warehouse first.',
      );
    }

    // Get inventory for each product in each warehouse
    const productIds = quotation.items.map((item) => item.productId);
    const inventory = await this.prisma.inventory.findMany({
      where: {
        productId: { in: productIds },
        warehouseId: { in: warehouses.map((w) => w.id) },
      },
      select: {
        productId: true,
        warehouseId: true,
        quantity: true,
      },
    });

    // Build response with stock levels per warehouse
    const stockLevels = warehouses.map((warehouse) => {
      const products = quotation.items.map((item) => {
        const stock = inventory.find(
          (inv) =>
            inv.productId === item.productId &&
            inv.warehouseId === warehouse.id,
        );
        const available = stock ? Number(stock.quantity) : 0;
        const required = Number(item.quantity);
        return {
          productId: item.productId,
          productName: item.product.name,
          sku: item.product.sku,
          required,
          available,
          sufficient: available >= required,
        };
      });

      const allSufficient = products.every((p) => p.sufficient);

      return {
        warehouseId: warehouse.id,
        warehouseName: warehouse.name,
        location: warehouse.location,
        products,
        canFulfill: allSufficient,
      };
    });

    return {
      quotationId: quotation.id,
      referenceNumber: quotation.referenceNumber,
      warehouses: stockLevels,
    };
  }
}
