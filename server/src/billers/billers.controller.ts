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
import { BillersService } from './billers.service';
import { GetCurrentCompanyId } from '../auth/decorators/current-user.decorator';
import {
  CreateBillerDto,
  UpdateBillerDto,
  BillerResponseDto,
  BillerListResponseDto,
  BillerStatsDto,
} from './dto/billers.dto';

@UseGuards(AuthGuard)
@Controller('billers')
export class BillersController {
  constructor(private readonly billersService: BillersService) {}

  @Post()
  async create(
    @Body() createBillerDto: CreateBillerDto,
    @GetCurrentCompanyId() companyId: string,
  ): Promise<BillerResponseDto> {
    return this.billersService.create(createBillerDto, companyId);
  }

  @Get()
  async findAll(
    @GetCurrentCompanyId() companyId: string,
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
  async getStats(
    @GetCurrentCompanyId() companyId: string,
  ): Promise<BillerStatsDto> {
    return this.billersService.getStats(companyId);
  }

  @Get('check-code')
  async checkCodeAvailability(
    @Query('code') code: string,
    @Query('excludeId') excludeId: string | undefined,
    @GetCurrentCompanyId() companyId: string,
  ): Promise<{ available: boolean }> {
    return this.billersService.checkCodeAvailability(
      code,
      companyId,
      excludeId,
    );
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @GetCurrentCompanyId() companyId: string,
  ): Promise<BillerResponseDto> {
    return this.billersService.findOne(id, companyId);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateBillerDto: UpdateBillerDto,
    @GetCurrentCompanyId() companyId: string,
  ): Promise<BillerResponseDto> {
    return this.billersService.update(id, updateBillerDto, companyId);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @GetCurrentCompanyId() companyId: string,
  ): Promise<{ message: string }> {
    return this.billersService.remove(id, companyId);
  }
}
