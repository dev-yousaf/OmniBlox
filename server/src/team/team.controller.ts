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
import { TeamService } from './team.service';
import {
  GetCurrentUser,
  GetCurrentUserId,
  GetCurrentCompanyId,
} from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import {
  CreateUserDto,
  UpdateUserDto,
  ChangePasswordDto,
  UserResponseDto,
  UserListResponseDto,
  UserStatsDto,
} from './dto/team.dto';

@UseGuards(AuthGuard)
@Controller('team')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Post()
  async createUser(
    @Body() createUserDto: CreateUserDto,
    @GetCurrentCompanyId() companyId: string,
    @GetCurrentUser('role') currentUserRole: UserRole,
  ): Promise<UserResponseDto> {
    return this.teamService.createUser(
      createUserDto,
      companyId,
      currentUserRole,
    );
  }

  @Get()
  async findAll(
    @GetCurrentCompanyId() companyId: string,
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
  async getStats(
    @GetCurrentCompanyId() companyId: string,
  ): Promise<UserStatsDto> {
    return this.teamService.getStats(companyId);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @GetCurrentCompanyId() companyId: string,
  ): Promise<UserResponseDto> {
    return this.teamService.findOne(id, companyId);
  }

  @Put(':id')
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @GetCurrentCompanyId() companyId: string,
    @GetCurrentUser('role') currentUserRole: UserRole,
    @GetCurrentUserId() currentUserId: string,
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
  async changePassword(
    @Param('id') id: string,
    @Body() changePasswordDto: ChangePasswordDto,
    @GetCurrentCompanyId() companyId: string,
  ): Promise<{ message: string }> {
    return this.teamService.changePassword(id, changePasswordDto, companyId);
  }

  @Delete(':id')
  async removeUser(
    @Param('id') id: string,
    @GetCurrentCompanyId() companyId: string,
    @GetCurrentUser('role') currentUserRole: UserRole,
    @GetCurrentUserId() currentUserId: string,
  ): Promise<{ message: string }> {
    return this.teamService.removeUser(
      id,
      companyId,
      currentUserRole,
      currentUserId,
    );
  }
}
