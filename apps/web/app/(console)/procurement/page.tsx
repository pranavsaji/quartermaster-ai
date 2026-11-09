import type { Metadata } from "next";
import { ProcurementPage } from "./ProcurementPage";

export const metadata: Metadata = { title: "Procurement" };

export default function Page() {
  return <ProcurementPage />;
}
