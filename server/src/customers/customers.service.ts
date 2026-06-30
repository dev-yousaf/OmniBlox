import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import {
  CustomerResponseDto,
  CustomersListResponseDto,
} from './dto/customer-response.dto';

const CACHE_TTL = 60 * 5;
const LIST_KEY = (cid: string, page?: number, search?: string) =>
  `customers:${cid}:list:${page ?? 1}:${search ?? ''}`;
const ITEM_KEY = (cid: string, id: string) => `customers:${cid}:${id}`;
const STATS_KEY = (cid: string) => `customers:${cid}:stats`;

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async create(
    dto: CreateCustomerDto,
    companyId: string,
  ): Promise<CustomerResponseDto> {
    if (dto.email) {
      const existingCustomer = await this.prisma.customer.findFirst({
        where: { email: dto.email, companyId },
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
        creditLimit: dto.creditLimit,
        balance: dto.balance,
        companyId,
      },
    });

    await Promise.all([
      this.cache.del(LIST_KEY(companyId)),
      this.cache.del(STATS_KEY(companyId)),
    ]);
    return this.transformCustomer(customer);
  }

  async getDashboardStats(companyId: string) {
    const cacheKey = STATS_KEY(companyId);
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const [totalCustomers, newCustomersThisMonth] = await Promise.all([
      this.prisma.customer.count({ where: { companyId } }),
      this.prisma.customer.count({
        where: { companyId, createdAt: { gte: startOfMonth } },
      }),
    ]);

    const data = { totalCustomers, newCustomersThisMonth };
    await this.cache.set(cacheKey, data, 60 * 2);
    return data;
  }

  async findAll(
    companyId: string,
    page = 1,
    limit = 10,
    search?: string,
  ): Promise<CustomersListResponseDto> {
    const cacheKey = LIST_KEY(companyId, page, search);
    const cached = await this.cache.get<CustomersListResponseDto>(cacheKey);
    if (cached) return cached;

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

    const data: CustomersListResponseDto = {
      customers: customers.map((c) => this.transformCustomer(c)),
      total,
      pages: limit === 0 ? 1 : Math.max(1, Math.ceil(total / limit)),
    };

    await this.cache.set(cacheKey, data, CACHE_TTL);
    return data;
  }

  async findOne(id: string, companyId: string): Promise<CustomerResponseDto> {
    const cacheKey = ITEM_KEY(companyId, id);
    const cached = await this.cache.get<CustomerResponseDto>(cacheKey);
    if (cached) return cached;

    const customer = await this.prisma.customer.findUnique({
      where: { id, companyId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const data = this.transformCustomer(customer);
    await this.cache.set(cacheKey, data, CACHE_TTL);
    return data;
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

    if (dto.email && dto.email !== existingCustomer.email) {
      const duplicateCustomer = await this.prisma.customer.findFirst({
        where: { email: dto.email, companyId, id: { not: id } },
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
        creditLimit: dto.creditLimit,
        balance: dto.balance,
      },
    });

    await Promise.all([
      this.cache.del(LIST_KEY(companyId)),
      this.cache.del(ITEM_KEY(companyId, id)),
      this.cache.del(STATS_KEY(companyId)),
    ]);
    return this.transformCustomer(updatedCustomer);
  }

  async remove(id: string, companyId: string): Promise<void> {
    const customer = await this.prisma.customer.findUnique({
      where: { id, companyId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const salesCount = await this.prisma.sale.count({
      where: { customerId: id, companyId },
    });
    if (salesCount > 0) {
      throw new BadRequestException(
        'Cannot delete customer with existing sales. Archive the customer instead.',
      );
    }

    await this.prisma.customer.delete({ where: { id } });

    await Promise.all([
      this.cache.del(LIST_KEY(companyId)),
      this.cache.del(ITEM_KEY(companyId, id)),
      this.cache.del(STATS_KEY(companyId)),
    ]);
  }

  private transformCustomer(customer: any): CustomerResponseDto {
    return {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      creditLimit: customer.creditLimit
        ? Number(customer.creditLimit)
        : undefined,
      balance: customer.balance ? Number(customer.balance) : undefined,
      companyId: customer.companyId,
      createdAt: customer.createdAt.toISOString(),
      updatedAt: customer.updatedAt.toISOString(),
    };
  }
}
