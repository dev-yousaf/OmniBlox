import { ProductStatus } from '@prisma/client';

export class ProductResponseDto {
  id: string;
  name: string;
  sku: string;
  description?: string;
  category: string;
  brand?: string;
  salePrice: number;
  costPrice: number;
  stock: number;
  reorderLevel: number;
  status: ProductStatus;
  createdAt: Date;
  updatedAt: Date;
}
