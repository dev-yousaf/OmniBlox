import { ProductStatus, ProductType } from '@prisma/client';

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
  type: ProductType;
  hasVariants: boolean;
  attributes?: Record<string, string> | null;
  parentId?: string | null;
  variants?: ProductResponseDto[];
  createdAt: Date;
  updatedAt: Date;
}
