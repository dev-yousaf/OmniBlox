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
import { UnitsService } from './units.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CompanyId } from '../auth/decorators/company-id.decorator';
import { UserRole } from '@prisma/client';

@Controller('units')
@UseGuards(AuthGuard, RolesGuard)
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  create(
    @Body() createDto: CreateUnitDto,
    @CompanyId() companyId: string,
  ) {
    return this.unitsService.create(createDto, companyId);
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER)
  findAll(@CompanyId() companyId: string) {
    return this.unitsService.findAll(companyId);
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER)
  findOne(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.unitsService.findOne(id, companyId);
  }

  @Put(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateUnitDto,
    @CompanyId() companyId: string,
  ) {
    return this.unitsService.update(id, updateDto, companyId);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  remove(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.unitsService.remove(id, companyId);
  }

  @Post('bulk-delete')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  bulkDelete(@Body() body: { ids: string[] }, @CompanyId() companyId: string) {
    return this.unitsService.bulkDelete(body.ids, companyId);
  }
}
