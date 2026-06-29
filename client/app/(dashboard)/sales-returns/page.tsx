import { ReturnsList } from "@/components/returns/returns-list";

export default function SalesReturnsPage() {
  return (
    <ReturnsList
      type="customer"
      title="Sales Returns"
      description="Manage customer returns"
      newLink="/returns/new?sale=true"
    />
  );
}
