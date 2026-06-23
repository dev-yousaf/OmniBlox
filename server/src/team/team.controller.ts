import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CompanyId } from '../auth/decorators/company-id.decorator';
import { UserId } from '../auth/decorators/user-id.decorator';
import { GetCurrentUser } from '../auth/decorators/current-user.decorator';
import { TeamService } from './team.service';
import { UserRole } from '@prisma/client';
import {
  CreateUserDto,
  UpdateUserDto,
  ChangePasswordDto,
  UserResponseDto,
  UserListResponseDto,
  UserStatsDto,
} from './dto/team.dto';

@UseGuards(AuthGuard, RolesGuard)
@Controller('team')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async createUser(
    @Body() createUserDto: CreateUserDto,
    @CompanyId() companyId: string,
    @GetCurrentUser('role') currentUserRole: UserRole,
    @UserId() currentUserId: string,
  ): Promise<UserResponseDto> {
    return this.teamService.createUser(
      createUserDto,
      companyId,
      currentUserRole,
      currentUserId,
    );
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  async findAll(
    @CompanyId() companyId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('search') search?: string,
    @Query('role') role?: UserRole,
  ): Promise<UserListResponseDto | UserResponseDto[]> {
    if (page || limit) {
      return this.teamService.findAllPaginated(
        companyId,
        page,
        limit,
        search,
        role,
      );
    }
    return this.teamService.findAll(companyId);
  }

  @Get('stats')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  async getStats(
    @CompanyId() companyId: string,
  ): Promise<UserStatsDto> {
    return this.teamService.getStats(companyId);
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  async findOne(
    @Param('id') id: string,
    @CompanyId() companyId: string,
  ): Promise<UserResponseDto> {
    return this.teamService.findOne(id, companyId);
  }

  @Put(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CompanyId() companyId: string,
    @GetCurrentUser('role') currentUserRole: UserRole,
    @UserId() currentUserId: string,
  ): Promise<UserResponseDto> {
    return this.teamService.updateUser(
      id,
      updateUserDto,
      companyId,
      currentUserRole,
      currentUserId,
    );
  }

  @Put(':id/password')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async changePassword(
    @Param('id') id: string,
    @Body() changePasswordDto: ChangePasswordDto,
    @CompanyId() companyId: string,
  ): Promise<{ message: string }> {
    return this.teamService.changePassword(id, changePasswordDto, companyId);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async removeUser(
    @Param('id') id: string,
    @CompanyId() companyId: string,
    @GetCurrentUser('role') currentUserRole: UserRole,
    @UserId() currentUserId: string,
  ): Promise<{ message: string }> {
    return this.teamService.removeUser(
      id,
      companyId,
      currentUserRole,
      currentUserId,
    );
  }
}
