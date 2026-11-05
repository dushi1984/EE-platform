"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { safeDeleteCookie, safeRemoveLocal, safeRemoveSession } from "@/lib/browser-prefs";

function Cleaner() {
  const params = useSearchParams();
  useEffect(() => {
    if (params.get("logged_out") !== "1" && params.get("reauth") !== "1") return;
    safeRemoveLocal("insci_session");
    safeRemoveSession("insci_session");
    safeDeleteCookie("insci_session");
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has("session") || url.searchParams.has("token")) {
        url.searchParams.delete("session");
        url.searchParams.delete("token");
        window.history.replaceState(null, "", url.toString());
      }
    } catch {
      // ignore
    }
  }, [params]);
  return null;
}

export function SessionCleaner() {
  return (
    <Suspense fallback={null}>
      <Cleaner />
    </Suspense>
  );
}
