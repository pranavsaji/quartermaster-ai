import type { Metadata } from "next";
import { InventoryPage } from "./InventoryPage";

export const metadata: Metadata = { title: "Inventory" };

export default function Page() {
  return <InventoryPage />;
}
