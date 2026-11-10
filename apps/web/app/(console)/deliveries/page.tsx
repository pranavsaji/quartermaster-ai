import type { Metadata } from "next";
import { DeliveriesPage } from "./DeliveriesPage";

export const metadata: Metadata = { title: "Delivery schedule" };

export default function Page() {
  return <DeliveriesPage />;
}
