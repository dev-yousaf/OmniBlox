import { Module } from '@nestjs/common';
import { BillersController } from './billers.controller';
import { BillersService } from './billers.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BillersController],
  providers: [BillersService],
  exports: [BillersService],
})
export class BillersModule {}
