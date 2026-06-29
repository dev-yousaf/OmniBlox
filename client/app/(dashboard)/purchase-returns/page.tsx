import { ReturnsList } from "@/components/returns/returns-list";

export default function PurchaseReturnsPage() {
  return (
    <ReturnsList
      type="supplier"
      title="Purchase Returns"
      description="Manage supplier returns"
      newLink="/returns/new"
    />
  );
}
