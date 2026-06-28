export class SupplierResponseDto {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  creditLimit?: number;
  balance?: number;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

export class SuppliersListResponseDto {
  suppliers: SupplierResponseDto[];
  total: number;
  pages: number;
}
