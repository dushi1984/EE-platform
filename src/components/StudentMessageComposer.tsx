"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n-client";
import {
  formatBytes,
  getClientSessionToken,
  MAX_FILE_BYTES,
  uploadFileToCloudBucket,
} from "@/lib/file-client";
import { tt } from "@/lib/i18n-teacher";
import { Card, Icon } from "@/components/ui";
import { reloadWithSession } from "@/components/shell/Shell";

export function StudentMessageComposer() {
  const { locale } = useI18n();
  const c = tt(locale);
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  function onFile(f?: File) {
    setError("");
    if (!f) return;
    if (f.size > MAX_FILE_BYTES) {
      setError(c.fileTooBig);
      return;
    }
    setFile(f);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!body.trim() || pending) return;
    setError("");
    setPending(true);
    try {
      const out = new FormData();
      out.set("body", body.trim());
      if (file) {
        const uploaded = await uploadFileToCloudBucket("messages", file);
        if (uploaded) {
          out.set("storagePath", uploaded.storagePath);
          out.set("fileName", uploaded.fileName);
          out.set("mimeType", uploaded.mimeType);
        } else {
          out.set("file", file);
        }
      }
      const token = getClientSessionToken();
      const res = await fetch("/api/messages/send", {
        method: "POST",
        body: out,
        headers: token ? { "x-session-token": token } : undefined,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error("send failed");
      setSent(true);
      setBody("");
      setFile(null);
      setTimeout(() => reloadWithSession(), 500);
    } catch {
      setError(locale === "ar" ? "تعذر إرسال الرسالة. حاول مرة أخرى." : "Could not send message. Please try again.");
      setPending(false);
    }
  }

  return (
    <Card className="p-5">
      <h2 className="mb-3 text-base font-bold text-slate-900 dark:text-white">
        {locale === "ar" ? "إرسال رسالة إلى المعلم" : "Send a message to your teacher"}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          rows={4}
          placeholder={c.writeMessage}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-navy-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />

        {file && (
          <div className="flex items-center gap-3 rounded-xl bg-blue-50 px-3.5 py-2.5 text-sm dark:bg-blue-500/10">
            <Icon name="file" className="h-5 w-5 text-blue-600" />
            <span className="min-w-0 flex-1 truncate font-semibold text-slate-800 dark:text-slate-100">{file.name}</span>
            <span className="text-xs text-slate-500">{formatBytes(file.size)}</span>
            <button type="button" onClick={() => setFile(null)} className="text-xs font-bold text-red-600 hover:underline">
              {c.removeFile}
            </button>
          </div>
        )}

        {error && <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-700">{error}</p>}
        {sent && <p className="rounded-xl bg-green-50 px-3.5 py-2 text-xs font-semibold text-green-700">{c.messageSent}</p>}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline">
            <Icon name="file" className="h-4 w-4" />
            {c.attachFile}
            <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
          <button
            type="submit"
            disabled={!body.trim() || pending}
            className="rounded-xl bg-navy-500 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-navy-600 disabled:opacity-50"
          >
            {pending ? c.sending : c.sendMessage}
          </button>
        </div>
      </form>
    </Card>
  );
}
