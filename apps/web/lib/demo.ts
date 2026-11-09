/**
 * Demo affordances (the seeded demo logins, "Simulate duplicate invoice"). /config/public has no
 * demo-mode flag, so deployments with real users turn them off with NEXT_PUBLIC_DEMO_ACCOUNTS=false,
 * which Next inlines at build time.
 */
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_ACCOUNTS !== "false";
