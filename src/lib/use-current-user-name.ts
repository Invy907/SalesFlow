"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function useCurrentUserName(): string {
  const [name, setName] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      const supabase = createSupabaseBrowserClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;

      const { data } = await supabase
        .from("profiles")
        .select("display_name, email")
        .eq("id", auth.user.id)
        .maybeSingle();

      if (!alive) return;
      setName(data?.display_name || (data?.email ?? "").split("@")[0] || "");
    })();
    return () => {
      alive = false;
    };
  }, []);

  return name;
}
