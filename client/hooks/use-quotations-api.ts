import { useAuthenticatedApi } from "./use-authenticated-api";
import { useCallback } from "react";

export interface QuotationItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number | string;
  product: {
    id: string;
    name: string;
    sku: string;
  };
}

export interface Quotation {
  id: string;
  referenceNumber: string;
  totalAmount: number | string;
  taxAmount: number | string;
  discount: number | string;
  status: "DRAFT" | "PENDING" | "COMPLETED" | "CANCELLED";
  quoteDate: string;
  expiryDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  customerId: string;
  customer: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
  };
  user: {
    id: string;
    name: string;
    email: string;
  };
  items: QuotationItem[];
}

// Alias for backward compatibility and clarity
export type QuotationWithDetails = Quotation;

export interface CreateQuotationDto {
  customerId: string;
  quoteDate: string;
  expiryDate?: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
  notes?: string;
}

export interface UpdateQuotationDto extends Partial<CreateQuotationDto> {}

export interface UpdateQuotationStatusDto {
  status: "PENDING" | "COMPLETED" | "CANCELLED";
}

export function useQuotationsApi() {
  const { get, post, put, patch, delete: del } = useAuthenticatedApi();

  const getQuotations = useCallback(async (): Promise<Quotation[]> => {
    return get("/quotations") as Promise<Quotation[]>;
  }, [get]);

  const getQuotation = useCallback(
    async (id: string): Promise<Quotation> => {
      return get(`/quotations/${id}`) as Promise<Quotation>;
    },
    [get]
  );

  const createQuotation = useCallback(
    async (data: CreateQuotationDto): Promise<Quotation> => {
      return post("/quotations", data) as Promise<Quotation>;
    },
    [post]
  );

  const updateQuotation = useCallback(
    async (id: string, data: UpdateQuotationDto): Promise<Quotation> => {
      return put(`/quotations/${id}`, data) as Promise<Quotation>;
    },
    [put]
  );

  const updateQuotationStatus = useCallback(
    async (id: string, data: UpdateQuotationStatusDto): Promise<Quotation> => {
      return patch(`/quotations/${id}/status`, data) as Promise<Quotation>;
    },
    [patch]
  );

  const deleteQuotation = useCallback(
    async (id: string): Promise<{ message: string }> => {
      return del(`/quotations/${id}`) as Promise<{ message: string }>;
    },
    [del]
  );

  const convertQuotationToSale = useCallback(
    async (id: string, warehouseId: string): Promise<any> => {
      return post(`/quotations/${id}/convert-to-sale`, {
        warehouseId,
      }) as Promise<any>;
    },
    [post]
  );

  const getQuotationStockLevels = useCallback(
    async (id: string): Promise<any> => {
      return get(`/quotations/${id}/stock-levels`) as Promise<any>;
    },
    [get]
  );

  return {
    getQuotations,
    getQuotation,
    createQuotation,
    updateQuotation,
    updateQuotationStatus,
    deleteQuotation,
    convertQuotationToSale,
    getQuotationStockLevels,
  };
}
