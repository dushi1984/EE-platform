"use client";

import { useRef, useState } from "react";
import { useI18n } from "@/lib/i18n-client";
import { MAX_FILE_BYTES, formatBytes, getClientSessionToken } from "@/lib/file-client";
import { tt } from "@/lib/i18n-teacher";
import { Icon } from "@/components/ui";
import { reloadWithSession } from "@/components/shell/Shell";

export function StudentMessageComposer() {
  const { locale, t } = useI18n();
  const c = tt(locale);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function onFile(f?: File) {
    setFileError("");
    if (!f) return;
    if (f.size > MAX_FILE_BYTES) {
      setFileError(c.fileTooBig);
      return;
    }
    setFile(f);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const out = new FormData(e.currentTarget);
    if (file) out.set("file", file);
    setPending(true);
    try {
      const token = getClientSessionToken();
      const res = await fetch("/api/messages/send", {
        method: "POST",
        body: out,
        headers: token ? { "x-session-token": token } : undefined,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error("send failed");
      setSent(true);
      setTimeout(() => reloadWithSession(), 600);
    } catch {
      setError(t("common.errorGeneric"));
      setPending(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-900 dark:ring-white/10">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          {locale === "ar" ? "إرسال رسالة إلى المعلمة (Mrs. Fatma)" : "Send a message to your teacher (Mrs. Fatma)"}
        </h2>
      </div>
      <textarea
        name="body"
        required
        rows={3}
        placeholder={locale === "ar" ? "اكتب سؤالك أو رسالتك للمعلمة هنا..." : "Ask a question about a lesson, task, or grade..."}
        className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      />
      {file && (
        <div className="flex items-center gap-3 rounded-xl bg-blue-50 px-4 py-2.5 text-sm dark:bg-blue-500/10">
          <Icon name="file" className="h-5 w-5 text-blue-600" />
          <span className="min-w-0 flex-1 truncate font-semibold text-slate-800 dark:text-slate-100">{file.name}</span>
          <span className="text-xs text-slate-500">{formatBytes(file.size)}</span>
          <button type="button" onClick={() => setFile(null)} className="text-xs font-bold text-red-600">
            {c.removeFile}
          </button>
        </div>
      )}
      {fileError && <p className="text-xs font-semibold text-red-600">{fileError}</p>}
      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
      {sent && <p className="text-xs font-semibold text-green-600">{t("common.saved")}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-blue-600 hover:underline">
          <Icon name="file" className="h-4 w-4" />
          {c.attachFile}
          <input type="file" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-blue-700 disabled:opacity-60"
        >
          <Icon name="mail" className="h-4 w-4" />
          {pending ? c.sending : c.sendMessage}
        </button>
      </div>
    </form>
  );
}
