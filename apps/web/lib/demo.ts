/**
 * Demo-only affordances in the console ("Simulate duplicate invoice"), turned off at build time
 * with NEXT_PUBLIC_DEMO_ACCOUNTS=false, which Next inlines. Whether the sign-in page lists the
 * shared sample-workspace logins is decided by the API (`sample_accounts_hint` in /config/public).
 */
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_ACCOUNTS !== "false";
