import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { UserRole } from '@prisma/client';
import { hashPassword, verifyPassword } from 'better-auth/crypto';
import { randomBytes } from 'crypto';
import { EmailService } from '../email/email.service';
import {
  CreateUserDto,
  UpdateUserDto,
  ChangePasswordDto,
  UserResponseDto,
  UserListResponseDto,
  UserStatsDto,
} from './dto/team.dto';

const LIST_KEY = (cid: string) => `team:${cid}:list`;
const PAGED_KEY = (
  cid: string,
  page: number,
  limit: number,
  search?: string,
  role?: string,
) => `team:${cid}:page:${page}:${limit}:${search ?? ''}:${role ?? ''}`;
const ITEM_KEY = (cid: string, id: string) => `team:${cid}:${id}`;
const STATS_KEY = (cid: string) => `team:${cid}:stats`;

@Injectable()
export class TeamService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private cache: CacheService,
  ) {}

  async createUser(
    dto: CreateUserDto,
    companyId: string,
    currentUserRole: UserRole,
    currentUserId: string,
  ): Promise<UserResponseDto> {
    if (!['OWNER', 'ADMIN'].includes(currentUserRole)) {
      throw new ForbiddenException('Insufficient permissions to create users');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    if (
      dto.role === UserRole.ADMIN &&
      currentUserRole !== ('OWNER' as UserRole)
    ) {
      throw new ForbiddenException('Only company owner can create admin users');
    }

    const inviter = await this.prisma.user.findUnique({
      where: { id: currentUserId },
      include: { company: true },
    });

    const placeholderPassword = randomBytes(32).toString('hex');
    const hashedPassword = await hashPassword(placeholderPassword);

    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: dto.email,
          name: dto.name,
          role: dto.role ?? UserRole.OBSERVER,
          status: 'INVITED',
          password: hashedPassword,
          companyId,
        },
      });
      await tx.account.create({
        data: {
          userId: newUser.id,
          accountId: newUser.id,
          providerId: 'credential',
          password: hashedPassword,
        },
      });
      return newUser;
    });

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    await this.prisma.authToken.create({
      data: { token, type: 'INVITATION', expiresAt, userId: user.id },
    });

    const companyName = inviter?.company?.name || 'the company';
    const inviterName = inviter?.name || 'A team member';
    this.emailService
      .sendInvitationEmail(dto.email, dto.name, token, inviterName, companyName)
      .catch((err) => console.error('Failed to send invitation email:', err));

    await Promise.all([
      this.cache.del(LIST_KEY(companyId)),
      this.cache.del(STATS_KEY(companyId)),
    ]);
    return this.mapToUserResponse(user);
  }

  async findAll(companyId: string): Promise<UserResponseDto[]> {
    const cacheKey = LIST_KEY(companyId);
    const cached = await this.cache.get<UserResponseDto[]>(cacheKey);
    if (cached) return cached;

    const users = await this.prisma.user.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });

    const data = users.map((u) => this.mapToUserResponse(u));
    await this.cache.set(cacheKey, data, 60 * 5);
    return data;
  }

  async findAllPaginated(
    companyId: string,
    page: number = 1,
    limit: number = 10,
    search?: string,
    role?: UserRole,
  ): Promise<UserListResponseDto> {
    const cacheKey = PAGED_KEY(companyId, page, limit, search, role);
    const cached = await this.cache.get<UserListResponseDto>(cacheKey);
    if (cached) return cached;

    const skip = (page - 1) * limit;
    const where: any = { companyId };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
      ];
    }
    if (role) where.role = role;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    const data: UserListResponseDto = {
      users: users.map((u) => this.mapToUserResponse(u)),
      total,
      pages: Math.ceil(total / limit),
    };

    await this.cache.set(cacheKey, data, 60 * 5);
    return data;
  }

  async findOne(id: string, companyId: string): Promise<UserResponseDto> {
    const cacheKey = ITEM_KEY(companyId, id);
    const cached = await this.cache.get<UserResponseDto>(cacheKey);
    if (cached) return cached;

    const user = await this.prisma.user.findFirst({ where: { id, companyId } });
    if (!user) throw new NotFoundException('User not found');

    const data = this.mapToUserResponse(user);
    await this.cache.set(cacheKey, data, 60 * 5);
    return data;
  }

  async updateUser(
    id: string,
    dto: UpdateUserDto,
    companyId: string,
    currentUserRole: UserRole,
    currentUserId: string,
  ): Promise<UserResponseDto> {
    const existingUser = await this.prisma.user.findFirst({
      where: { id, companyId },
    });
    if (!existingUser) throw new NotFoundException('User not found');

    if (id !== currentUserId && !['OWNER', 'ADMIN'].includes(currentUserRole)) {
      throw new ForbiddenException('Insufficient permissions to update user');
    }
    if (
      dto.role === UserRole.ADMIN &&
      currentUserRole !== ('OWNER' as UserRole)
    ) {
      throw new ForbiddenException('Only company owner can assign admin role');
    }
    if (
      dto.role &&
      id !== currentUserId &&
      !['OWNER', 'ADMIN'].includes(currentUserRole)
    ) {
      throw new ForbiddenException(
        'Insufficient permissions to change user role',
      );
    }
    if (dto.email && dto.email !== existingUser.email) {
      const emailExists = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (emailExists)
        throw new ConflictException('User with this email already exists');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: dto,
    });

    await Promise.all([
      this.cache.del(LIST_KEY(companyId)),
      this.cache.del(PAGED_KEY(companyId, 0, 0)),
      this.cache.del(ITEM_KEY(companyId, id)),
      this.cache.del(STATS_KEY(companyId)),
    ]);
    return this.mapToUserResponse(updatedUser);
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
    companyId: string,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, companyId },
    });
    if (!user) throw new NotFoundException('User not found');

    const isPasswordValid = await verifyPassword({
      password: dto.currentPassword,
      hash: user.password,
    });
    if (!isPasswordValid)
      throw new BadRequestException('Current password is incorrect');

    const hashedPassword = await hashPassword(dto.newPassword);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });
      await tx.account.updateMany({
        where: { userId: userId, providerId: 'credential' },
        data: { password: hashedPassword },
      });
    });

    return { message: 'Password changed successfully' };
  }

  async removeUser(
    id: string,
    companyId: string,
    currentUserRole: UserRole,
    currentUserId: string,
  ): Promise<{ message: string }> {
    if (!['OWNER', 'ADMIN'].includes(currentUserRole)) {
      throw new ForbiddenException('Insufficient permissions to remove users');
    }
    if (id === currentUserId)
      throw new BadRequestException('Cannot remove your own account');

    const user = await this.prisma.user.findFirst({ where: { id, companyId } });
    if (!user) throw new NotFoundException('User not found');

    if (
      user.role === UserRole.ADMIN &&
      currentUserRole !== ('OWNER' as UserRole)
    ) {
      throw new ForbiddenException('Only company owner can remove admin users');
    }

    await this.prisma.user.delete({ where: { id } });

    await Promise.all([
      this.cache.del(LIST_KEY(companyId)),
      this.cache.del(ITEM_KEY(companyId, id)),
      this.cache.del(STATS_KEY(companyId)),
    ]);
    return { message: 'User removed successfully' };
  }

  async getStats(companyId: string): Promise<UserStatsDto> {
    const cacheKey = STATS_KEY(companyId);
    const cached = await this.cache.get<UserStatsDto>(cacheKey);
    if (cached) return cached;

    const users = await this.prisma.user.findMany({
      where: { companyId },
      select: { role: true, status: true },
    });

    const data: UserStatsDto = {
      totalUsers: users.length,
      adminCount: users.filter((u) => u.role === UserRole.ADMIN).length,
      managerCount: users.filter((u) => u.role === UserRole.MANAGER).length,
      staffCount: users.filter((u) => u.role === UserRole.OBSERVER).length,
      activeUsers: users.filter((u) => u.status === 'ACTIVE').length,
      inactiveUsers: users.filter((u) => u.status === 'INVITED').length,
    };

    await this.cache.set(cacheKey, data, 60 * 5);
    return data;
  }

  private mapToUserResponse(user: any): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      lastLogin: undefined,
      status: (user.status || 'ACTIVE').toLowerCase() as 'active' | 'inactive',
    };
  }
}
