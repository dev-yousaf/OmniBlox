import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { WarrantiesService } from './warranties.service';
import { CreateWarrantyDto } from './dto/create-warranty.dto';
import { UpdateWarrantyDto } from './dto/update-warranty.dto';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CompanyId } from '../auth/decorators/company-id.decorator';
import { UserRole } from '@prisma/client';

@Controller('warranties')
@UseGuards(AuthGuard, RolesGuard)
export class WarrantiesController {
  constructor(private readonly warrantiesService: WarrantiesService) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  create(@Body() createDto: CreateWarrantyDto, @CompanyId() companyId: string) {
    return this.warrantiesService.create(createDto, companyId);
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER)
  findAll(@CompanyId() companyId: string) {
    return this.warrantiesService.findAll(companyId);
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER)
  findOne(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.warrantiesService.findOne(id, companyId);
  }

  @Put(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateWarrantyDto,
    @CompanyId() companyId: string,
  ) {
    return this.warrantiesService.update(id, updateDto, companyId);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  remove(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.warrantiesService.remove(id, companyId);
  }

  @Post('bulk-delete')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  bulkDelete(@Body() body: { ids: string[] }, @CompanyId() companyId: string) {
    return this.warrantiesService.bulkDelete(body.ids, companyId);
  }
}
