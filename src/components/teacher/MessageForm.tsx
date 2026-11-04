"use client";

import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n-client";
import {
  formatBytes,
  getClientSessionToken,
  MAX_FILE_BYTES,
  uploadFileToCloudBucket,
} from "@/lib/file-client";
import { tt } from "@/lib/i18n-teacher";
import { Icon } from "@/components/ui";
import { reloadWithSession } from "@/components/shell/Shell";

export function MessageForm({ studentId }: { studentId: number }) {
  const { locale } = useI18n();
  const c = tt(locale);
  const [recipient, setRecipient] = useState<"student" | "parent">("student");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

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
    setPending(true);
    try {
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
      setTimeout(() => reloadWithSession(), 600);
    } catch {
      setError(locale === "ar" ? "تعذر إرسال الرسالة. حاول مرة أخرى." : "Could not send the message. Please try again.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-slate-300 bg-white/90 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/90 sm:p-7">
      <input type="hidden" name="studentId" value={studentId} />
      <input type="hidden" name="recipientType" value={recipient} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-bold text-slate-900 dark:text-white">{c.to}:</span>
        <div className="flex items-center gap-5">
          {(["parent", "student"] as const).map((r) => (
            <label key={r} className="flex cursor-pointer items-center gap-2 font-bold text-slate-900 dark:text-white">
              <input type="radio" checked={recipient === r} onChange={() => setRecipient(r)} className="h-5 w-5 accent-navy-500" />
              {r === "parent" ? c.parent : c.student}
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[105px_1fr]">
        <label htmlFor="message-body" className="pt-3 font-bold text-slate-900 dark:text-white">{c.messages.toLowerCase()}:</label>
        <textarea
          id="message-body"
          name="body"
          required
          rows={7}
          placeholder={c.writeMessage}
          className="w-full rounded-2xl border border-slate-300 bg-slate-100/80 px-4 py-3 text-base text-slate-900 outline-none placeholder:font-semibold placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        />
      </div>

      {file ? (
        <div className="flex items-center gap-3 rounded-xl bg-blue-50 px-4 py-3 dark:bg-blue-500/10">
          <Icon name="file" className="h-6 w-6 text-blue-600" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-slate-800 dark:text-slate-100">{file.name}</p>
            <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
          </div>
          <button type="button" onClick={() => setFile(null)} className="text-xs font-bold text-red-600">{c.removeFile}</button>
        </div>
      ) : null}
      {fileError && <p className="text-sm font-semibold text-red-600">{fileError}</p>}
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
      {sent && <p className="rounded-xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">{c.messageSent}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 text-lg font-medium text-blue-600 hover:underline">
          <Icon name="file" className="h-6 w-6" />
          {c.attachFile}
          <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
        <span className="flex-1" />
        <Link href={`/students/${studentId}`} className="rounded-2xl border border-slate-300 px-8 py-3 text-base font-medium text-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800">{c.cancel}</Link>
        <button disabled={pending} className="rounded-2xl bg-blue-500 px-8 py-3 text-lg font-medium text-white shadow-lg shadow-blue-500/20 hover:bg-blue-600 disabled:opacity-60">
          {pending ? c.sending : c.sendMessage}
        </button>
      </div>
    </form>
  );
}
