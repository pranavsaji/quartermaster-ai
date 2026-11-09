import type { Metadata } from "next";
import { Suspense } from "react";
import { RequestDetail } from "./RequestDetail";

export const metadata: Metadata = { title: "Procurement request" };

export default async function ProcurementRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={null}>
      <RequestDetail key={id} id={id} />
    </Suspense>
  );
}
