"use client";

import { useRef, useState } from "react";
import { useI18n } from "@/lib/i18n-client";
import {
  formatBytes,
  getClientSessionToken,
  GOOGLE_DRIVE_FOLDER_URL,
  MAX_FILE_BYTES,
  uploadFileToCloudBucket,
} from "@/lib/file-client";
import { Icon } from "./ui";
import { reloadWithSession } from "./shell/Shell";

export function SubmissionForm({ taskId }: { taskId: number }) {
  const { t, locale } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"supabase" | "drive">("supabase");
  const [file, setFile] = useState<File | null>(null);
  const [driveUrl, setDriveUrl] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  const pickFile = (picked?: File) => {
    setError("");
    setSaved(false);
    if (!picked) return;
    if (picked.size > MAX_FILE_BYTES) {
      setError(t("tasks.fileTooBig"));
      return;
    }
    setFile(picked);
  };

  const canSubmit =
    Boolean(mode === "supabase" ? file : driveUrl.trim()) || Boolean(note.trim());

  const submit = async () => {
    if (!canSubmit || pending) return;
    setError("");
    setSaved(false);
    setPending(true);
    try {
      const form = new FormData();
      form.set("note", note);

      if (mode === "supabase" && file) {
        const uploaded = await uploadFileToCloudBucket("submissions", file);
        if (uploaded) {
          form.set("storagePath", uploaded.storagePath);
          form.set("fileName", uploaded.fileName);
          form.set("mimeType", uploaded.mimeType);
        } else {
          form.set("file", file);
        }
      } else if (mode === "drive" && driveUrl.trim()) {
        form.set("fileUrl", driveUrl.trim());
        form.set("fileName", "Google Drive Submission");
      }

      const token = getClientSessionToken();
      const res = await fetch(`/api/tasks/${taskId}/submission`, {
        method: "POST",
        body: form,
        headers: token ? { "x-session-token": token } : undefined,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setError(data?.error === "file_too_big" ? t("tasks.fileTooBig") : t("common.errorGeneric"));
        setPending(false);
        return;
      }
      setSaved(true);
      setFile(null);
      setDriveUrl("");
      setTimeout(() => reloadWithSession(), 650);
    } catch {
      setError(t("common.errorGeneric"));
      setPending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
          {locale === "ar" ? "طريقة رفع الحل" : "Submission Storage"}
        </span>
        <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setMode("supabase")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              mode === "supabase"
                ? "bg-white text-navy-700 shadow-xs dark:bg-slate-900 dark:text-sky-300"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            <Icon name="cloud" className="h-4 w-4" />
            {locale === "ar" ? "رفع ملف (PDF / DOC / صورة)" : "Upload File (PDF / DOC / Image)"}
          </button>
          <button
            type="button"
            onClick={() => setMode("drive")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              mode === "drive"
                ? "bg-white text-navy-700 shadow-xs dark:bg-slate-900 dark:text-sky-300"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            <Icon name="drive" className="h-4 w-4" />
            Google Drive
          </button>
        </div>
      </div>

      {mode === "supabase" ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            pickFile(e.dataTransfer.files[0]);
          }}
          className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/70 px-6 py-8 text-center transition hover:border-navy-400 dark:border-slate-700 dark:bg-slate-800/40"
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.md,image/*"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0])}
          />
          {file ? (
            <div className="space-y-2">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                <Icon name="check" className="h-6 w-6" />
              </div>
              <p className="font-bold text-slate-900 dark:text-white">{file.name}</p>
              <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="text-xs font-semibold text-navy-500 hover:underline dark:text-sky-400"
              >
                {t("common.change")}
              </button>
            </div>
          ) : (
            <>
              <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-navy-500/10 text-navy-600 dark:bg-white/10 dark:text-sky-300">
                <Icon name="upload" className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{t("tasks.uploadHint")}</p>
              <p className="mt-1 text-xs text-slate-400">
                {locale === "ar" ? "PDF أو DOC أو صورة حتى 25 ميجابايت" : "PDF, DOC, DOCX, or image up to 25 MB"}
              </p>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="rounded-xl bg-navy-500 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-navy-600"
                >
                  {t("tasks.uploadFile")}
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/50">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              {locale === "ar"
                ? "الصق رابط ملفك على Google Drive (PDF أو Google Docs)"
                : "Paste your Google Drive file or Google Docs link"}
            </p>
            <a
              href={GOOGLE_DRIVE_FOLDER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-navy-700 shadow-xs ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-sky-300 dark:ring-slate-700"
            >
              <Icon name="drive" className="h-4 w-4" />
              {locale === "ar" ? "فتح مجلد Google Drive" : "Open Drive Folder"}
            </a>
          </div>
          <input
            type="url"
            value={driveUrl}
            onChange={(e) => setDriveUrl(e.target.value)}
            placeholder="https://drive.google.com/file/d/..."
            dir="ltr"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-navy-500 dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          {locale === "ar" ? "ملاحظاتك أو إجابتك المكتوبة" : "Written Answer / Notes"}
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder={t("tasks.notePlaceholder")}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-navy-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800"
        />
      </div>

      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 dark:bg-red-500/10 dark:text-red-300">
          <span>{error}</span>
          {canSubmit && (
            <button type="button" onClick={submit} className="rounded-lg bg-red-600 px-3 py-1 text-xs font-bold text-white hover:bg-red-700">
              {t("common.retry")}
            </button>
          )}
        </div>
      )}
      {saved && (
        <p role="status" className="rounded-xl bg-green-50 px-4 py-2.5 text-sm font-medium text-green-700 dark:bg-green-500/10 dark:text-green-300">
          {t("tasks.submissionSaved")}
        </p>
      )}

      <button
        type="button"
        disabled={!canSubmit || pending}
        onClick={submit}
        className="w-full rounded-xl bg-green-600 py-3 font-bold text-white shadow-lg shadow-green-600/20 hover:bg-green-700 disabled:opacity-40 sm:w-auto sm:px-8"
      >
        {pending ? t("tasks.uploading") : t("tasks.submitWork")}
      </button>
    </div>
  );
}

export function RemoveSubmissionButton({ taskId }: { taskId: number }) {
  const { t } = useI18n();
  const [pending, setPending] = useState(false);

  const remove = async () => {
    setPending(true);
    try {
      const token = getClientSessionToken();
      await fetch(`/api/tasks/${taskId}/submission`, {
        method: "DELETE",
        headers: token ? { "x-session-token": token } : undefined,
      });
      reloadWithSession();
    } catch {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      disabled={pending}
      onClick={remove}
      className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
    >
      {t("tasks.removeSubmission")}
    </button>
  );
}

export function DownloadButton({
  url,
  label,
  compact = false,
}: {
  url: string;
  label: string;
  compact?: boolean;
}) {
  const [pending, setPending] = useState(false);

  const download = async () => {
    if (pending) return;
    setPending(true);
    try {
      const token = getClientSessionToken();
      const res = await fetch(url, {
        headers: token ? { "x-session-token": token } : undefined,
      });
      if (!res.ok) throw new Error("download failed");
      const blob = await res.blob();
      const disp = res.headers.get("content-disposition") ?? "";
      const match = disp.match(/filename="?([^";]+)"?/i);
      const filename = match?.[1] || "download";
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } finally {
      setPending(false);
    }
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={download}
        disabled={pending}
        aria-label={label || "Download"}
        className="grid h-8 w-8 place-items-center rounded-lg text-blue-600 hover:bg-blue-50 disabled:opacity-50 dark:hover:bg-slate-800"
      >
        <Icon name="download" className="h-4 w-4" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={download}
      disabled={pending}
      className="flex shrink-0 items-center gap-1.5 rounded-lg bg-navy-500 px-3.5 py-2 text-xs font-bold text-white hover:bg-navy-600 disabled:opacity-60"
    >
      <Icon name="download" className="h-4 w-4" />
      {pending ? "…" : label}
    </button>
  );
}
