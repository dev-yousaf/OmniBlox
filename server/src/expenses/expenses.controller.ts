import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CompanyId } from '../auth/decorators/company-id.decorator';
import { UserId } from '../auth/decorators/user-id.decorator';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { UpdateExpenseStatusDto } from './dto/update-expense-status.dto';

@Controller('expenses')
@UseGuards(AuthGuard, RolesGuard)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER)
  create(
    @Body() dto: CreateExpenseDto,
    @UserId() userId: string,
    @CompanyId() companyId: string,
  ) {
    return this.expensesService.create(dto, userId, companyId);
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER)
  findAll(
    @CompanyId() companyId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.expensesService.findAll(companyId, pageNum, limitNum, search);
  }

  @Get('stats')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER)
  getStats(@CompanyId() companyId: string) {
    return this.expensesService.getStats(companyId);
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER)
  findOne(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.expensesService.findOne(id, companyId);
  }

  @Put(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  update(
    @Param('id') id: string,
    @CompanyId() companyId: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.expensesService.update(id, companyId, dto);
  }

  @Patch(':id/status')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  updateStatus(
    @Param('id') id: string,
    @CompanyId() companyId: string,
    @Body() dto: UpdateExpenseStatusDto,
  ) {
    return this.expensesService.updateStatus(id, companyId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  remove(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.expensesService.remove(id, companyId);
  }

  @Post(':id/attachments')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER)
  @UseInterceptors(FileInterceptor('file'))
  async uploadAttachment(
    @Param('id') id: string,
    @CompanyId() companyId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.expensesService.uploadAttachment(id, companyId, file);
  }

  @Delete(':id/attachments/:attachmentId')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  async deleteAttachment(
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
    @CompanyId() companyId: string,
  ) {
    return this.expensesService.deleteAttachment(id, attachmentId, companyId);
  }
}
