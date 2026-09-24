import { redirect } from "next/navigation";
import { getShellSession } from "@/lib/session";
import { AccountFormClient } from "./account-form-client";

export default async function SettingsAccountPage() {
  const session = await getShellSession();
  if (!session.profile) redirect("/auth/sign-in");
  return <AccountFormClient session={session} />;
}
