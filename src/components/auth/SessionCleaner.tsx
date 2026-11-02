"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";

function Cleaner() {
  const params = useSearchParams();
  useEffect(() => {
    if (params.get("logged_out") !== "1" && params.get("reauth") !== "1") return;
    try {
      localStorage.removeItem("insci_session");
      sessionStorage.removeItem("insci_session");
    } catch {
      // ignore
    }
    for (const n of ["insci_session", "insci_session_p"]) {
      document.cookie = `${n}=; path=/; max-age=0; SameSite=Lax`;
      document.cookie = `${n}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }
    const url = new URL(window.location.href);
    if (url.searchParams.has("session") || url.searchParams.has("token")) {
      url.searchParams.delete("session");
      url.searchParams.delete("token");
      window.history.replaceState(null, "", url.toString());
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
