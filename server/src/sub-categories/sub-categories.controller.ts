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
} from '@nestjs/common';
import { SubCategoriesService } from './sub-categories.service';
import { CreateSubCategoryDto } from './dto/create-sub-category.dto';
import { UpdateSubCategoryDto } from './dto/update-sub-category.dto';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CompanyId } from '../auth/decorators/company-id.decorator';
import { UserRole } from '@prisma/client';

@Controller('sub-categories')
@UseGuards(AuthGuard, RolesGuard)
export class SubCategoriesController {
  constructor(private readonly subCategoriesService: SubCategoriesService) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  create(
    @Body() createDto: CreateSubCategoryDto,
    @CompanyId() companyId: string,
  ) {
    return this.subCategoriesService.create(createDto, companyId);
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER)
  findAll(
    @CompanyId() companyId: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.subCategoriesService.findAll(companyId, categoryId);
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER)
  findOne(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.subCategoriesService.findOne(id, companyId);
  }

  @Put(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateSubCategoryDto,
    @CompanyId() companyId: string,
  ) {
    return this.subCategoriesService.update(id, updateDto, companyId);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  remove(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.subCategoriesService.remove(id, companyId);
  }

  @Post('bulk-delete')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  bulkDelete(@Body() body: { ids: string[] }, @CompanyId() companyId: string) {
    return this.subCategoriesService.bulkDelete(body.ids, companyId);
  }
}
