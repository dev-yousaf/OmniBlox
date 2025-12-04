export class WarehouseResponseDto {
  id: string;
  name: string;
  location: string;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

export class WarehousesListResponseDto {
  warehouses: WarehouseResponseDto[];
  total: number;
  pages: number;
}
