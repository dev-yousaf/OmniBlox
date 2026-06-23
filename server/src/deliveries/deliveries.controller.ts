import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Delete,
  Put,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { DeliveriesService } from './deliveries.service';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CompanyId } from '../auth/decorators/company-id.decorator';
import { DeliveryResponseDto } from './dto/delivery-response.dto';
import { DispatchDeliveryDto } from './dto/dispatch-delivery.dto';
import { UpdateDeliveryDto } from './dto/update-delivery.dto';

@Controller('deliveries')
@UseGuards(AuthGuard, RolesGuard)
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async findAll(
    @CompanyId() companyId: string,
  ): Promise<DeliveryResponseDto[]> {
    return this.deliveriesService.findAll(companyId);
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async findOne(
    @Param('id') id: string,
    @CompanyId() companyId: string,
  ): Promise<DeliveryResponseDto> {
    return this.deliveriesService.findOne(id, companyId);
  }

  @Patch(':id/dispatch')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  async dispatch(
    @Param('id') id: string,
    @CompanyId() companyId: string,
    @Body() dto: DispatchDeliveryDto,
  ): Promise<DeliveryResponseDto> {
    return this.deliveriesService.dispatch(id, companyId, dto);
  }

  @Patch(':id/complete')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  async complete(
    @Param('id') id: string,
    @CompanyId() companyId: string,
  ): Promise<DeliveryResponseDto> {
    return this.deliveriesService.complete(id, companyId);
  }

  @Put(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  async update(
    @Param('id') id: string,
    @CompanyId() companyId: string,
    @Body() dto: UpdateDeliveryDto,
  ): Promise<DeliveryResponseDto> {
    return this.deliveriesService.update(id, companyId, dto);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  async remove(
    @Param('id') id: string,
    @CompanyId() companyId: string,
  ): Promise<void> {
    return this.deliveriesService.remove(id, companyId);
  }
}
