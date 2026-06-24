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
import { VariantAttributesService } from './variant-attributes.service';
import { CreateVariantAttributeDto } from './dto/create-variant-attribute.dto';
import { UpdateVariantAttributeDto } from './dto/update-variant-attribute.dto';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CompanyId } from '../auth/decorators/company-id.decorator';
import { UserRole } from '@prisma/client';

@Controller('variant-attributes')
@UseGuards(AuthGuard, RolesGuard)
export class VariantAttributesController {
  constructor(
    private readonly variantAttributesService: VariantAttributesService,
  ) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  create(
    @Body() createDto: CreateVariantAttributeDto,
    @CompanyId() companyId: string,
  ) {
    return this.variantAttributesService.create(createDto, companyId);
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER)
  findAll(@CompanyId() companyId: string) {
    return this.variantAttributesService.findAll(companyId);
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER)
  findOne(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.variantAttributesService.findOne(id, companyId);
  }

  @Put(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateVariantAttributeDto,
    @CompanyId() companyId: string,
  ) {
    return this.variantAttributesService.update(id, updateDto, companyId);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  remove(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.variantAttributesService.remove(id, companyId);
  }

  @Post('bulk-delete')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  bulkDelete(@Body() body: { ids: string[] }, @CompanyId() companyId: string) {
    return this.variantAttributesService.bulkDelete(body.ids, companyId);
  }
}
