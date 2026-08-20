"use server";

import { getShellSession } from "@/lib/session";

export async function getShellSessionAction() {
  return getShellSession();
}
