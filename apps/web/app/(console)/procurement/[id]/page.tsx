"use client";

import { useParams } from "next/navigation";
import { Suspense } from "react";
import { RequestDetail } from "./RequestDetail";

export default function ProcurementRequestPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  if (!id) return null;
  return (
    <Suspense fallback={null}>
      <RequestDetail key={id} id={id} />
    </Suspense>
  );
}
