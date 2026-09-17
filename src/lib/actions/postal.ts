"use server";

import { lookupJapanAddress, type PostalLookupResult } from "@/lib/japan-postal-code";

export async function lookupJapanPostalCode(postalCode: string): Promise<PostalLookupResult> {
  return lookupJapanAddress(postalCode);
}
