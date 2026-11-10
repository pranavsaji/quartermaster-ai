import type { Metadata } from "next";
import { SupplierDetail } from "./SupplierDetail";

export const metadata: Metadata = { title: "Supplier" };

export default async function SupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SupplierDetail key={id} id={id} />;
}
