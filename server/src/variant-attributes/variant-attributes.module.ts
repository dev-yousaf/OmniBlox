import { Module } from '@nestjs/common';
import { VariantAttributesController } from './variant-attributes.controller';
import { VariantAttributesService } from './variant-attributes.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [VariantAttributesController],
  providers: [VariantAttributesService],
  exports: [VariantAttributesService],
})
export class VariantAttributesModule {}
