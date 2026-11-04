"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
        <Icon name="alert" className="h-8 w-8" />
      </div>
      <h1 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">Something interrupted this page</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        Your work is saved. Try again, or reload — you should not need to sign in again.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-xl bg-navy-500 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-navy-600"
        >
          Try again
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Reload page
        </button>
        <Link
          href="/dashboard"
          className="rounded-xl px-5 py-2.5 text-sm font-semibold text-navy-600 hover:underline dark:text-sky-300"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
