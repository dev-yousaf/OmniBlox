import { DeliveryStatus } from '@prisma/client';

export class DeliveryResponseDto {
  id: string;
  status: DeliveryStatus;
  trackingNumber: string | null;
  deliveryAddress: string;
  dispatchDate: string | null;
  deliveredDate: string | null;
  createdAt: string;
  updatedAt: string;
  sale: {
    id: string;
    invoiceNumber: string;
    totalAmount: string;
    saleDate: string;
    customer: {
      id: string;
      name: string;
      email: string | null;
    };
    items: Array<{
      id: string;
      quantity: number;
      unitPrice: string;
      product: {
        id: string;
        name: string;
        sku: string | null;
      };
    }>;
  };
}
