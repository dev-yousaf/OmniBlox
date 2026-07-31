import { BadRequestException } from '@nestjs/common';

/**
 * Typed exception thrown when a stock mutation would drive an
 * Inventory.quantity below zero. Callers may catch this specifically
 * to present an actionable error to the user.
 */
export class InsufficientStockException extends BadRequestException {
  constructor(
    productId: string,
    available: number,
    requested: number,
    productName?: string,
  ) {
    super(
      productName
        ? `Insufficient stock for product "${productName}". Available: ${available}, Requested: ${requested}`
        : `Insufficient stock for product. Available: ${available}, Requested: ${requested}`,
    );
    this.name = 'InsufficientStockException';
    this.productId = productId;
    this.available = available;
    this.requested = requested;
  }

  readonly productId: string;
  readonly available: number;
  readonly requested: number;
}
