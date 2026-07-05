"use client";

import { WorkspaceLink as Link } from "@/components/workspace-link";
import {
	Package,
	Folder,
	Factory,
	Scale,
	Hash,
	Barcode,
	Info,
	Shield,
	Calendar,
	Clock,
	User,
	Warehouse,
	RefreshCw,
	Bell,
	DollarSign,
	Percent,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { DetailsTabProps } from "./types";

export function DetailsTab({
	product,
	inventory,
	inventoryLoading,
	variants,
	ledger,
	canManage,
	showVariantForm,
	setShowVariantForm,
	variantSku,
	setVariantSku,
	variantName,
	setVariantName,
	variantSalePrice,
	setVariantSalePrice,
	variantCostPrice,
	setVariantCostPrice,
	variantStock,
	setVariantStock,
	savingVariant,
	handleSaveVariant,
	productId,
}: DetailsTabProps) {
	return (
		<div role="tabpanel" id="panel-details" aria-labelledby="tab-details" className="space-y-4">
			{/* TOP ROW: Product Image+Info Card + Sale Price */}
			<div className="grid gap-4 lg:grid-cols-[1fr_300px]">
				{/* LEFT: Image + Info */}
				<div className="border border-border rounded-[5px] bg-card">
					<div className="p-[28px] flex gap-[28px] items-start">
						{/* Dynamic Image Section */}
						<div className="shrink-0">
							{product.imageUrl ? (
								<div className="relative w-[200px] h-[200px] rounded-[10px] overflow-hidden border border-border bg-muted">
									<img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
									<div className="absolute top-2 left-2">
										<span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold ${product.stock > product.reorderLevel ? "bg-[#22c55e] text-white" : product.stock > 0 ? "bg-[#f59e0b] text-white" : "bg-[#ef4444] text-white"}`}>
											<span className="w-1.5 h-1.5 rounded-full bg-white inline-block" />
											{product.stock > product.reorderLevel ? "In Stock" : product.stock > 0 ? "Low Stock" : "Out of Stock"}
										</span>
									</div>
								</div>
							) : (
								<div className="relative w-[200px] h-[200px] rounded-[10px] border border-dashed border-border bg-muted flex flex-col items-center justify-center gap-2">
									<div className="absolute top-2 left-2">
										<span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold ${product.stock > product.reorderLevel ? "bg-[#22c55e] text-white" : product.stock > 0 ? "bg-[#f59e0b] text-white" : "bg-[#ef4444] text-white"}`}>
											<span className="w-1.5 h-1.5 rounded-full bg-white inline-block" />
											{product.stock > product.reorderLevel ? "In Stock" : product.stock > 0 ? "Low Stock" : "Out of Stock"}
										</span>
									</div>
									<div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
										<Package className="w-7 h-7 text-muted-foreground" />
									</div>
									<p className="text-[12px] text-muted-foreground font-medium text-center px-2">No Image Available</p>
								</div>
							)}
						</div>

						{/* Product Info */}
						<div className="flex-1 min-w-0">
							<p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1">SKU: {product.sku}</p>
							<h2 className="text-[24px] font-bold text-card-foreground leading-tight mb-4">{product.name}</h2>
							<div className="flex items-center gap-4 mb-5 flex-wrap">
								{product.category && (
									<div className="flex items-center gap-1.5 text-[14px] text-muted-foreground">
										<Folder className="w-[15px] h-[15px]" />
										<span>{product.category}</span>
									</div>
								)}
								{product.brand && (
									<div className="flex items-center gap-1.5 text-[14px] text-muted-foreground">
										<Factory className="w-[15px] h-[15px]" />
										<span>{product.brand}</span>
									</div>
								)}
								{product.type && (
									<Badge variant="outline" className={`text-[11px] ${product.type === "DIGITAL" ? "bg-blue-50 text-blue-700 border-blue-200" : product.type === "SERVICE" ? "bg-green-50 text-green-700 border-green-200" : product.type === "COMBO" ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-gray-50 text-gray-600 border-gray-200"}`}>
										{product.type}
									</Badge>
								)}
							</div>
							{product.description && (
								<div className="mb-5">
									<p className="text-[14px] font-semibold text-card-foreground mb-2">Description</p>
									<p className="text-[14px] text-muted-foreground leading-[1.7]">{product.description}</p>
								</div>
							)}
							<div className="flex flex-wrap gap-x-6 gap-y-2 mt-4">
								{product.unit && (
									<div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
										<Scale className="w-4 h-4 text-[#fe9f43]" />
										<span>Unit: <span className="font-medium text-card-foreground">{product.unit}</span></span>
									</div>
								)}
								{product.itemCode && (
									<div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
										<Hash className="w-4 h-4 text-[#fe9f43]" />
										<span>Item Code: <span className="font-medium text-card-foreground font-mono">{product.itemCode}</span></span>
									</div>
								)}
								{product.barcodeSymbology && (
									<div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
										<Barcode className="w-4 h-4 text-[#fe9f43]" />
										<span>Barcode: <span className="font-medium text-card-foreground">{product.barcodeSymbology}</span></span>
									</div>
								)}
								{product.subCategory && (
									<div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
										<Folder className="w-4 h-4 text-[#fe9f43]" />
										<span>Sub-Cat: <span className="font-medium text-card-foreground">{product.subCategory}</span></span>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>

				{/* RIGHT: Sale Price Card (full height) */}
				<div className="border border-border rounded-[5px] bg-[#092c4c] dark:bg-orange-600 text-white p-[24px] flex flex-col justify-between h-full">
					<div>
						<p className="text-[12px] font-medium text-[#8babc4] dark:text-white/60 uppercase tracking-wider mb-1">Sale Price</p>
						<p className="text-[32px] font-bold leading-none mb-0.5">${product.salePrice.toFixed(2)}</p>
						<p className="text-[12px] text-[#8babc4] dark:text-white/60">/ {product.unit || "unit"}</p>
					</div>
					<div className="grid grid-cols-2 gap-3 mt-6">
						<div className="bg-white/10 rounded-[5px] px-3 py-3">
							<p className="text-[11px] text-[#8babc4] dark:text-white/60 mb-0.5">Current Stock</p>
							<p className="text-[16px] font-bold">{product.stock} <span className="text-[11px] font-normal text-[#8babc4] dark:text-white/60">Pc</span></p>
						</div>
						<div className="bg-white/10 rounded-[5px] px-3 py-3">
							<p className="text-[11px] text-[#8babc4] dark:text-white/60 mb-0.5">Alert Qty</p>
							<p className="text-[16px] font-bold text-[#fe9f43]">{product.alertQuantity ?? product.reorderLevel} <span className="text-[11px] font-normal text-[#8babc4] dark:text-white/60">Pc</span></p>
						</div>
					</div>
				</div>
			</div>

			{/* BOTTOM ROW: 3 Cards */}
			<div className="grid gap-4 lg:grid-cols-3">
				{/* Inventory Details Card */}
				<div className="border border-border rounded-[5px] bg-card">
					<div className="border-b border-border px-[16px] py-[12px]">
						<h3 className="text-[14px] font-semibold text-card-foreground">Inventory Details</h3>
					</div>
					<div className="px-[16px] py-[14px] space-y-3">
						<div className="flex items-center justify-between">
							<span className="text-[13px] text-muted-foreground">Product Type</span>
							<span className="text-[13px] font-medium text-card-foreground">{product.hasVariants ? "Variable" : "Single"}</span>
						</div>
						<div className="h-px bg-muted" />
						{product.taxRate != null && (
							<>
								<div className="flex items-center justify-between">
									<span className="text-[13px] text-muted-foreground">Tax Type</span>
									<span className="text-[13px] font-medium text-card-foreground">{product.taxRate === 0 ? "No Tax" : "Exclusive"}</span>
								</div>
								<div className="h-px bg-muted" />
							</>
						)}
						<div className="flex items-center justify-between">
							<span className="text-[13px] text-muted-foreground">Cost Price</span>
							<span className="text-[13px] font-medium text-card-foreground">${product.costPrice.toFixed(2)}</span>
						</div>
						{product.taxRate != null && product.taxRate > 0 && (
							<>
								<div className="h-px bg-muted" />
								<div className="flex items-center justify-between">
									<span className="text-[13px] text-muted-foreground">Tax Rate</span>
									<span className="text-[13px] font-semibold text-[#fe9f43]">{product.taxRate}% TAX</span>
								</div>
							</>
						)}
						{product.status && (
							<>
								<div className="h-px bg-muted" />
								<div className="flex items-center justify-between">
									<span className="text-[13px] text-muted-foreground">Status</span>
									<Badge variant={product.status === "ACTIVE" ? "default" : product.status === "INACTIVE" ? "secondary" : "destructive"} className="text-[11px] capitalize">
										{product.status.toLowerCase()}
									</Badge>
								</div>
							</>
						)}
					</div>
				</div>

				{/* Technical Specifications */}
				<div className="border border-border rounded-[5px] bg-card">
					<div className="border-b border-border px-[20px] py-[14px] flex items-center gap-2">
						<Info className="w-4 h-4 text-muted-foreground" />
						<h3 className="text-[15px] font-semibold text-card-foreground">Technical Specifications</h3>
					</div>
					<div className="p-[20px] grid grid-cols-2 gap-x-8 gap-y-4">
						{inventory.length > 0 && (
							<div>
								<p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">Store / Warehouse</p>
								<p className="text-[13px] font-semibold text-card-foreground">{inventory[0]?.warehouseName || "—"}</p>
							</div>
						)}
						{product.brand && (
							<div>
								<p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">Brand</p>
								<p className="text-[13px] font-semibold text-card-foreground">{product.brand}</p>
							</div>
						)}
						{product.unit && (
							<div>
								<p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">Unit</p>
								<p className="text-[13px] font-semibold text-card-foreground">{product.unit} (Piece)</p>
							</div>
						)}
						{product.sku && (
							<div>
								<p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">Slug</p>
								<p className="text-[13px] font-semibold text-card-foreground font-mono break-all">{product.sku.toLowerCase().replace(/[^a-z0-9]/g, "-")}</p>
							</div>
						)}
						{product.itemCode && (
							<div>
								<p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">Item Code</p>
								<p className="text-[13px] font-semibold text-card-foreground font-mono">{product.itemCode}</p>
							</div>
						)}
						{product.barcodeSymbology && (
							<div>
								<p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">Barcode Symbology</p>
								<p className="text-[13px] font-semibold text-card-foreground">≡ {product.barcodeSymbology.replace("CODE128", "Code-128").replace("EAN13", "EAN-13").replace("UPCA", "UPC-A")}</p>
							</div>
						)}
						{product.category && (
							<div>
								<p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">Category</p>
								<p className="text-[13px] font-semibold text-card-foreground">{product.category}</p>
							</div>
						)}
						{product.subCategory && (
							<div>
								<p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">Sub Category</p>
								<p className="text-[13px] font-semibold text-card-foreground">{product.subCategory}</p>
							</div>
						)}
					</div>
					{inventory.length > 0 && (
						<div className="border-t border-border px-[20px] py-[14px] space-y-2">
							{inventoryLoading ? (
								<p className="text-[12px] text-muted-foreground">Loading warehouse stock...</p>
							) : (
								inventory.map((item) => (
									<div key={`${item.productId}-${item.warehouseId}`} className="flex items-center justify-between">
										<div className="flex items-center gap-2">
											<Warehouse className="w-3.5 h-3.5 text-muted-foreground" />
											<span className="text-[13px] text-card-foreground">{item.warehouseName}</span>
										</div>
										<div className="flex items-center gap-2">
											<span className="text-[13px] font-semibold text-card-foreground">{item.quantity} pc</span>
											{item.quantity === 0 && <Badge variant="destructive" className="text-[10px] h-4">Out</Badge>}
											{item.quantity > 0 && item.quantity <= item.reorderLevel && <Badge variant="destructive" className="text-[10px] h-4">Low</Badge>}
											{item.quantity > item.reorderLevel && <Badge variant="secondary" className="text-[10px] h-4 bg-green-100 text-green-700">OK</Badge>}
										</div>
									</div>
								))
							)}
						</div>
					)}
				</div>

				{/* Compliance & Warranty */}
				<div className="border border-border rounded-[5px] bg-card">
					<div className="border-b border-border px-[20px] py-[14px] flex items-center gap-2">
						<Shield className="w-4 h-4 text-muted-foreground" />
						<h3 className="text-[15px] font-semibold text-card-foreground">Compliance &amp; Warranty</h3>
					</div>
					<div className="p-[20px] space-y-[16px]">
						{product.warranty ? (
							<div className="flex items-start gap-3">
								<div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
									<Shield className="w-4 h-4 text-card-foreground" />
								</div>
								<div>
									<p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">Warranty Details</p>
									<p className="text-[13px] font-semibold text-card-foreground">{product.warranty}</p>
								</div>
							</div>
						) : (
							<div className="flex items-start gap-3">
								<div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
									<Shield className="w-4 h-4 text-muted-foreground" />
								</div>
								<div>
									<p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">Warranty Details</p>
									<p className="text-[13px] text-muted-foreground italic">No warranty specified</p>
								</div>
							</div>
						)}
						{product.manufacturer && (
							<div className="flex items-start gap-3">
								<div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
									<Factory className="w-4 h-4 text-card-foreground" />
								</div>
								<div>
									<p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">Manufacturer</p>
									<p className="text-[13px] font-semibold text-card-foreground">{product.manufacturer}</p>
								</div>
							</div>
						)}
						{product.manufacturedDate && (
							<div className="flex items-start gap-3">
								<div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
									<Calendar className="w-4 h-4 text-card-foreground" />
								</div>
								<div>
									<p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">Manufactured Date</p>
									<p className="text-[13px] font-semibold text-card-foreground">{new Date(product.manufacturedDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
								</div>
							</div>
						)}
						{product.expiryDate && (
							<div className="flex items-start gap-3">
								<div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
									<Clock className="w-4 h-4 text-card-foreground" />
								</div>
								<div>
									<p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">Expiry Date</p>
									<p className="text-[13px] font-semibold text-card-foreground">{new Date(product.expiryDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
								</div>
							</div>
						)}
						{!product.warranty && !product.manufacturer && !product.manufacturedDate && !product.expiryDate && (
							<p className="text-[13px] text-muted-foreground italic text-center py-4">No compliance or warranty information available</p>
						)}
						{product.createdBy && (
							<div className="border-t border-border pt-[14px] flex items-center gap-3">
								<div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
									{product.createdBy.image ? (
										<img src={product.createdBy.image} alt="" className="w-full h-full object-cover" />
									) : (
										<User className="w-4 h-4 text-card-foreground" />
									)}
								</div>
								<div>
									<p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">Created By</p>
									<p className="text-[13px] font-semibold text-card-foreground">{product.createdBy.name}</p>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Stock Ledger */}
			{ledger.length > 0 && (
				<div className="border border-border rounded-[5px]">
					<div className="border-b border-border px-[20px] py-[15px]">
						<h3 className="text-[16px] font-semibold text-card-foreground">Stock Ledger</h3>
						<p className="text-[13px] text-muted-foreground">History of stock movements</p>
					</div>
					<div className="p-[20px]">
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
										<TableCell>{new Date(entry.createdAt).toLocaleDateString()}</TableCell>
										<TableCell><Badge variant="outline">{entry.type}</Badge></TableCell>
										<TableCell className={entry.quantity > 0 ? "text-green-600" : "text-red-600"}>
											{entry.quantity > 0 ? `+${entry.quantity}` : entry.quantity}
										</TableCell>
										<TableCell>{entry.balance}</TableCell>
										<TableCell className="text-xs text-muted-foreground">{entry.reference || "-"}</TableCell>
										<TableCell className="text-xs text-muted-foreground">{entry.note || "-"}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				</div>
			)}

			{/* Bundle Contents (Combo) */}
			{product.type === "COMBO" && product.comboItems && product.comboItems.length > 0 && (
				<div className="border border-border rounded-[5px]">
					<div className="border-b border-border px-[20px] py-[15px]">
						<h3 className="text-[16px] font-semibold text-card-foreground">Bundle Contents</h3>
					</div>
					<div className="p-[20px]">
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
										<TableCell className="font-mono text-xs">{item.productSku}</TableCell>
										<TableCell>{item.productName}</TableCell>
										<TableCell>{item.quantity}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				</div>
			)}

			{/* Create Variant */}
			{product.hasVariants && canManage && (
				<div className="border border-border rounded-[5px]">
					<div className="border-b border-border px-[20px] py-[15px]">
						<h3 className="text-[16px] font-semibold text-card-foreground">Create Variant</h3>
					</div>
					<div className="p-[20px]">
						{!showVariantForm ? (
							<Button onClick={() => setShowVariantForm(true)}>Add Variant</Button>
						) : (
							<div className="space-y-4">
								<div className="grid grid-cols-2 gap-4">
									<div>
										<label className="text-sm font-medium text-muted-foreground block mb-1">SKU</label>
										<input type="text" value={variantSku} onChange={(e) => setVariantSku(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" />
									</div>
									<div>
										<label className="text-sm font-medium text-muted-foreground block mb-1">Name</label>
										<input type="text" value={variantName} onChange={(e) => setVariantName(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" />
									</div>
								</div>
								<div className="grid grid-cols-3 gap-4">
									<div>
										<label className="text-sm font-medium text-muted-foreground block mb-1">Sale Price</label>
										<input type="number" value={variantSalePrice} onChange={(e) => setVariantSalePrice(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" />
									</div>
									<div>
										<label className="text-sm font-medium text-muted-foreground block mb-1">Cost Price</label>
										<input type="number" value={variantCostPrice} onChange={(e) => setVariantCostPrice(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" />
									</div>
									<div>
										<label className="text-sm font-medium text-muted-foreground block mb-1">Stock</label>
										<input type="number" value={variantStock} onChange={(e) => setVariantStock(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" />
									</div>
								</div>
								<div className="flex items-center gap-2">
									<Button onClick={handleSaveVariant} disabled={savingVariant}>{savingVariant ? "Saving..." : "Save Variant"}</Button>
									<Button variant="outline" onClick={() => setShowVariantForm(false)}>Cancel</Button>
								</div>
							</div>
						)}
					</div>
				</div>
			)}

			{/* Variants Table */}
			{variants.length > 0 && (
				<div className="border border-border rounded-[5px]">
					<div className="border-b border-border px-[20px] py-[15px]">
						<h3 className="text-[16px] font-semibold text-card-foreground">Variants</h3>
						<p className="text-[13px] text-muted-foreground">Product variations ({variants.length})</p>
					</div>
					<div className="p-[20px]">
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
										<TableCell className="font-mono text-xs">{v.sku}</TableCell>
										<TableCell>
											<Link href={`/products/${v.id}`} className="hover:underline font-medium">{v.name}</Link>
										</TableCell>
										<TableCell>${v.salePrice.toFixed(2)}</TableCell>
										<TableCell>
											<span className={v.stock <= v.reorderLevel ? "text-warning font-semibold" : ""}>{v.stock}</span>
										</TableCell>
										<TableCell>
											<Badge variant={v.status === "ACTIVE" ? "default" : "secondary"}>{v.status}</Badge>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				</div>
			)}
		</div>
	);
}
