"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/Skeleton";
import type { ScheduleViewProps } from "./BryntumScheduleView";

/** Bryntum renders straight into the DOM, so it is loaded in the browser only. */
const BryntumScheduleView = dynamic(() => import("./BryntumScheduleView"), {
  ssr: false,
  loading: () => <Skeleton className="h-[560px] w-full rounded-xl" />,
});

export function DeliverySchedule(props: ScheduleViewProps) {
  return <BryntumScheduleView {...props} />;
}

export type { DropRequest } from "./BryntumScheduleView";
