import type { Metadata } from "next";
import { RedTeamPage } from "./RedTeamPage";

export const metadata: Metadata = { title: "Red-team TrustRail" };

export default function Page() {
  return <RedTeamPage />;
}
