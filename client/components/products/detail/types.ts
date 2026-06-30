import type { Product, StockLedgerEntry } from "@/lib/types";
import type { InventoryItem } from "@/hooks/use-inventory-api";

export interface ProductSale {
	id: string;
	saleId: string;
	invoiceNumber: string;
	saleDate: string;
	customerId: string;
	customerName: string;
	quantity: number;
	unitPrice: number;
	totalPrice: number;
}

export interface ProductQuotation {
	id: string;
	quotationId: string;
	referenceNumber: string;
	quoteDate: string;
	customerId: string;
	customerName: string;
	quantity: number;
	unitPrice: number;
	totalPrice: number;
}

export interface ProductPurchase {
	id: string;
	purchaseOrderId: string;
	referenceNumber: string;
	orderDate: string;
	supplierId: string;
	supplierName: string;
	quantity: number;
	unitCost: number;
	totalCost: number;
}

export interface ProductTransfer {
	id: string;
	date: string;
	reference: string;
	warehouse: string;
	quantity: number;
	notes: string | null;
	createdBy: string | null;
}

export interface ProductAdjustment {
	id: string;
	date: string;
	reference: string;
	warehouse: string;
	type: "ADDITION" | "REMOVAL";
	previousQuantity: number;
	newQuantity: number;
	quantity: number;
	notes: string | null;
	createdBy: string | null;
}

export interface DetailsTabProps {
	product: Product;
	inventory: InventoryItem[];
	inventoryLoading: boolean;
	variants: Product[];
	ledger: StockLedgerEntry[];
	canManage: boolean;
	showVariantForm: boolean;
	setShowVariantForm: (v: boolean) => void;
	variantSku: string;
	setVariantSku: (v: string) => void;
	variantName: string;
	setVariantName: (v: string) => void;
	variantSalePrice: string;
	setVariantSalePrice: (v: string) => void;
	variantCostPrice: string;
	setVariantCostPrice: (v: string) => void;
	variantStock: string;
	setVariantStock: (v: string) => void;
	savingVariant: boolean;
	handleSaveVariant: () => void;
	productId: string;
}

export interface ChartsTabProps {
	product: Product;
	ledger: StockLedgerEntry[];
	totalSalesAmount: number;
	totalPurchasesAmount: number;
}

export interface SalesTabProps {
	sales: ProductSale[];
	salesLoading: boolean;
	salesError: string | null;
}

export interface QuotationsTabProps {
	quotations: ProductQuotation[];
	quotationsLoading: boolean;
	quotationsError: string | null;
}

export interface PurchaseTabProps {
	purchases: ProductPurchase[];
	purchasesLoading: boolean;
	purchasesError: string | null;
}

export interface TransferTabProps {
	transfers: ProductTransfer[];
	transfersLoading: boolean;
	transfersError: string | null;
}

export interface AdjustmentTabProps {
	canManage: boolean;
	adjDate: string;
	setAdjDate: (v: string) => void;
	adjReference: string;
	setAdjReference: (v: string) => void;
	adjWarehouseId: string;
	setAdjWarehouseId: (v: string) => void;
	adjType: "ADDITION" | "REMOVAL";
	setAdjType: (v: "ADDITION" | "REMOVAL") => void;
	adjQuantity: string;
	setAdjQuantity: (v: string) => void;
	adjNote: string;
	setAdjNote: (v: string) => void;
	adjDocument: File | null;
	setAdjDocument: (v: File | null) => void;
	savingAdj: boolean;
	fileInputRef: React.RefObject<HTMLInputElement | null>;
	warehouses: { id: string; name: string; location?: string | null }[];
	warehousesLoading: boolean;
	user: { name?: string | null } | null;
	handleSaveAdjustment: () => void;
	productId: string;
	adjustments: ProductAdjustment[];
	adjustmentsLoading: boolean;
	adjustmentsError: string | null;
}
