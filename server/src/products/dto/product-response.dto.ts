import { ProductStatus } from '@prisma/client';

class ComboItemResponseDto {
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
}

export class ProductResponseDto {
  id: string;
  name: string;
  sku: string;
  description?: string;
  category: string;
  subCategory?: string | null;
  brand?: string;
  unit: string;
  imageUrl?: string | null;
  barcodeSymbology: string;
  itemCode?: string | null;
  manufacturer?: string | null;
  warranty?: string | null;
  manufacturedDate?: string | null;
  expiryDate?: string | null;
  taxRate: number;
  alertQuantity: number;
  salePrice: number;
  costPrice: number;
  stock: number;
  reorderLevel: number;
  status: ProductStatus;
  type: 'STANDARD' | 'DIGITAL' | 'SERVICE' | 'COMBO';
  hasVariants: boolean;
  attributes?: Record<string, string> | null;
  parentId?: string | null;
  variants?: ProductResponseDto[];
  comboItems?: ComboItemResponseDto[];
  createdBy?: { id: string; name: string; image?: string | null } | null;
  createdAt: Date;
  updatedAt: Date;
}
