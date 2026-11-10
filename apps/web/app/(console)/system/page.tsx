import type { Metadata } from "next";
import { SystemPage } from "./SystemPage";

export const metadata: Metadata = { title: "System health" };

export default function Page() {
  return <SystemPage />;
}
