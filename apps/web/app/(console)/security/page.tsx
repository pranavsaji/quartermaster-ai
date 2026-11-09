import type { Metadata } from "next";
import { SecurityPage } from "./SecurityPage";

export const metadata: Metadata = { title: "Security center" };

export default function Page() {
  return <SecurityPage />;
}
