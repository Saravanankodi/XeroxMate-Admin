import "server-only";

/**
 * Firestore writes a mix of `Timestamp`, `Date` and ISO strings across
 * collections; the UI only ever receives ISO-8601 strings.
 */
export function toISO(value: unknown): string {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate ===
      "function"
  ) {
    return (value as { toDate: () => Date })
      .toDate()
      .toISOString();
  }

  return "";
}

export function firstString(
  ...values: unknown[]
): string {
  for (const value of values) {
    if (typeof value === "string" && value) {
      return value;
    }
  }

  return "";
}
