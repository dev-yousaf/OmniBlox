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
import { UserRole } from '@prisma/client';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CompanyId } from '../auth/decorators/company-id.decorator';
import { BillersService } from './billers.service';
import {
  CreateBillerDto,
  UpdateBillerDto,
  BillerResponseDto,
  BillerListResponseDto,
  BillerStatsDto,
} from './dto/billers.dto';

@UseGuards(AuthGuard, RolesGuard)
@Controller('billers')
export class BillersController {
  constructor(private readonly billersService: BillersService) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  async create(
    @Body() createBillerDto: CreateBillerDto,
    @CompanyId() companyId: string,
  ): Promise<BillerResponseDto> {
    return this.billersService.create(createBillerDto, companyId);
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER)
  async findAll(
    @CompanyId() companyId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ): Promise<BillerListResponseDto | BillerResponseDto[]> {
    if (page || limit) {
      return this.billersService.findAllPaginated(
        companyId,
        page,
        limit,
        search,
        status,
      );
    }
    return this.billersService.findAll(companyId);
  }

  @Get('stats')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER)
  async getStats(
    @CompanyId() companyId: string,
  ): Promise<BillerStatsDto> {
    return this.billersService.getStats(companyId);
  }

  @Get('check-code')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER)
  async checkCodeAvailability(
    @Query('code') code: string,
    @Query('excludeId') excludeId: string | undefined,
    @CompanyId() companyId: string,
  ): Promise<{ available: boolean }> {
    return this.billersService.checkCodeAvailability(
      code,
      companyId,
      excludeId,
    );
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER)
  async findOne(
    @Param('id') id: string,
    @CompanyId() companyId: string,
  ): Promise<BillerResponseDto> {
    return this.billersService.findOne(id, companyId);
  }

  @Put(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  async update(
    @Param('id') id: string,
    @Body() updateBillerDto: UpdateBillerDto,
    @CompanyId() companyId: string,
  ): Promise<BillerResponseDto> {
    return this.billersService.update(id, updateBillerDto, companyId);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  async remove(
    @Param('id') id: string,
    @CompanyId() companyId: string,
  ): Promise<{ message: string }> {
    return this.billersService.remove(id, companyId);
  }
}
