"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WorkspaceLink as Link } from "@/components/workspace-link";
import {
	Edit,
	Trash2,
	FileText,
	FileSpreadsheet,
	RefreshCw,
	Minus,
} from "lucide-react";
import {
	Tooltip as UITooltip,
	TooltipTrigger,
	TooltipContent,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PageLoadingSkeleton } from "@/components/ui/page-loading-skeleton";
import { useProductApi } from "@/hooks/use-product-api";
import { useInventoryApi } from "@/hooks/use-inventory-api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { useWorkspace } from "@/hooks/use-workspace";
import { useWarehouses } from "@/hooks/use-warehouses";
import type { Product, StockLedgerEntry } from "@/lib/types";
import type { InventoryItem } from "@/hooks/use-inventory-api";
import {
	type ProductSale,
	type ProductQuotation,
	type ProductPurchase,
	type ProductTransfer,
} from "@/components/products/detail/types";
import { DetailsTab } from "@/components/products/detail/details-tab";
import { ChartsTab } from "@/components/products/detail/charts-tab";
import { SalesTab } from "@/components/products/detail/sales-tab";
import { QuotationsTab } from "@/components/products/detail/quotations-tab";
import { PurchaseTab } from "@/components/products/detail/purchase-tab";
import { TransferTab } from "@/components/products/detail/transfer-tab";

const TABS = [
	{ id: "details", label: "Details" },
	{ id: "charts", label: "Charts" },
	{ id: "sales", label: "Sales" },
	{ id: "quotations", label: "Quotations" },
	{ id: "purchase", label: "Purchase" },
	{ id: "transfer", label: "Transfer" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function ProductDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id: productId } = use(params);
	const [activeTab, setActiveTab] = useState<TabId>("details");
	const [product, setProduct] = useState<Product | null>(null);
	const [inventory, setInventory] = useState<InventoryItem[]>([]);
	const [ledger, setLedger] = useState<StockLedgerEntry[]>([]);
	const [loading, setLoading] = useState(true);
	const [inventoryLoading, setInventoryLoading] = useState(false);
	const {
		getProduct,
		deleteProduct,
		getStockLedger,
		getProductSales,
		getProductQuotations,
		getProductPurchases,
		getProductTransfers,
	} = useProductApi();
	const { getProductInventory } = useInventoryApi();
	const { toast } = useToast();
	const router = useRouter();
  const ws = useWorkspace();
	const { user } = useAuth();
	const { warehouses } = useWarehouses();
	const canManage =
		user?.role === "OWNER" ||
		user?.role === "ADMIN" ||
		user?.role === "MANAGER";

	const [parentProduct, setParentProduct] = useState<Product | null>(null);

	const [sales, setSales] = useState<ProductSale[]>([]);
	const [salesLoading, setSalesLoading] = useState(false);
	const [salesError, setSalesError] = useState<string | null>(null);

	const [quotations, setQuotations] = useState<ProductQuotation[]>([]);
	const [quotationsLoading, setQuotationsLoading] = useState(false);
	const [quotationsError, setQuotationsError] = useState<string | null>(null);

	const [purchases, setPurchases] = useState<ProductPurchase[]>([]);
	const [purchasesLoading, setPurchasesLoading] = useState(false);
	const [purchasesError, setPurchasesError] = useState<string | null>(null);

	const [transfers, setTransfers] = useState<ProductTransfer[]>([]);
	const [transfersLoading, setTransfersLoading] = useState(false);
	const [transfersError, setTransfersError] = useState<string | null>(null);

	useEffect(() => {
		if (productId) loadProduct();
	}, [productId]);

	useEffect(() => {
		if (product?.parentId) {
			getProduct(product.parentId)
				.then((parent) => setParentProduct(parent))
				.catch(() => setParentProduct(null));
		} else {
			setParentProduct(null);
		}
	}, [product?.parentId, getProduct]);

	// Load all per-product activity up front so every tab (and the Charts
	// summaries) shows real data the moment it is opened.
	useEffect(() => {
		if (!product) return;
		loadSales();
		loadQuotations();
		loadPurchases();
		loadTransfers();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [product]);

	const loadProduct = async () => {
		try {
			setLoading(true);
			const productData = await getProduct(productId);
			setProduct(productData);
			setInventoryLoading(true);
			const results = await Promise.allSettled([
				getProductInventory(productId),
				getStockLedger(productId),
			]);
			if (results[0].status === "fulfilled") setInventory(results[0].value);
			if (results[1].status === "fulfilled") setLedger(results[1].value);
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to load product details",
				variant: "destructive",
			});
			router.push(`/${ws}/products`);
		} finally {
			setLoading(false);
			setInventoryLoading(false);
		}
	};

	const loadSales = async () => {
		if (!productId) return;
		try {
			setSalesLoading(true);
			setSalesError(null);
			const data = (await getProductSales(productId)) as ProductSale[];
			setSales(data);
		} catch (error) {
			setSalesError("Failed to load sales data");
			setSales([]);
		} finally {
			setSalesLoading(false);
		}
	};

	const loadQuotations = async () => {
		if (!productId) return;
		try {
			setQuotationsLoading(true);
			setQuotationsError(null);
			const data = (await getProductQuotations(
				productId
			)) as ProductQuotation[];
			setQuotations(data);
		} catch (error) {
			setQuotationsError("Failed to load quotations data");
			setQuotations([]);
		} finally {
			setQuotationsLoading(false);
		}
	};

	const loadPurchases = async () => {
		if (!productId) return;
		try {
			setPurchasesLoading(true);
			setPurchasesError(null);
			const data = (await getProductPurchases(
				productId
			)) as ProductPurchase[];
			setPurchases(data);
		} catch (error) {
			setPurchasesError("Failed to load purchase data");
			setPurchases([]);
		} finally {
			setPurchasesLoading(false);
		}
	};

	const loadTransfers = async () => {
		if (!productId) return;
		try {
			setTransfersLoading(true);
			setTransfersError(null);
			const data = (await getProductTransfers(
				productId
			)) as ProductTransfer[];
			setTransfers(data);
		} catch (error) {
			setTransfersError("Failed to load transfer data");
			setTransfers([]);
		} finally {
			setTransfersLoading(false);
		}
	};

	const handleDelete = async () => {
		if (!product) return;
		if (confirm("Are you sure you want to delete this product?")) {
			try {
				await deleteProduct(product.id);
				toast({
					title: "Success",
					description: "Product deleted successfully",
				});
				router.push(`/${ws}/products`);
			} catch (error) {
				toast({
					title: "Error",
					description: "Failed to delete product",
					variant: "destructive",
				});
			}
		}
	};

	const totalSalesAmount = sales.reduce((sum, s) => sum + s.totalPrice, 0);
	const totalPurchasesAmount = purchases.reduce((sum, p) => sum + p.totalCost, 0);

	if (loading) return <PageLoadingSkeleton />;

	if (!product) {
		return (
			<div className="p-6 space-y-6">
				<div className="text-center py-8">Product not found</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
						<Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
						<span>/</span>
						<Link href="/products" className="hover:text-foreground transition-colors">Products</Link>
						<span>/</span>
						<span className="text-foreground font-medium">{product.name}</span>
					</div>
					<h1 className="text-2xl font-semibold tracking-tight">
						{product.name}
					</h1>
					{parentProduct && (
						<p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
							This is a variant of{" "}
							<Link
								href={`/products/${parentProduct.id}`}
								className="text-primary hover:underline font-medium"
							>
								{parentProduct.name}
							</Link>
						</p>
					)}
					<p className="text-xs text-muted-foreground">
						SKU: {product.sku}
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-3">
					<div className="flex items-center gap-[1px]">
						<UITooltip>
							<TooltipTrigger asChild>
								<button className="flex items-center justify-center w-5 h-5 text-red-500 hover:text-red-600">
									<FileText className="w-full h-full" />
								</button>
							</TooltipTrigger>
							<TooltipContent side="bottom">Export PDF</TooltipContent>
						</UITooltip>
						<UITooltip>
							<TooltipTrigger asChild>
								<button className="flex items-center justify-center w-5 h-5 text-green-600 hover:text-green-700">
									<FileSpreadsheet className="w-full h-full" />
								</button>
							</TooltipTrigger>
							<TooltipContent side="bottom">Export Excel</TooltipContent>
						</UITooltip>
					</div>
					<div className="flex items-center gap-[1px]">
						<button
							className="flex items-center justify-center w-4 h-4 text-muted-foreground hover:text-foreground"
							title="Refresh"
						>
							<RefreshCw className="w-full h-full" />
						</button>
						<button
							className="flex items-center justify-center w-4 h-4 text-muted-foreground hover:text-foreground"
							title="Collapse"
						>
							<Minus className="w-full h-full" />
						</button>
					</div>
					{canManage && (
						<div className="flex items-center gap-2">
							<Link href={`/products/${productId}/edit`}>
								<Button
									variant="outline"
									size="sm"
									className="gap-1.5 h-[31px] text-[13px]"
								>
									<Edit className="h-3.5 w-3.5" />
									Edit
								</Button>
							</Link>
							<AlertDialog>
								<AlertDialogTrigger asChild>
									<Button
										variant="destructive"
										size="sm"
										className="gap-1.5 h-[31px] text-[13px]"
									>
										<Trash2 className="h-3.5 w-3.5" />
										Delete
									</Button>
								</AlertDialogTrigger>
								<AlertDialogContent>
									<AlertDialogHeader>
										<AlertDialogTitle>
											Are you absolutely sure?
										</AlertDialogTitle>
										<AlertDialogDescription>
											This action cannot be undone. This will permanently
											delete the product "{product.name}" and remove all
											associated data from our servers.
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogCancel>Cancel</AlertDialogCancel>
										<AlertDialogAction
											onClick={handleDelete}
											className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
										>
											Delete Product
										</AlertDialogAction>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>
						</div>
					)}
				</div>
			</div>

			<div role="tablist" className="flex border-b overflow-x-auto">
				{TABS.map((tab) => (
					<button
						key={tab.id}
						role="tab"
						aria-selected={activeTab === tab.id}
						aria-controls={`panel-${tab.id}`}
						onClick={() => setActiveTab(tab.id)}
						className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
							activeTab === tab.id
								? "border-primary text-primary"
								: "border-transparent text-muted-foreground hover:text-foreground"
						}`}
					>
						{tab.label}
					</button>
				))}
			</div>

			{activeTab === "details" && (
				<DetailsTab
					product={product}
					inventory={inventory}
					inventoryLoading={inventoryLoading}
					ledger={ledger}
					canManage={canManage}
					warehouses={warehouses}
				/>
			)}

			{activeTab === "charts" && (
				<ChartsTab
					product={product}
					ledger={ledger}
					totalSalesAmount={totalSalesAmount}
					totalPurchasesAmount={totalPurchasesAmount}
				/>
			)}

			{activeTab === "sales" && (
				<SalesTab
					sales={sales}
					salesLoading={salesLoading}
					salesError={salesError}
				/>
			)}

			{activeTab === "quotations" && (
				<QuotationsTab
					quotations={quotations}
					quotationsLoading={quotationsLoading}
					quotationsError={quotationsError}
				/>
			)}

			{activeTab === "purchase" && (
				<PurchaseTab
					purchases={purchases}
					purchasesLoading={purchasesLoading}
					purchasesError={purchasesError}
				/>
			)}

			{activeTab === "transfer" && (
				<TransferTab
					transfers={transfers}
					transfersLoading={transfersLoading}
					transfersError={transfersError}
				/>
			)}
		</div>
	);
}
