import type { Metadata } from "next";
import { MandatePage } from "./MandatePage";

export const metadata: Metadata = { title: "Spend mandate" };

export default function Page() {
  return <MandatePage />;
}
