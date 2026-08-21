export type PostalLookupError = "invalid" | "not_found" | "network";

export type PostalLookupResult =
  | { ok: true; addressLine1: string; formattedPostalCode: string }
  | { ok: false; error: PostalLookupError };

type ZipcloudResponse = {
  status: number;
  message: string | null;
  results: Array<{
    address1: string;
    address2: string;
    address3: string;
  }> | null;
};

/** Extract up to 7 digits from a postal code input. */
export function extractPostalDigits(value: string): string {
  return value.replace(/\D/g, "").slice(0, 7);
}

/** Format 7 digits as 000-0000. */
export function formatPostalCode(digits: string): string {
  const d = extractPostalDigits(digits);
  if (d.length <= 3) return d;
  return `${d.slice(0, 3)}-${d.slice(3)}`;
}

/** Look up a Japanese address from postal code via zipcloud. */
export async function lookupJapanAddress(postalCode: string): Promise<PostalLookupResult> {
  const digits = extractPostalDigits(postalCode);
  if (digits.length !== 7) {
    return { ok: false, error: "invalid" };
  }

  try {
    const res = await fetch(
      `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${encodeURIComponent(digits)}`,
    );
    if (!res.ok) {
      return { ok: false, error: "network" };
    }

    const data = (await res.json()) as ZipcloudResponse;
    if (data.status !== 200 || !data.results?.length) {
      return { ok: false, error: "not_found" };
    }

    const row = data.results[0];
    const addressLine1 = `${row.address1}${row.address2}${row.address3}`;
    return {
      ok: true,
      addressLine1,
      formattedPostalCode: formatPostalCode(digits),
    };
  } catch {
    return { ok: false, error: "network" };
  }
}
