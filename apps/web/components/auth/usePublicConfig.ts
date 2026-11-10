"use client";

import type { PublicConfig } from "@qm/contracts";
import { api } from "@/lib/api";
import { useResource, type ResourceState } from "@/lib/hooks";

/** Public deployment settings for the signed-out pages (sign-up open, email configured, …). */
export function usePublicConfig(): ResourceState<PublicConfig> {
  return useResource((signal) => api.config.public({ signal }), []);
}
