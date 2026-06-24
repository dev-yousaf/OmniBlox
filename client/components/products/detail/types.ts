import type { Product, StockLedgerEntry } from "@/lib/types";
import type { InventoryItem } from "@/hooks/use-inventory-api";

export interface ProductSale {
	id: string;
	date: string;
	reference: string;
	customer: string;
	quantity: number;
	unitPrice: number;
	total: number;
}

export interface ProductQuotation {
	id: string;
	date: string;
	reference: string;
	customer: string;
	quantity: number;
	unitPrice: number;
	total: number;
	status: string;
}

export interface ProductPurchase {
	id: string;
	date: string;
	reference: string;
	supplier: string;
	quantity: number;
	unitPrice: number;
	total: number;
	status: string;
}

export interface ProductTransfer {
	date: string;
	reference: string;
	from: string;
	to: string;
	quantity: number;
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
	stockMovementData: { date: string; additions: number; removals: number }[];
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
	warehouses: { id: string; name: string; location?: string }[];
	warehousesLoading: boolean;
	user: { name?: string } | null;
	handleSaveAdjustment: () => void;
	productId: string;
	recentAdjustments: StockLedgerEntry[];
}
