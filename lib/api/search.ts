import { apiGet, buildQuery } from "./client";
import type { GlobalSearchResults } from "./types";

export function globalSearch(term: string): Promise<GlobalSearchResults> {
  return apiGet<GlobalSearchResults>(
    `/api/search${buildQuery({ q: term })}`
  );
}
