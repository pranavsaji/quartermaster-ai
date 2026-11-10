import type { SVGProps } from "react";

/** Minimal 20px outline icon set (stroke-based, currentColor). */
function Base(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="size-[18px] shrink-0"
      {...props}
    />
  );
}

export const Icons = {
  overview: (p: SVGProps<SVGSVGElement>) => (
    <Base {...p}>
      <rect x="3" y="3" width="6" height="6" rx="1.5" />
      <rect x="11" y="3" width="6" height="4" rx="1.5" />
      <rect x="11" y="9" width="6" height="8" rx="1.5" />
      <rect x="3" y="11" width="6" height="6" rx="1.5" />
    </Base>
  ),
  procurement: (p: SVGProps<SVGSVGElement>) => (
    <Base {...p}>
      <path d="M3 4h2l1.6 8.2a1.5 1.5 0 0 0 1.5 1.2h6.3a1.5 1.5 0 0 0 1.5-1.1L17 7H6" />
      <circle cx="8.5" cy="16.5" r="1" />
      <circle cx="14.5" cy="16.5" r="1" />
    </Base>
  ),
  approvals: (p: SVGProps<SVGSVGElement>) => (
    <Base {...p}>
      <path d="M10 2.5 16 5v4.6c0 3.6-2.5 6.6-6 7.9-3.5-1.3-6-4.3-6-7.9V5l6-2.5Z" />
      <path d="m7.3 10 1.9 1.9 3.6-3.8" />
    </Base>
  ),
  inventory: (p: SVGProps<SVGSVGElement>) => (
    <Base {...p}>
      <path d="M3 6.5 10 3l7 3.5v7L10 17l-7-3.5v-7Z" />
      <path d="M3 6.5 10 10l7-3.5M10 10v7" />
    </Base>
  ),
  orders: (p: SVGProps<SVGSVGElement>) => (
    <Base {...p}>
      <path d="M5 2.5h7l3 3v12H5v-15Z" />
      <path d="M12 2.5v3h3M7.5 9.5h5M7.5 12.5h5M7.5 15h3" />
    </Base>
  ),
  schedule: (p: SVGProps<SVGSVGElement>) => (
    <Base {...p}>
      <rect x="3" y="4" width="14" height="13" rx="2" />
      <path d="M3 8h14M7 2.5v3M13 2.5v3M6 11.5h4M8 14.5h5" />
    </Base>
  ),
  mandate: (p: SVGProps<SVGSVGElement>) => (
    <Base {...p}>
      <path d="M4 5h12M4 10h12M4 15h12" />
      <circle cx="7" cy="5" r="1.6" fill="white" />
      <circle cx="13" cy="10" r="1.6" fill="white" />
      <circle cx="9" cy="15" r="1.6" fill="white" />
    </Base>
  ),
  security: (p: SVGProps<SVGSVGElement>) => (
    <Base {...p}>
      <rect x="4" y="9" width="12" height="8" rx="1.8" />
      <path d="M6.8 9V6.5a3.2 3.2 0 1 1 6.4 0V9M10 12.3v1.8" />
    </Base>
  ),
  redteam: (p: SVGProps<SVGSVGElement>) => (
    <Base {...p}>
      <circle cx="10" cy="10" r="6" />
      <circle cx="10" cy="10" r="2.2" />
      <path d="M10 2v3M10 15v3M2 10h3M15 10h3" />
    </Base>
  ),
  analytics: (p: SVGProps<SVGSVGElement>) => (
    <Base {...p}>
      <path d="M3 17h14" />
      <path d="M5.5 14V9.5M10 14V5M14.5 14v-6" />
    </Base>
  ),
  suppliers: (p: SVGProps<SVGSVGElement>) => (
    <Base {...p}>
      <path d="M2.5 6.5h9v7h-9z" />
      <path d="M11.5 9h3l2.5 2.5v2h-5.5" />
      <circle cx="5.5" cy="14.5" r="1.4" />
      <circle cx="14" cy="14.5" r="1.4" />
    </Base>
  ),
  team: (p: SVGProps<SVGSVGElement>) => (
    <Base {...p}>
      <circle cx="7.5" cy="7" r="2.6" />
      <path d="M2.8 16c.6-2.6 2.4-4 4.7-4s4.1 1.4 4.7 4" />
      <path d="M13 4.6a2.4 2.4 0 0 1 0 4.8M14.6 12.2c1.4.5 2.3 1.8 2.6 3.8" />
    </Base>
  ),
  account: (p: SVGProps<SVGSVGElement>) => (
    <Base {...p}>
      <circle cx="10" cy="7.5" r="3" />
      <path d="M4.5 16.5c.8-2.8 2.9-4.3 5.5-4.3s4.7 1.5 5.5 4.3" />
    </Base>
  ),
  system: (p: SVGProps<SVGSVGElement>) => (
    <Base {...p}>
      <path d="M2.5 10h3l2-4.5 3 9 2-4.5h5" />
    </Base>
  ),
  menu: (p: SVGProps<SVGSVGElement>) => (
    <Base {...p}>
      <path d="M3.5 6h13M3.5 10h13M3.5 14h13" />
    </Base>
  ),
  close: (p: SVGProps<SVGSVGElement>) => (
    <Base {...p}>
      <path d="m5 5 10 10M15 5 5 15" />
    </Base>
  ),
  signOut: (p: SVGProps<SVGSVGElement>) => (
    <Base {...p}>
      <path d="M8 3.5H5a1.5 1.5 0 0 0-1.5 1.5v10A1.5 1.5 0 0 0 5 16.5h3M12.5 13.5 16 10l-3.5-3.5M16 10H8" />
    </Base>
  ),
  arrowRight: (p: SVGProps<SVGSVGElement>) => (
    <Base {...p}>
      <path d="M4 10h12M11.5 5.5 16 10l-4.5 4.5" />
    </Base>
  ),
  shield: (p: SVGProps<SVGSVGElement>) => (
    <Base {...p}>
      <path d="M10 2.5 16 5v4.6c0 3.6-2.5 6.6-6 7.9-3.5-1.3-6-4.3-6-7.9V5l6-2.5Z" />
    </Base>
  ),
  check: (p: SVGProps<SVGSVGElement>) => (
    <Base {...p}>
      <path d="m4.5 10.5 3.5 3.5 7.5-8" />
    </Base>
  ),
  x: (p: SVGProps<SVGSVGElement>) => (
    <Base {...p}>
      <path d="m5.5 5.5 9 9M14.5 5.5l-9 9" />
    </Base>
  ),
  minus: (p: SVGProps<SVGSVGElement>) => (
    <Base {...p}>
      <path d="M5 10h10" />
    </Base>
  ),
  sparkle: (p: SVGProps<SVGSVGElement>) => (
    <Base {...p}>
      <path d="M10 3v3M10 14v3M3 10h3M14 10h3M5.3 5.3l2 2M12.7 12.7l2 2M14.7 5.3l-2 2M7.3 12.7l-2 2" />
    </Base>
  ),
  refresh: (p: SVGProps<SVGSVGElement>) => (
    <Base {...p}>
      <path d="M16 10a6 6 0 1 1-1.76-4.24" />
      <path d="M16 3.5v3h-3" />
    </Base>
  ),
  inbox: (p: SVGProps<SVGSVGElement>) => (
    <Base {...p}>
      <path d="M3 11.5 5 5h10l2 6.5V15a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 15v-3.5Z" />
      <path d="M3 11.5h4l1 2h4l1-2h4" />
    </Base>
  ),
  more: (p: SVGProps<SVGSVGElement>) => (
    <Base {...p}>
      <circle cx="5" cy="10" r="0.9" fill="currentColor" />
      <circle cx="10" cy="10" r="0.9" fill="currentColor" />
      <circle cx="15" cy="10" r="0.9" fill="currentColor" />
    </Base>
  ),
  chevronDown: (p: SVGProps<SVGSVGElement>) => (
    <Base {...p}>
      <path d="m6 8 4 4 4-4" />
    </Base>
  ),
  beaker: (p: SVGProps<SVGSVGElement>) => (
    <Base {...p}>
      <path d="M8 3h4M8.5 3v4.5L4.2 14.6A1.6 1.6 0 0 0 5.6 17h8.8a1.6 1.6 0 0 0 1.4-2.4L11.5 7.5V3" />
      <path d="M6.2 12h7.6" />
    </Base>
  ),
  search: (p: SVGProps<SVGSVGElement>) => (
    <Base {...p}>
      <circle cx="8.5" cy="8.5" r="5.5" />
      <path d="m13 13 4 4" />
    </Base>
  ),
  columns: (p: SVGProps<SVGSVGElement>) => (
    <Base {...p}>
      <rect x="3" y="4" width="14" height="12" rx="1.5" />
      <path d="M8 4v12M12.5 4v12" />
    </Base>
  ),
};

export type IconName = keyof typeof Icons;
