"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n-client";
import { MAX_FILE_BYTES, formatBytes } from "@/lib/file-client";
import { Icon } from "@/components/ui";
import { reloadWithSession } from "@/components/shell/Shell";

type Phase = "idle" | "uploading" | "done" | "error";

function resolveSessionToken(): string {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  return (
    params.get("session") ||
    localStorage.getItem("insci_session") ||
    sessionStorage.getItem("insci_session") ||
    ""
  );
}

export function SubmissionForm({ taskId }: { taskId: number }) {
  const { t } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [fileError, setFileError] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  useEffect(() => () => xhrRef.current?.abort(), []);

  function pick(f: File | undefined) {
    setFileError("");
    setErrorMsg("");
    setPhase("idle");
    if (!f) return;
    if (f.size > MAX_FILE_BYTES) {
      setFile(null);
      setFileError(t("tasks.fileTooBig"));
      return;
    }
    setFile(f);
  }

  function attachSampleWorksheet() {
    setFileError("");
    const body = [
      "in science — Completed Student Worksheet",
      `Task ID: ${taskId}`,
      `Submitted: ${new Date().toLocaleString()}`,
      "----------------------------------------",
      "Answer 1: Completed all calculations and verified units.",
      "Answer 2: Labeled all diagrams and balanced equations.",
      "Answer 3: Summary conclusion written in the notes.",
    ].join("\n");
    setFile(new File([body], `task-${taskId}-completed-worksheet.txt`, { type: "text/plain" }));
  }

  function upload() {
    if (!file && !note.trim()) return;
    setPhase("uploading");
    setProgress(0);
    setErrorMsg("");

    const form = new FormData();
    if (file) form.append("file", file);
    form.append("note", note.trim());

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.open("POST", `/api/tasks/${taskId}/submission`);
    const token = resolveSessionToken();
    if (token) xhr.setRequestHeader("x-session-token", token);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText || "{}");
        if (xhr.status >= 200 && xhr.status < 300 && data.ok) {
          setPhase("done");
          setProgress(100);
          setTimeout(() => reloadWithSession(), 700);
          return;
        }
        if (data.error === "file_too_big") setErrorMsg(t("tasks.fileTooBig"));
        else if (xhr.status === 401) setErrorMsg(t("errors.invalidCredentials"));
        else setErrorMsg(t("common.errorGeneric"));
      } catch {
        setErrorMsg(t("common.errorGeneric"));
      }
      setPhase("error");
    };
    xhr.onerror = () => {
      setErrorMsg(t("common.errorGeneric"));
      setPhase("error");
    };
    xhr.onabort = () => setPhase("idle");
    xhr.send(form);
  }

  const canSubmit = Boolean(file || note.trim()) && phase !== "uploading" && phase !== "done";

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pick(e.dataTransfer.files?.[0]);
        }}
        className={`flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition ${
          dragging
            ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10"
            : "border-slate-300 bg-slate-50/50 hover:border-blue-400 hover:bg-blue-50/50 dark:border-slate-700 dark:bg-slate-800/40 dark:hover:border-blue-500"
        }`}
      >
        <input ref={inputRef} type="file" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
        <span className="grid h-14 w-14 place-items-center rounded-full bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-300">
          <Icon name="upload" className="h-7 w-7" />
        </span>
        <span className="text-lg font-bold text-slate-900 dark:text-white">
          {file ? file.name : t("tasks.noSubmission")}
        </span>
        <span className="text-sm text-slate-500">
          {file
            ? `${formatBytes(file.size)} / ${formatBytes(MAX_FILE_BYTES)}`
            : t("tasks.uploadHint")}
        </span>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-600"
          >
            <Icon name="file" className="h-4 w-4" />
            {t("tasks.uploadFile")}
          </button>
          <button
            type="button"
            onClick={attachSampleWorksheet}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
          >
            📄 {t("common.attachSample")}
          </button>
        </div>
      </div>
      {fileError && <p className="text-sm font-semibold text-red-600">{fileError}</p>}
      <textarea
        rows={3}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={t("tasks.notePlaceholder")}
        className="w-full rounded-xl border border-slate-300 bg-transparent px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:text-white"
      />
      {phase === "uploading" && (
        <div aria-live="polite">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1.5 text-center text-xs font-semibold text-slate-500">
            {t("tasks.uploading")} {progress}%
          </p>
        </div>
      )}
      {phase === "done" && (
        <p className="rounded-xl bg-green-50 px-4 py-2.5 text-sm font-semibold text-green-700 dark:bg-green-500/10 dark:text-green-300">
          {t("tasks.submissionSaved")}
        </p>
      )}
      {phase === "error" && (
        <div className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 dark:bg-red-500/10 dark:text-red-300">
          <p>{errorMsg}</p>
          <button
            type="button"
            onClick={upload}
            className="mt-1 font-bold underline underline-offset-2"
          >
            {t("common.retry")}
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={upload}
        disabled={!canSubmit}
        className="w-full rounded-xl bg-navy-500 py-3 text-sm font-bold text-white shadow hover:bg-navy-600 disabled:opacity-50"
      >
        {phase === "uploading" ? t("tasks.uploading") : t("tasks.submitWork")}
      </button>
    </div>
  );
}

export function RemoveSubmissionButton({ taskId }: { taskId: number }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (busy) return;
    setBusy(true);
    try {
      const token = resolveSessionToken();
      const res = await fetch(`/api/tasks/${taskId}/submission`, {
        method: "DELETE",
        headers: token ? { "x-session-token": token } : undefined,
      });
      if (res.ok) reloadWithSession();
    } catch {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={busy}
      className="rounded-lg px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-500/10"
    >
      {busy ? "…" : t("tasks.removeSubmission")}
    </button>
  );
}

export function DownloadButton({ url, label, compact = false }: { url: string; label: string; compact?: boolean }) {
  const [busy, setBusy] = useState(false);

  const go = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const token = resolveSessionToken();
      const res = await fetch(url, { headers: token ? { "x-session-token": token } : {} });
      if (!res.ok) throw new Error("download failed");
      const blob = await res.blob();
      const disp = res.headers.get("content-disposition") || "";
      const m = /filename="([^"]+)"/.exec(disp);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = m?.[1] ?? "download";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } catch {
      // ignore
    } finally {
      setBusy(false);
    }
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={go}
        disabled={busy}
        aria-label={label || "Download"}
        title={label || "Download"}
        className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-blue-600 disabled:opacity-50 dark:hover:bg-slate-800"
      >
        <Icon name="download" className="h-5 w-5" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={go}
      disabled={busy}
      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-blue-600 transition hover:bg-slate-200 disabled:opacity-60 dark:bg-slate-800 dark:text-blue-400"
    >
      <Icon name="download" className="h-4 w-4" />
      {label}
    </button>
  );
}
