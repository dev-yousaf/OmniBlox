import { Controller, Get, UseGuards } from '@nestjs/common';
import { SuperadminService } from './superadmin.service';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { SuperadminGuard } from './guards/superadmin.guard';

@Controller('superadmin')
@UseGuards(AuthGuard, SuperadminGuard)
export class SuperadminController {
  constructor(private readonly superadminService: SuperadminService) {}

  @Get('dashboard')
  async getDashboard() {
    return this.superadminService.getDashboard();
  }
}
