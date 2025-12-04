import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import {
  CustomerResponseDto,
  CustomersListResponseDto,
} from './dto/customer-response.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateCustomerDto,
    companyId: string,
  ): Promise<CustomerResponseDto> {
    // Check for duplicate email within company
    if (dto.email) {
      const existingCustomer = await this.prisma.customer.findFirst({
        where: {
          email: dto.email,
          companyId,
        },
      });

      if (existingCustomer) {
        throw new ConflictException('Customer with this email already exists');
      }
    }

    const customer = await this.prisma.customer.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        companyId,
      },
    });

    return this.transformCustomer(customer);
  }

  /**
   * Dashboard-specific customer aggregations
   */
  async getDashboardStats(companyId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalCustomers, newCustomersThisMonth] = await Promise.all([
      this.prisma.customer.count({ where: { companyId } }),
      this.prisma.customer.count({
        where: { companyId, createdAt: { gte: startOfMonth } },
      }),
    ]);

    return { totalCustomers, newCustomersThisMonth };
  }

  async findAll(
    companyId: string,
    page = 1,
    limit = 10,
    search?: string,
  ): Promise<CustomersListResponseDto> {
    const skip = (page - 1) * limit;
    const where: any = { companyId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      customers: customers.map((customer) => this.transformCustomer(customer)),
      total,
      pages: limit === 0 ? 1 : Math.max(1, Math.ceil(total / limit)),
    };
  }

  async findOne(id: string, companyId: string): Promise<CustomerResponseDto> {
    const customer = await this.prisma.customer.findUnique({
      where: { id, companyId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return this.transformCustomer(customer);
  }

  async update(
    id: string,
    dto: UpdateCustomerDto,
    companyId: string,
  ): Promise<CustomerResponseDto> {
    const existingCustomer = await this.prisma.customer.findUnique({
      where: { id, companyId },
    });

    if (!existingCustomer) {
      throw new NotFoundException('Customer not found');
    }

    // Check for duplicate email within company (excluding current customer)
    if (dto.email && dto.email !== existingCustomer.email) {
      const duplicateCustomer = await this.prisma.customer.findFirst({
        where: {
          email: dto.email,
          companyId,
          id: { not: id },
        },
      });

      if (duplicateCustomer) {
        throw new ConflictException('Customer with this email already exists');
      }
    }

    const updatedCustomer = await this.prisma.customer.update({
      where: { id },
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
      },
    });

    return this.transformCustomer(updatedCustomer);
  }

  async remove(id: string, companyId: string): Promise<void> {
    const customer = await this.prisma.customer.findUnique({
      where: { id, companyId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Check if customer has any sales
    const salesCount = await this.prisma.sale.count({
      where: { customerId: id, companyId },
    });

    if (salesCount > 0) {
      throw new BadRequestException(
        'Cannot delete customer with existing sales. Archive the customer instead.',
      );
    }

    await this.prisma.customer.delete({
      where: { id },
    });
  }

  private transformCustomer(customer: any): CustomerResponseDto {
    return {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      companyId: customer.companyId,
      createdAt: customer.createdAt.toISOString(),
      updatedAt: customer.updatedAt.toISOString(),
    };
  }
}
