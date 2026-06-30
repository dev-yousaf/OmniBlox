-- CreateIndex
CREATE INDEX "deliveries_companyId_idx" ON "deliveries"("companyId");

-- CreateIndex
CREATE INDEX "expenses_categoryId_idx" ON "expenses"("categoryId");

-- CreateIndex
CREATE INDEX "expenses_userId_idx" ON "expenses"("userId");

-- CreateIndex
CREATE INDEX "expenses_companyId_expenseDate_idx" ON "expenses"("companyId", "expenseDate");

-- CreateIndex
CREATE INDEX "inventory_warehouseId_idx" ON "inventory"("warehouseId");

-- CreateIndex
CREATE INDEX "inventory_quantity_idx" ON "inventory"("quantity");

-- CreateIndex
CREATE INDEX "purchase_orders_supplierId_idx" ON "purchase_orders"("supplierId");

-- CreateIndex
CREATE INDEX "purchase_orders_userId_idx" ON "purchase_orders"("userId");

-- CreateIndex
CREATE INDEX "purchase_orders_companyId_orderDate_idx" ON "purchase_orders"("companyId", "orderDate");

-- CreateIndex
CREATE INDEX "purchase_orders_companyId_status_idx" ON "purchase_orders"("companyId", "status");

-- CreateIndex
CREATE INDEX "purchase_returns_companyId_returnDate_idx" ON "purchase_returns"("companyId", "returnDate");

-- CreateIndex
CREATE INDEX "quotations_customerId_idx" ON "quotations"("customerId");

-- CreateIndex
CREATE INDEX "quotations_userId_idx" ON "quotations"("userId");

-- CreateIndex
CREATE INDEX "quotations_companyId_quoteDate_idx" ON "quotations"("companyId", "quoteDate");

-- CreateIndex
CREATE INDEX "sale_items_productId_idx" ON "sale_items"("productId");

-- CreateIndex
CREATE INDEX "sale_items_saleId_idx" ON "sale_items"("saleId");

-- CreateIndex
CREATE INDEX "sale_items_productId_saleId_idx" ON "sale_items"("productId", "saleId");

-- CreateIndex
CREATE INDEX "sales_customerId_idx" ON "sales"("customerId");

-- CreateIndex
CREATE INDEX "sales_userId_idx" ON "sales"("userId");

-- CreateIndex
CREATE INDEX "sales_warehouseId_idx" ON "sales"("warehouseId");

-- CreateIndex
CREATE INDEX "sales_companyId_saleDate_idx" ON "sales"("companyId", "saleDate");

-- CreateIndex
CREATE INDEX "sales_companyId_status_idx" ON "sales"("companyId", "status");

-- CreateIndex
CREATE INDEX "sales_companyId_paymentStatus_idx" ON "sales"("companyId", "paymentStatus");

-- CreateIndex
CREATE INDEX "sales_returns_saleId_idx" ON "sales_returns"("saleId");

-- CreateIndex
CREATE INDEX "sales_returns_companyId_returnDate_idx" ON "sales_returns"("companyId", "returnDate");

-- CreateIndex
CREATE INDEX "stock_adjustments_userId_idx" ON "stock_adjustments"("userId");

-- CreateIndex
CREATE INDEX "stock_adjustments_companyId_adjustmentDate_idx" ON "stock_adjustments"("companyId", "adjustmentDate");
