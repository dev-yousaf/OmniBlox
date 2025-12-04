export class CustomerResponseDto {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

export class CustomersListResponseDto {
  customers: CustomerResponseDto[];
  total: number;
  pages: number;
}
