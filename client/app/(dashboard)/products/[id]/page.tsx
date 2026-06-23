"use client";

import { use, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { PageLoadingSkeleton } from "@/components/ui/page-loading-skeleton";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	ArrowLeft,
	Edit,
	Trash2,
	Loader2,
	Upload,
} from "lucide-react";
import Link from "next/link";
import { useProductApi } from "@/hooks/use-product-api";
import { useInventoryApi, type InventoryItem } from "@/hooks/use-inventory-api";
import { useToast } from "@/hooks/use-toast";
import type { Product, StockLedgerEntry, ComboItem } from "@/lib/types";
import { useAuth } from "@/contexts/auth-context";
import {
	Bar,
	BarChart,
	CartesianGrid,
	XAxis,
	YAxis,
	ResponsiveContainer,
	Tooltip,
	Legend,
} from "recharts";
import { useWarehouses } from "@/hooks/use-warehouses";

const TABS = [
	{ id: "details", label: "Details" },
	{ id: "charts", label: "Charts" },
	{ id: "sales", label: "Sales" },
	{ id: "quotations", label: "Quotations" },
	{ id: "purchase", label: "Purchase" },
	{ id: "transfer", label: "Transfer" },
	{ id: "adjustment", label: "Quantity Adjustment" },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface ProductSale {
	id: string;
	date: string;
	reference: string;
	customer: string;
	quantity: number;
	unitPrice: number;
	total: number;
}

interface ProductQuotation {
	id: string;
	date: string;
	reference: string;
	customer: string;
	quantity: number;
	unitPrice: number;
	total: number;
	status: string;
}

interface ProductPurchase {
	id: string;
	date: string;
	reference: string;
	supplier: string;
	quantity: number;
	unitPrice: number;
	total: number;
	status: string;
}

interface ProductTransfer {
	date: string;
	reference: string;
	from: string;
	to: string;
	quantity: number;
}

export default function ProductDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id: productId } = use(params);
	const [activeTab, setActiveTab] = useState<TabId>("details");
	const [product, setProduct] = useState<Product | null>(null);
	const [inventory, setInventory] = useState<InventoryItem[]>([]);
	const [variants, setVariants] = useState<Product[]>([]);
	const [ledger, setLedger] = useState<StockLedgerEntry[]>([]);
	const [loading, setLoading] = useState(true);
	const [inventoryLoading, setInventoryLoading] = useState(false);
	const {
		getProduct,
		deleteProduct,
		getStockLedger,
		getVariants,
		createProduct,
		getProductSales,
		getProductQuotations,
		getProductPurchases,
		adjustStock,
	} = useProductApi();
	const { getProductInventory } = useInventoryApi();
	const { toast } = useToast();
	const router = useRouter();
	const { user } = useAuth();
	const { warehouses, loading: warehousesLoading } = useWarehouses();
	const canManage =
		user?.role === "OWNER" ||
		user?.role === "ADMIN" ||
		user?.role === "MANAGER";

	const [showVariantForm, setShowVariantForm] = useState(false);
	const [variantSku, setVariantSku] = useState("");
	const [variantName, setVariantName] = useState("");
	const [variantSalePrice, setVariantSalePrice] = useState("");
	const [variantCostPrice, setVariantCostPrice] = useState("");
	const [variantStock, setVariantStock] = useState("");
	const [savingVariant, setSavingVariant] = useState(false);

	const [sales, setSales] = useState<ProductSale[]>([]);
	const [salesLoading, setSalesLoading] = useState(false);
	const [salesError, setSalesError] = useState<string | null>(null);
	const salesLoadedRef = useRef(false);

	const [quotations, setQuotations] = useState<ProductQuotation[]>([]);
	const [quotationsLoading, setQuotationsLoading] = useState(false);
	const [quotationsError, setQuotationsError] = useState<string | null>(null);
	const quotationsLoadedRef = useRef(false);

	const [purchases, setPurchases] = useState<ProductPurchase[]>([]);
	const [purchasesLoading, setPurchasesLoading] = useState(false);
	const [purchasesError, setPurchasesError] = useState<string | null>(null);
	const purchasesLoadedRef = useRef(false);

	const [adjDate, setAdjDate] = useState(
		new Date().toISOString().split("T")[0]
	);
	const [adjReference, setAdjReference] = useState("");
	const [adjWarehouseId, setAdjWarehouseId] = useState("");
	const [adjType, setAdjType] = useState<"ADDITION" | "REMOVAL">("ADDITION");
	const [adjQuantity, setAdjQuantity] = useState("");
	const [adjNote, setAdjNote] = useState("");
	const [adjDocument, setAdjDocument] = useState<File | null>(null);
	const [savingAdj, setSavingAdj] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (productId) {
			loadProduct();
		}
	}, [productId]);

	useEffect(() => {
		if (activeTab === "sales" && !salesLoadedRef.current) {
			salesLoadedRef.current = true;
			loadSales();
		}
	}, [activeTab]);

	useEffect(() => {
		if (activeTab === "quotations" && !quotationsLoadedRef.current) {
			quotationsLoadedRef.current = true;
			loadQuotations();
		}
	}, [activeTab]);

	useEffect(() => {
		if (activeTab === "purchase" && !purchasesLoadedRef.current) {
			purchasesLoadedRef.current = true;
			loadPurchases();
		}
	}, [activeTab]);

	useEffect(() => {
		if (warehouses.length > 0 && !adjWarehouseId) {
			setAdjWarehouseId(warehouses[0].id);
		}
	}, [warehouses, adjWarehouseId]);

	const loadProduct = async () => {
		try {
			setLoading(true);
			const productData = await getProduct(productId);
			setProduct(productData);

			setInventoryLoading(true);
			// Load supplementary data - don't redirect on failure
			const results = await Promise.allSettled([
				getProductInventory(productId),
				getVariants(productId),
				getStockLedger(productId),
			]);
			if (results[0].status === "fulfilled") setInventory(results[0].value);
			if (results[1].status === "fulfilled") setVariants(results[1].value);
			if (results[2].status === "fulfilled") setLedger(results[2].value);
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to load product details",
				variant: "destructive",
			});
			router.push("/products");
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

	const handleDelete = async () => {
		if (!product) return;

		if (confirm("Are you sure you want to delete this product?")) {
			try {
				await deleteProduct(product.id);
				toast({
					title: "Success",
					description: "Product deleted successfully",
				});
				router.push("/products");
			} catch (error) {
				toast({
					title: "Error",
					description: "Failed to delete product",
					variant: "destructive",
				});
			}
		}
	};

	const handleSaveVariant = async () => {
		if (!product) return;
		try {
			setSavingVariant(true);
			await createProduct({
				sku: variantSku,
				name: variantName,
				salePrice: parseFloat(variantSalePrice),
				costPrice: parseFloat(variantCostPrice),
				stock: parseInt(variantStock) || 0,
				parentId: product.id,
				category: product.category,
				status: "ACTIVE",
			});
			toast({ title: "Success", description: "Variant created successfully" });
			setShowVariantForm(false);
			setVariantSku("");
			setVariantName("");
			setVariantSalePrice("");
			setVariantCostPrice("");
			setVariantStock("");
			const variantsData = await getVariants(productId);
			setVariants(variantsData);
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to create variant",
				variant: "destructive",
			});
		} finally {
			setSavingVariant(false);
		}
	};

	const handleSaveAdjustment = async () => {
		if (!product || !adjWarehouseId || !adjQuantity) return;

		const quantityNum = parseInt(adjQuantity);
		if (isNaN(quantityNum) || quantityNum <= 0) {
			toast({
				title: "Error",
				description: "Please enter a valid quantity",
				variant: "destructive",
			});
			return;
		}

		try {
			setSavingAdj(true);
			const currentItem = inventory.find(
				(i) => i.warehouseId === adjWarehouseId
			);
			const previousQuantity = currentItem?.quantity ?? 0;
			const newQuantity =
				adjType === "ADDITION"
					? previousQuantity + quantityNum
					: previousQuantity - quantityNum;

			if (newQuantity < 0) {
				toast({
					title: "Error",
					description: "Resulting quantity cannot be negative",
					variant: "destructive",
				});
				setSavingAdj(false);
				return;
			}

			const reference =
				adjReference.trim() ||
				`ADJ-${Date.now()}`;

			await adjustStock({
				items: [
					{
						productId: product.id,
						warehouseId: adjWarehouseId,
						previousQuantity,
						newQuantity,
					},
				],
				notes: adjNote || undefined,
				type: adjType,
				documentUrl: adjDocument ? adjDocument.name : undefined,
			});

			toast({
				title: "Success",
				description: "Stock adjustment saved successfully",
			});

			setAdjQuantity("");
			setAdjNote("");
			setAdjReference("");
			setAdjDocument(null);

			const [inventoryData, ledgerData] = await Promise.all([
				getProductInventory(productId),
				getStockLedger(productId),
			]);
			setInventory(inventoryData);
			setLedger(ledgerData);
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to save adjustment",
				variant: "destructive",
			});
		} finally {
			setSavingAdj(false);
		}
	};

	const last30Days = Array.from({ length: 30 }, (_, i) => {
		const d = new Date();
		d.setDate(d.getDate() - (29 - i));
		d.setHours(0, 0, 0, 0);
		return d;
	});

	const stockMovementData = last30Days.map((day) => {
		const dateStr = day.toISOString().split("T")[0];
		const dayEntries = ledger.filter(
			(e) => new Date(e.createdAt).toISOString().split("T")[0] === dateStr
		);
		return {
			date: dateStr.slice(5),
			additions: dayEntries
				.filter((e) => e.quantity > 0)
				.reduce((sum, e) => sum + e.quantity, 0),
			removals: dayEntries
				.filter((e) => e.quantity < 0)
				.reduce((sum, e) => sum + Math.abs(e.quantity), 0),
		};
	});

	const totalSalesAmount = sales.reduce((sum, s) => sum + s.total, 0);
	const totalPurchasesAmount = purchases.reduce((sum, p) => sum + p.total, 0);

	const salesVsPurchasesData = [
		{
			name: "Sales",
			total: totalSalesAmount,
			fill: "#22c55e",
		},
		{
			name: "Purchases",
			total: totalPurchasesAmount,
			fill: "#3b82f6",
		},
	];

	const transfers: ProductTransfer[] = ledger
		.filter((e) => e.type === "TRANSFER")
		.map((e) => ({
			date: e.createdAt,
			reference: e.reference || "-",
			from: e.warehouse?.name || "-",
			to: e.warehouse?.name || "-",
			quantity: e.quantity,
		}));

	const recentAdjustments = ledger
		.filter((e) => e.type === "ADJUSTMENT")
		.slice(0, 10);

	if (loading) {
		return <PageLoadingSkeleton />;
	}

	if (!product) {
		return (
			<div className="p-6 space-y-6">
				<div className="text-center py-8">Product not found</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<Link href="/products">
						<Button variant="ghost" size="sm" className="gap-2">
							<ArrowLeft className="h-4 w-4" />
							Back to Products
						</Button>
					</Link>
					<div>
						<h1 className="text-3xl font-semibold tracking-tight">
							{product.name}
						</h1>
						<p className="text-sm text-muted-foreground">
							SKU: {product.sku}
						</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					{canManage && (
						<>
							<Link href={`/products/${productId}/edit`}>
								<Button variant="outline" className="gap-2">
									<Edit className="h-4 w-4" />
									Edit
								</Button>
							</Link>
							<AlertDialog>
								<AlertDialogTrigger asChild>
									<Button variant="destructive" className="gap-2">
										<Trash2 className="h-4 w-4" />
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
						</>
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
				<div
					role="tabpanel"
					id="panel-details"
					aria-labelledby="tab-details"
					className="space-y-6"
				>
					<div className="grid gap-6 lg:grid-cols-3">
						<div className="lg:col-span-2 space-y-6">
							<Card>
								<CardHeader>
									<CardTitle>Product Information</CardTitle>
								</CardHeader>
								<CardContent className="grid gap-4">
									{product.imageUrl && (
										<div className="flex justify-center mb-2">
											<img
												src={product.imageUrl}
												alt={product.name}
												className="rounded-lg max-w-[200px] object-cover"
											/>
										</div>
									)}

									<div className="grid grid-cols-2 gap-4">
										<div>
											<label className="text-sm font-medium text-muted-foreground">
												Name
											</label>
											<p className="text-sm font-medium">{product.name}</p>
										</div>
										<div>
											<label className="text-sm font-medium text-muted-foreground">
												SKU
											</label>
											<p className="text-sm font-mono">{product.sku}</p>
										</div>
									</div>

									<div className="grid grid-cols-2 gap-4">
										<div>
											<label className="text-sm font-medium text-muted-foreground">
												Category
											</label>
											<p className="text-sm">{product.category}</p>
										</div>
										<div>
											<label className="text-sm font-medium text-muted-foreground">
												Brand
											</label>
											<p className="text-sm">{product.brand || "—"}</p>
										</div>
									</div>

									<div className="grid grid-cols-2 gap-4">
										<div>
											<label className="text-sm font-medium text-muted-foreground">
												Unit
											</label>
											<p className="text-sm">{product.unit || "—"}</p>
										</div>
										<div />
									</div>

									{product.description && (
										<div>
											<label className="text-sm font-medium text-muted-foreground">
												Description
											</label>
											<p className="text-sm">{product.description}</p>
										</div>
									)}
								</CardContent>
							</Card>

							{product.type === "COMBO" &&
								product.comboItems &&
								product.comboItems.length > 0 && (
									<Card>
										<CardHeader>
											<CardTitle>Bundle Contents</CardTitle>
										</CardHeader>
										<CardContent>
											<Table>
												<TableHeader>
													<TableRow>
														<TableHead>SKU</TableHead>
														<TableHead>Product Name</TableHead>
														<TableHead>Quantity</TableHead>
													</TableRow>
												</TableHeader>
												<TableBody>
													{product.comboItems.map((item, index) => (
														<TableRow key={item.productId + "-" + index}>
															<TableCell className="font-mono text-xs">
																{item.productSku}
															</TableCell>
															<TableCell>{item.productName}</TableCell>
															<TableCell>{item.quantity}</TableCell>
														</TableRow>
													))}
												</TableBody>
											</Table>
										</CardContent>
									</Card>
								)}

							{product.hasVariants && canManage && (
								<Card>
									<CardHeader>
										<CardTitle>Create Variant</CardTitle>
									</CardHeader>
									<CardContent>
										{!showVariantForm ? (
											<Button onClick={() => setShowVariantForm(true)}>
												Add Variant
											</Button>
										) : (
											<div className="space-y-4">
												<div className="grid grid-cols-2 gap-4">
													<div>
														<label className="text-sm font-medium text-muted-foreground block mb-1">
															SKU
														</label>
														<input
															type="text"
															value={variantSku}
															onChange={(e) =>
																setVariantSku(e.target.value)
															}
															className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
														/>
													</div>
													<div>
														<label className="text-sm font-medium text-muted-foreground block mb-1">
															Name
														</label>
														<input
															type="text"
															value={variantName}
															onChange={(e) =>
																setVariantName(e.target.value)
															}
															className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
														/>
													</div>
												</div>
												<div className="grid grid-cols-3 gap-4">
													<div>
														<label className="text-sm font-medium text-muted-foreground block mb-1">
															Sale Price
														</label>
														<input
															type="number"
															value={variantSalePrice}
															onChange={(e) =>
																setVariantSalePrice(e.target.value)
															}
															className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
														/>
													</div>
													<div>
														<label className="text-sm font-medium text-muted-foreground block mb-1">
															Cost Price
														</label>
														<input
															type="number"
															value={variantCostPrice}
															onChange={(e) =>
																setVariantCostPrice(e.target.value)
															}
															className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
														/>
													</div>
													<div>
														<label className="text-sm font-medium text-muted-foreground block mb-1">
															Stock
														</label>
														<input
															type="number"
															value={variantStock}
															onChange={(e) =>
																setVariantStock(e.target.value)
															}
															className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
														/>
													</div>
												</div>
												<div className="flex items-center gap-2">
													<Button
														onClick={handleSaveVariant}
														disabled={savingVariant}
													>
														{savingVariant ? "Saving..." : "Save Variant"}
													</Button>
													<Button
														variant="outline"
														onClick={() => setShowVariantForm(false)}
													>
														Cancel
													</Button>
												</div>
											</div>
										)}
									</CardContent>
								</Card>
							)}
						</div>

						<div className="space-y-6">
							<Card>
								<CardHeader>
									<CardTitle>Pricing</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4">
									<div>
										<label className="text-sm font-medium text-muted-foreground">
											Sale Price
										</label>
										<p className="text-lg font-semibold">
											${product.salePrice.toFixed(2)}
										</p>
									</div>
									<div>
										<label className="text-sm font-medium text-muted-foreground">
											Cost Price
										</label>
										<p className="text-sm">
											${product.costPrice.toFixed(2)}
										</p>
									</div>
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle>Inventory</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4">
									<div>
										<label className="text-sm font-medium text-muted-foreground">
											Stock Level
										</label>
										<div className="flex items-center gap-2">
											<p className="text-lg font-semibold">
												{product.stock}
											</p>
											{product.stock <= product.reorderLevel && (
												<Badge variant="destructive">Low Stock</Badge>
											)}
										</div>
									</div>
									<div>
										<label className="text-sm font-medium text-muted-foreground">
											Reorder Level
										</label>
										<p className="text-sm">{product.reorderLevel}</p>
									</div>
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle>Warehouse Stock</CardTitle>
									<CardDescription>
										Stock levels across all warehouses
									</CardDescription>
								</CardHeader>
								<CardContent>
									{inventoryLoading ? (
										<div className="text-center py-4 text-sm text-muted-foreground">
											Loading warehouse stock...
										</div>
									) : inventory.length === 0 ? (
										<div className="text-center py-4 text-sm text-muted-foreground">
											No warehouse stock data available
										</div>
									) : (
										<div className="space-y-3">
											{inventory.map((item) => (
												<div
													key={`${item.productId}-${item.warehouseId}`}
													className="flex items-center justify-between p-3 border rounded-lg"
												>
													<div className="flex-1">
														<div className="flex items-center gap-2">
															<p className="font-medium text-sm">
																{item.warehouseName}
															</p>
														</div>
														<p className="text-xs text-muted-foreground">
															Stock: {item.quantity}
														</p>
													</div>
													<div className="flex items-center gap-2">
														{item.quantity === 0 && (
															<Badge variant="destructive" className="text-xs">
																Out of Stock
															</Badge>
														)}
														{item.quantity > 0 &&
															item.quantity <= item.reorderLevel && (
																<Badge variant="destructive" className="text-xs">
																	Low Stock
																</Badge>
															)}
														{item.quantity > item.reorderLevel && (
															<Badge variant="secondary" className="text-xs">
																In Stock
															</Badge>
														)}
													</div>
												</div>
											))}

											{inventory.some((item) => item.quantity === 0) && (
												<div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
													<div className="flex items-center gap-2">
														<div className="w-2 h-2 bg-red-500 rounded-full" />
														<p className="text-sm font-medium text-red-800">
															Out of Stock Alert
														</p>
													</div>
													<p className="text-xs text-red-700 mt-1">
														This product is out of stock in{" "}
														{
															inventory.filter((item) => item.quantity === 0)
																.length
														}{" "}
														warehouse(s)
													</p>
												</div>
											)}

											{inventory.some(
												(item) =>
													item.quantity > 0 &&
													item.quantity <= item.reorderLevel
											) && (
												<div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
													<div className="flex items-center gap-2">
														<div className="w-2 h-2 bg-yellow-500 rounded-full" />
														<p className="text-sm font-medium text-yellow-800">
															Low Stock Alert
														</p>
													</div>
													<p className="text-xs text-yellow-700 mt-1">
														This product is low on stock in{" "}
														{
															inventory.filter(
																(item) =>
																	item.quantity > 0 &&
																	item.quantity <= item.reorderLevel
															).length
														}{" "}
														warehouse(s)
													</p>
												</div>
											)}
										</div>
									)}
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle>Status & Type</CardTitle>
								</CardHeader>
								<CardContent className="space-y-3">
									<div>
										<label className="text-sm font-medium text-muted-foreground block mb-1">
											Status
										</label>
										<Badge
											variant={
												product.status === "ACTIVE"
													? "default"
													: product.status === "INACTIVE"
													? "secondary"
													: "destructive"
											}
											className="capitalize"
										>
											{product.status.toLowerCase()}
										</Badge>
									</div>
									<div>
										<label className="text-sm font-medium text-muted-foreground block mb-1">
											Type
										</label>
										<Badge
											variant="outline"
											className={
												product.type === "DIGITAL"
													? "bg-blue-50 text-blue-700"
													: product.type === "SERVICE"
													? "bg-green-50 text-green-700"
													: product.type === "COMBO"
													? "bg-purple-50 text-purple-700"
													: "bg-gray-50 text-gray-700"
											}
										>
											{product.type || "STANDARD"}
										</Badge>
									</div>
								</CardContent>
							</Card>
						</div>
					</div>

					{ledger.length > 0 && (
						<Card>
							<CardHeader>
								<CardTitle>Stock Ledger</CardTitle>
								<CardDescription>
									History of stock movements
								</CardDescription>
							</CardHeader>
							<CardContent>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Date</TableHead>
											<TableHead>Type</TableHead>
											<TableHead>Quantity</TableHead>
											<TableHead>Balance</TableHead>
											<TableHead>Reference</TableHead>
											<TableHead>Note</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{ledger.map((entry) => (
											<TableRow key={entry.id}>
												<TableCell>
													{new Date(
														entry.createdAt
													).toLocaleDateString()}
												</TableCell>
												<TableCell>
													<Badge variant="outline">{entry.type}</Badge>
												</TableCell>
												<TableCell
													className={
														entry.quantity > 0
															? "text-green-600"
															: "text-red-600"
													}
												>
													{entry.quantity > 0
														? `+${entry.quantity}`
														: entry.quantity}
												</TableCell>
												<TableCell>{entry.balance}</TableCell>
												<TableCell className="text-xs text-muted-foreground">
													{entry.reference || "-"}
												</TableCell>
												<TableCell className="text-xs text-muted-foreground">
													{entry.note || "-"}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</CardContent>
						</Card>
					)}

					{variants.length > 0 && (
						<Card>
							<CardHeader>
								<CardTitle>Variants</CardTitle>
								<CardDescription>
									Product variations ({variants.length})
								</CardDescription>
							</CardHeader>
							<CardContent>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>SKU</TableHead>
											<TableHead>Name</TableHead>
											<TableHead>Price</TableHead>
											<TableHead>Stock</TableHead>
											<TableHead>Status</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{variants.map((v) => (
											<TableRow key={v.id}>
												<TableCell className="font-mono text-xs">
													{v.sku}
												</TableCell>
												<TableCell>
													<Link
														href={`/products/${v.id}`}
														className="hover:underline font-medium"
													>
														{v.name}
													</Link>
												</TableCell>
												<TableCell>
													${v.salePrice.toFixed(2)}
												</TableCell>
												<TableCell>
													<span
														className={
															v.stock <= v.reorderLevel
																? "text-warning font-semibold"
																: ""
														}
													>
														{v.stock}
													</span>
												</TableCell>
												<TableCell>
													<Badge
														variant={
															v.status === "ACTIVE"
																? "default"
																: "secondary"
														}
													>
														{v.status}
													</Badge>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</CardContent>
						</Card>
					)}
				</div>
			)}

			{activeTab === "charts" && (
				<div
					role="tabpanel"
					id="panel-charts"
					aria-labelledby="tab-charts"
					className="space-y-6"
				>
					<div className="grid gap-4 md:grid-cols-3">
						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-sm font-medium text-muted-foreground">
									Current Stock
								</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-2xl font-bold">{product.stock}</p>
							</CardContent>
						</Card>
						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-sm font-medium text-muted-foreground">
									Total Sales
								</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-2xl font-bold text-green-600">
									${totalSalesAmount.toFixed(2)}
								</p>
							</CardContent>
						</Card>
						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-sm font-medium text-muted-foreground">
									Total Purchases
								</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-2xl font-bold text-blue-600">
									${totalPurchasesAmount.toFixed(2)}
								</p>
							</CardContent>
						</Card>
					</div>

					<Card>
						<CardHeader>
							<CardTitle>Stock Movements (Last 30 Days)</CardTitle>
							<CardDescription>
								Daily stock additions and removals
							</CardDescription>
						</CardHeader>
						<CardContent>
							{stockMovementData.length === 0 ? (
								<p className="text-sm text-muted-foreground text-center py-8">
									No stock movement data available
								</p>
							) : (
								<div className="h-[300px]">
									<ResponsiveContainer width="100%" height="100%">
										<BarChart data={stockMovementData}>
											<CartesianGrid
												strokeDasharray="3 3"
												className="stroke-muted"
											/>
											<XAxis
												dataKey="date"
												className="text-xs"
												tick={{ fontSize: 10 }}
											/>
											<YAxis className="text-xs" />
											<Tooltip />
											<Legend />
											<Bar
												dataKey="additions"
												name="Additions"
												fill="#22c55e"
												radius={[4, 4, 0, 0]}
											/>
											<Bar
												dataKey="removals"
												name="Removals"
												fill="#ef4444"
												radius={[4, 4, 0, 0]}
											/>
										</BarChart>
									</ResponsiveContainer>
								</div>
							)}
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Sales vs Purchases</CardTitle>
							<CardDescription>
								Comparison of total sales and purchase amounts
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="h-[300px]">
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={salesVsPurchasesData}>
										<CartesianGrid
											strokeDasharray="3 3"
											className="stroke-muted"
										/>
										<XAxis dataKey="name" className="text-xs" />
										<YAxis className="text-xs" />
										<Tooltip />
										<Legend />
										<Bar
											dataKey="total"
											name="Amount ($)"
											fill="#3b82f6"
											radius={[4, 4, 0, 0]}
										/>
									</BarChart>
								</ResponsiveContainer>
							</div>
						</CardContent>
					</Card>
				</div>
			)}

			{activeTab === "sales" && (
				<div
					role="tabpanel"
					id="panel-sales"
					aria-labelledby="tab-sales"
					className="space-y-6"
				>
					<Card>
						<CardHeader>
							<CardTitle>Sales History</CardTitle>
							<CardDescription>
								Sales transactions for this product
							</CardDescription>
						</CardHeader>
						<CardContent>
							{salesLoading ? (
								<div className="flex items-center justify-center py-8">
									<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
								</div>
							) : salesError ? (
								<p className="text-sm text-destructive text-center py-8">
									{salesError}
								</p>
							) : sales.length === 0 ? (
								<p className="text-sm text-muted-foreground text-center py-8">
									No sales data available for this product
								</p>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Date</TableHead>
											<TableHead>Reference</TableHead>
											<TableHead>Customer</TableHead>
											<TableHead>Quantity</TableHead>
											<TableHead>Unit Price</TableHead>
											<TableHead>Total</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{sales.map((sale: any) => (
											<TableRow key={sale.id}>
												<TableCell>
													{new Date(sale.saleDate ?? sale.date).toLocaleDateString()}
												</TableCell>
												<TableCell className="font-mono text-xs">
													{sale.invoiceNumber ?? sale.reference}
												</TableCell>
												<TableCell>{sale.customerName ?? sale.customer}</TableCell>
												<TableCell>{sale.quantity}</TableCell>
												<TableCell>
													${(sale.unitPrice ?? 0).toFixed(2)}
												</TableCell>
												<TableCell className="font-medium">
													${(sale.totalPrice ?? sale.total ?? 0).toFixed(2)}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							)}
						</CardContent>
					</Card>
				</div>
			)}

			{activeTab === "quotations" && (
				<div
					role="tabpanel"
					id="panel-quotations"
					aria-labelledby="tab-quotations"
					className="space-y-6"
				>
					<Card>
						<CardHeader>
							<CardTitle>Quotations</CardTitle>
							<CardDescription>
								Quotations containing this product
							</CardDescription>
						</CardHeader>
						<CardContent>
							{quotationsLoading ? (
								<div className="flex items-center justify-center py-8">
									<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
								</div>
							) : quotationsError ? (
								<p className="text-sm text-destructive text-center py-8">
									{quotationsError}
								</p>
							) : quotations.length === 0 ? (
								<p className="text-sm text-muted-foreground text-center py-8">
									No quotations found for this product
								</p>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Date</TableHead>
											<TableHead>Reference</TableHead>
											<TableHead>Customer</TableHead>
											<TableHead>Quantity</TableHead>
											<TableHead>Unit Price</TableHead>
											<TableHead>Total</TableHead>
											<TableHead>Status</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{quotations.map((q: any) => (
											<TableRow key={q.id}>
												<TableCell>
													{new Date(q.quoteDate ?? q.date).toLocaleDateString()}
												</TableCell>
												<TableCell className="font-mono text-xs">
													{q.referenceNumber ?? q.reference}
												</TableCell>
												<TableCell>{q.customerName ?? q.customer}</TableCell>
												<TableCell>{q.quantity}</TableCell>
												<TableCell>
													${(q.unitPrice ?? 0).toFixed(2)}
												</TableCell>
												<TableCell className="font-medium">
													${(q.totalPrice ?? q.total ?? 0).toFixed(2)}
												</TableCell>
												<TableCell>
													<Badge variant="outline">{q.status ?? "-"}</Badge>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							)}
						</CardContent>
					</Card>
				</div>
			)}

			{activeTab === "purchase" && (
				<div
					role="tabpanel"
					id="panel-purchase"
					aria-labelledby="tab-purchase"
					className="space-y-6"
				>
					<Card>
						<CardHeader>
							<CardTitle>Purchase Orders</CardTitle>
							<CardDescription>
								Purchase orders for this product
							</CardDescription>
						</CardHeader>
						<CardContent>
							{purchasesLoading ? (
								<div className="flex items-center justify-center py-8">
									<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
								</div>
							) : purchasesError ? (
								<p className="text-sm text-destructive text-center py-8">
									{purchasesError}
								</p>
							) : purchases.length === 0 ? (
								<p className="text-sm text-muted-foreground text-center py-8">
									No purchase orders found for this product
								</p>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Date</TableHead>
											<TableHead>Reference</TableHead>
											<TableHead>Supplier</TableHead>
											<TableHead>Quantity</TableHead>
											<TableHead>Unit Cost</TableHead>
											<TableHead>Total</TableHead>
											<TableHead>Status</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{purchases.map((p: any) => (
											<TableRow key={p.id}>
												<TableCell>
													{new Date(p.orderDate ?? p.date).toLocaleDateString()}
												</TableCell>
												<TableCell className="font-mono text-xs">
													{p.referenceNumber ?? p.reference}
												</TableCell>
												<TableCell>{p.supplierName ?? p.supplier}</TableCell>
												<TableCell>{p.quantity}</TableCell>
												<TableCell>
													${(p.unitCost ?? p.unitPrice ?? 0).toFixed(2)}
												</TableCell>
												<TableCell className="font-medium">
													${(p.totalCost ?? p.total ?? 0).toFixed(2)}
												</TableCell>
												<TableCell>
													<Badge variant="outline">{p.status ?? "-"}</Badge>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							)}
						</CardContent>
					</Card>
				</div>
			)}

			{activeTab === "transfer" && (
				<div
					role="tabpanel"
					id="panel-transfer"
					aria-labelledby="tab-transfer"
					className="space-y-6"
				>
					<Card>
						<CardHeader>
							<CardTitle>Stock Transfers</CardTitle>
							<CardDescription>
								Stock transfer history for this product
							</CardDescription>
						</CardHeader>
						<CardContent>
							{transfers.length === 0 ? (
								<p className="text-sm text-muted-foreground text-center py-8">
									No stock transfers found for this product
								</p>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Date</TableHead>
											<TableHead>Reference</TableHead>
											<TableHead>From</TableHead>
											<TableHead>To</TableHead>
											<TableHead>Quantity</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{transfers.map((t, index) => (
											<TableRow key={index}>
												<TableCell>
													{new Date(t.date).toLocaleDateString()}
												</TableCell>
												<TableCell className="font-mono text-xs">
													{t.reference}
												</TableCell>
												<TableCell>{t.from}</TableCell>
												<TableCell>{t.to}</TableCell>
												<TableCell
													className={
														t.quantity > 0
															? "text-green-600"
															: "text-red-600"
													}
												>
													{t.quantity > 0
														? `+${t.quantity}`
														: t.quantity}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							)}
						</CardContent>
					</Card>
				</div>
			)}

			{activeTab === "adjustment" && (
				<div
					role="tabpanel"
					id="panel-adjustment"
					aria-labelledby="tab-adjustment"
					className="space-y-6"
				>
					<Card>
						<CardHeader>
							<CardTitle>New Stock Adjustment</CardTitle>
							<CardDescription>
								Add or remove stock for this product
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="grid gap-6 md:grid-cols-2">
								<div className="space-y-4">
									<div className="space-y-2">
										<Label htmlFor="adj-date">Date</Label>
										<Input
											id="adj-date"
											type="date"
											value={adjDate}
											onChange={(e) => setAdjDate(e.target.value)}
										/>
									</div>

									<div className="space-y-2">
										<Label htmlFor="adj-reference">Reference No</Label>
										<Input
											id="adj-reference"
											placeholder={`ADJ-${Date.now()}`}
											value={adjReference}
											onChange={(e) => setAdjReference(e.target.value)}
										/>
									</div>

									<div className="space-y-2">
										<Label htmlFor="adj-warehouse">Warehouse</Label>
										<Select
											value={adjWarehouseId}
											onValueChange={setAdjWarehouseId}
											disabled={warehousesLoading}
										>
											<SelectTrigger id="adj-warehouse">
												<SelectValue placeholder="Select warehouse" />
											</SelectTrigger>
											<SelectContent>
												{warehouses.map((w) => (
													<SelectItem key={w.id} value={w.id}>
														{w.name}
														{w.location ? ` - ${w.location}` : ""}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>

									<div className="space-y-2">
										<Label>Type</Label>
										<div className="flex gap-4">
											<label className="flex items-center gap-2 cursor-pointer">
												<input
													type="radio"
													name="adjType"
													value="ADDITION"
													checked={adjType === "ADDITION"}
													onChange={() => setAdjType("ADDITION")}
													className="text-primary"
												/>
												<span className="text-sm font-medium text-green-600">
													Addition
												</span>
											</label>
											<label className="flex items-center gap-2 cursor-pointer">
												<input
													type="radio"
													name="adjType"
													value="REMOVAL"
													checked={adjType === "REMOVAL"}
													onChange={() => setAdjType("REMOVAL")}
													className="text-destructive"
												/>
												<span className="text-sm font-medium text-red-600">
													Removal
												</span>
											</label>
										</div>
									</div>
								</div>

								<div className="space-y-4">
									<div className="space-y-2">
										<Label htmlFor="adj-quantity">Quantity</Label>
										<Input
											id="adj-quantity"
											type="number"
											min="1"
											placeholder="Enter quantity"
											value={adjQuantity}
											onChange={(e) => setAdjQuantity(e.target.value)}
										/>
									</div>

									<div className="space-y-2">
										<Label htmlFor="adj-note">Note</Label>
										<Textarea
											id="adj-note"
											placeholder="Reason for adjustment"
											value={adjNote}
											onChange={(e) => setAdjNote(e.target.value)}
											rows={3}
										/>
									</div>

									<div className="space-y-2">
										<Label>Attach Document</Label>
										<div className="flex items-center gap-2">
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={() => fileInputRef.current?.click()}
												className="gap-2"
											>
												<Upload className="h-4 w-4" />
												Choose File
											</Button>
											<input
												ref={fileInputRef}
												type="file"
												className="hidden"
												onChange={(e) => {
													const file = e.target.files?.[0] || null;
													setAdjDocument(file);
												}}
											/>
											{adjDocument && (
												<span className="text-sm text-muted-foreground truncate max-w-[200px]">
													{adjDocument.name}
												</span>
											)}
										</div>
									</div>

									<div className="space-y-2">
										<Label htmlFor="adj-created-by">Created By</Label>
										<Input
											id="adj-created-by"
											value={user?.name || "Unknown"}
											disabled
										/>
									</div>
								</div>
							</div>

							<div className="mt-6">
								<Button
									onClick={handleSaveAdjustment}
									disabled={
										savingAdj ||
										!adjWarehouseId ||
										!adjQuantity
									}
									className="gap-2"
								>
									{savingAdj ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : (
										<Upload className="h-4 w-4" />
									)}
									{savingAdj ? "Saving..." : "Save Adjustment"}
								</Button>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Recent Adjustments</CardTitle>
							<CardDescription>
								Last 10 stock adjustments for this product
							</CardDescription>
						</CardHeader>
						<CardContent>
							{recentAdjustments.length === 0 ? (
								<p className="text-sm text-muted-foreground text-center py-8">
									No adjustments recorded yet
								</p>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Date</TableHead>
											<TableHead>Type</TableHead>
											<TableHead>Quantity</TableHead>
											<TableHead>Balance</TableHead>
											<TableHead>Reference</TableHead>
											<TableHead>Note</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{recentAdjustments.map((entry) => (
											<TableRow key={entry.id}>
												<TableCell>
													{new Date(
														entry.createdAt
													).toLocaleDateString()}
												</TableCell>
												<TableCell>
													<Badge variant="outline">{entry.type}</Badge>
												</TableCell>
												<TableCell
													className={
														entry.quantity > 0
															? "text-green-600"
															: "text-red-600"
													}
												>
													{entry.quantity > 0
														? `+${entry.quantity}`
														: entry.quantity}
												</TableCell>
												<TableCell>{entry.balance}</TableCell>
												<TableCell className="text-xs text-muted-foreground">
													{entry.reference || "-"}
												</TableCell>
												<TableCell className="text-xs text-muted-foreground">
													{entry.note || "-"}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							)}
						</CardContent>
					</Card>
				</div>
			)}
		</div>
	);
}
