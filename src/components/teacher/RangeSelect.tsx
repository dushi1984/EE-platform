"use client";

import { navigateWithSession } from "@/components/shell/Shell";

export function RangeSelect({ value, options }: { value: string; options: { value: string; label: string }[] }) {
  return (
    <select
      value={value}
      onChange={(e) => navigateWithSession(`/payments?range=${e.target.value}`)}
      className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 outline-none hover:border-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
