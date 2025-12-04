import { Product, ProductFormData } from "../_types";

export class ProductService {
  // Get all products
  static async getProducts(): Promise<Product[]> {
    // TODO: Replace with actual API call
    // Example: return await fetch('/api/products').then(res => res.json())
    return Promise.resolve([]);
  }

  // Get product by ID
  static async getProductById(id: string): Promise<Product | null> {
    // TODO: Replace with actual API call
    const items = await this.getProducts();
    const item = items.find((i) => i.id === id);
    return Promise.resolve(item || null);
  }

  // Create new product
  static async createProduct(data: ProductFormData): Promise<Product> {
    // TODO: Replace with actual API call
    const newItem: Product = {
      ...data,
      id: `PRODUCTS-${String(Date.now()).slice(-6)}`,
    } as Product;
    return Promise.resolve(newItem);
  }

  // Update product
  static async updateProduct(
    id: string,
    updates: Partial<Product>
  ): Promise<Product | null> {
    // TODO: Replace with actual API call
    const items = await this.getProducts();
    const item = items.find((i) => i.id === id);
    if (!item) return null;

    const updatedItem = { ...item, ...updates };
    return Promise.resolve(updatedItem);
  }

  // Delete product
  static async deleteProduct(id: string): Promise<boolean> {
    // TODO: Replace with actual API call
    return Promise.resolve(true);
  }

  // Get statistics
  static async getProductStats(): Promise<{
    totalProducts: number;
    activeProducts: number;
  }> {
    const items = await this.getProducts();
    const totalProducts = items.length;
    const activeProducts = items.filter((i) => i.status === "ACTIVE").length;

    return { totalProducts, activeProducts };
  }
}
