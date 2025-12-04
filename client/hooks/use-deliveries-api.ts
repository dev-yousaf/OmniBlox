"use client";

import { useAuthenticatedApi } from "./use-authenticated-api";

export type DeliveryStatus =
  | "PENDING"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "CANCELLED";

export interface Delivery {
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

export interface DispatchDeliveryDto {
  trackingNumber?: string;
}

export interface UpdateDeliveryDto {
  trackingNumber?: string;
  deliveryAddress?: string;
  status?: DeliveryStatus;
}

export function useDeliveriesApi() {
  const { get, patch, put, delete: del } = useAuthenticatedApi();

  return {
    list: async (): Promise<Delivery[]> => {
      const res = (await get("/deliveries")) as Delivery[];
      return Array.isArray(res) ? res : [];
    },

    getDelivery: async (id: string): Promise<Delivery> => {
      return (await get(`/deliveries/${id}`)) as Delivery;
    },

    dispatch: async (
      id: string,
      data?: DispatchDeliveryDto
    ): Promise<Delivery> => {
      return (await patch(
        `/deliveries/${id}/dispatch`,
        data || {}
      )) as Delivery;
    },

    complete: async (id: string): Promise<Delivery> => {
      return (await patch(`/deliveries/${id}/complete`, {})) as Delivery;
    },

    updateDelivery: async (
      id: string,
      data: UpdateDeliveryDto
    ): Promise<Delivery> => {
      return (await put(`/deliveries/${id}`, data)) as Delivery;
    },

    deleteDelivery: async (id: string): Promise<void> => {
      await del(`/deliveries/${id}`);
    },
  };
}
