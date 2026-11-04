"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { saveMaterialAction } from "@/lib/teacher-actions";
import { useI18n } from "@/lib/i18n-client";
import {
  formatBytes,
  GOOGLE_DRIVE_FOLDER_URL,
  MAX_FILE_BYTES,
  uploadFileToCloudBucket,
} from "@/lib/file-client";
import { tt } from "@/lib/i18n-teacher";
import { Icon } from "@/components/ui";
import { navigateWithSession } from "@/components/shell/Shell";

export type MaterialFormValues = {
  id?: number;
  title: string;
  titleAr: string;
  description: string;
  kind: string;
  priceCents: number;
  published: boolean;
  thumbnailUrl: string;
  subjectId: number;
  fileSize: string | null;
  fileName?: string | null;
  fileUrl?: string | null;
  storagePath?: string | null;
  mimeType?: string | null;
  videoUrl: string;
  content: string;
};

type SubjectOpt = { id: number; name: string; nameAr: string; icon: string };
type TermOpt = { id: number; name: string; nameAr: string; isActive: boolean };

export function MaterialForm({
  subjects,
  terms = [],
  initial,
}: {
  subjects: SubjectOpt[];
  terms?: TermOpt[];
  initial: (MaterialFormValues & { termId?: number | null }) | null;
}) {
  const { locale } = useI18n();
  const c = tt(locale);
  const activeTerm = terms.find((tm) => tm.isActive) ?? terms[0] ?? null;

  const [kind, setKind] = useState(initial?.kind ?? "pdf");
  const [storageMode, setStorageMode] = useState<"supabase" | "drive">(
    initial?.fileUrl && !initial?.storagePath ? "drive" : "supabase",
  );
  const [fileSize, setFileSize] = useState(initial?.fileSize ?? "");
  const [fileName, setFileName] = useState(initial?.fileName ?? "");
  const [storagePath, setStoragePath] = useState(initial?.storagePath ?? "");
  const [mimeType, setMimeType] = useState(initial?.mimeType ?? "");
  const [fileUrl, setFileUrl] = useState(initial?.fileUrl ?? "");
  const [pickedFile, setPickedFile] = useState<File | null>(null);

  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();

  const label = "mb-1.5 block text-sm font-bold text-slate-800 dark:text-slate-100";
  const field =
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white";

  function onFilePick(f?: File) {
    setError("");
    if (!f) return;
    if (f.size > MAX_FILE_BYTES) {
      setError(c.fileTooBig);
      return;
    }
    setPickedFile(f);
    setFileName(f.name);
    setFileSize(formatBytes(f.size));
    const lower = f.name.toLowerCase();
    if (lower.endsWith(".doc") || lower.endsWith(".docx")) {
      setKind("doc");
    } else if (lower.endsWith(".pdf")) {
      setKind("pdf");
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const formEl = e.currentTarget;
    const fd = new FormData(formEl);

    if (storageMode === "supabase" && pickedFile) {
      setUploading(true);
      try {
        const uploaded = await uploadFileToCloudBucket("materials", pickedFile);
        if (!uploaded) {
          setError(
            locale === "ar"
              ? "تعذر رفع الملف إلى سحابة Supabase. يمكنك لصق رابط Google Drive بدلاً منه."
              : "Could not upload to Supabase files bucket. Try pasting a Google Drive link instead.",
          );
          setUploading(false);
          return;
        }
        fd.set("storagePath", uploaded.storagePath);
        fd.set("fileName", uploaded.fileName);
        fd.set("mimeType", uploaded.mimeType);
        fd.set("fileSize", formatBytes(uploaded.sizeBytes));
        fd.set("fileUrl", "");
        setStoragePath(uploaded.storagePath);
        setMimeType(uploaded.mimeType);
      } catch {
        setError(locale === "ar" ? "فشل رفع الملف. حاول مرة أخرى." : "Upload failed. Please try again.");
        setUploading(false);
        return;
      }
      setUploading(false);
    } else if (storageMode === "supabase") {
      fd.set("storagePath", storagePath);
      fd.set("fileName", fileName);
      fd.set("mimeType", mimeType);
      fd.set("fileSize", fileSize);
    } else {
      fd.set("fileUrl", fileUrl.trim());
      fd.set("fileName", fileName.trim() || (fileUrl.trim() ? "Google Drive Document" : ""));
      fd.set("storagePath", "");
    }

    startTransition(async () => {
      const r = await saveMaterialAction(null, fd);
      if (!r || r.error) {
        setError(r?.error || c.titleShort);
        return;
      }
      navigateWithSession(r.redirectTo || "/materials");
    });
  }

  const busy = uploading || pending;

  return (
    <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-6">
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="fileSize" value={fileSize} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>{c.matTitle}</label>
          <input name="title" required minLength={3} defaultValue={initial?.title ?? ""} className={field} />
        </div>
        <div>
          <label className={label}>{c.matTitleAr}</label>
          <input name="titleAr" defaultValue={initial?.titleAr ?? ""} dir="rtl" className={field} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className={label}>{c.matKind}</label>
          <select name="kind" value={kind} onChange={(e) => setKind(e.target.value)} className={field}>
            <option value="pdf">{c.pdf}</option>
            <option value="doc">{c.doc}</option>
            <option value="video">{c.video}</option>
          </select>
        </div>
        <div>
          <label className={label}>{c.subject}</label>
          <select name="subjectId" defaultValue={initial?.subjectId ?? subjects[0]?.id} className={field}>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {locale === "ar" ? s.nameAr : s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>{c.matStatus}</label>
          <select name="status" defaultValue={initial ? (initial.published ? "published" : "draft") : "published"} className={field}>
            <option value="published">{c.published}</option>
            <option value="draft">{c.draft}</option>
          </select>
        </div>
      </div>

      {terms.length > 0 && (
        <div>
          <label className={label}>{locale === "ar" ? "الفصل الدراسي" : "Academic Term"}</label>
          <select name="termId" defaultValue={initial?.termId ?? activeTerm?.id ?? ""} className={field}>
            {terms.map((tm) => (
              <option key={tm.id} value={tm.id}>
                {locale === "ar" ? tm.nameAr : tm.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>{c.matPrice}</label>
          <input
            name="priceEgp"
            type="number"
            min={0}
            step="1"
            defaultValue={initial ? Math.round(initial.priceCents / 100) : 0}
            className={field}
          />
        </div>
        <div>
          <label className={label}>{c.matThumb}</label>
          <input
            name="thumbnailUrl"
            defaultValue={initial?.thumbnailUrl ?? ""}
            placeholder="https://images.unsplash.com/..."
            className={field}
          />
        </div>
      </div>

      {/* Cloud Storage Upload (Supabase `files` bucket OR Google Drive) */}
      {kind !== "video" ? (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/40">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              {locale === "ar"
                ? "حفظ ملف الـ PDF أو DOC في السحابة"
                : "Save PDF / DOC in Cloud Storage"}
            </span>
            <div className="inline-flex rounded-xl bg-white p-1 shadow-xs ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
              <button
                type="button"
                onClick={() => setStorageMode("supabase")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  storageMode === "supabase"
                    ? "bg-navy-500 text-white"
                    : "text-slate-600 dark:text-slate-300"
                }`}
              >
                <Icon name="cloud" className="h-4 w-4" />
                {locale === "ar" ? "سحابة Supabase (files)" : "Supabase (files bucket)"}
              </button>
              <button
                type="button"
                onClick={() => setStorageMode("drive")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  storageMode === "drive"
                    ? "bg-navy-500 text-white"
                    : "text-slate-600 dark:text-slate-300"
                }`}
              >
                <Icon name="drive" className="h-4 w-4" />
                Google Drive
              </button>
            </div>
          </div>

          {storageMode === "supabase" ? (
            <div className="space-y-2">
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white px-5 py-6 text-center transition hover:border-blue-400 dark:border-slate-700 dark:bg-slate-900">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.md"
                  className="hidden"
                  onChange={(e) => onFilePick(e.target.files?.[0])}
                />
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300">
                  <Icon name={pickedFile || storagePath ? "check" : "upload"} className="h-5 w-5" />
                </span>
                <p className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                  {pickedFile
                    ? pickedFile.name
                    : fileName
                      ? `${fileName} (${locale === "ar" ? "محفوظ في السحابة" : "saved in cloud"})`
                      : locale === "ar"
                        ? "اضغط لاختيار ملف PDF أو DOC أو DOCX"
                        : "Click to select PDF, DOC, or DOCX"}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {fileSize
                    ? `${c.fileSize}: ${fileSize}`
                    : locale === "ar"
                      ? "يُحفظ مباشرة في حاوية files في Supabase · حتى 25 ميجابايت"
                      : "Stored directly in Supabase Storage `files` bucket · up to 25 MB"}
                </p>
              </label>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {locale === "ar"
                    ? "ارفع ملف الـ PDF أو DOC إلى مجلد Google Drive ثم الصق رابط الملف"
                    : "Upload your PDF or DOC to the platform Google Drive folder, then paste its link"}
                </p>
                <a
                  href={GOOGLE_DRIVE_FOLDER_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-navy-700 shadow-xs ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-sky-300 dark:ring-slate-700"
                >
                  <Icon name="drive" className="h-4 w-4" />
                  {locale === "ar" ? "فتح مجلد Google Drive" : "Open Google Drive Folder"}
                </a>
              </div>
              <input
                type="url"
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                placeholder="https://drive.google.com/file/d/..."
                dir="ltr"
                className={field}
              />
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder={
                  locale === "ar"
                    ? "اسم الملف المعروض (مثال: ملخص-الفيزياء.pdf)"
                    : "Display file name (e.g. physics-notes.pdf)"
                }
                className={field}
              />
            </div>
          )}
        </div>
      ) : (
        <div>
          <label className={label}>{c.matVideo}</label>
          <input
            name="videoUrl"
            defaultValue={initial?.videoUrl ?? ""}
            placeholder="https://www.youtube.com/embed/..."
            className={field}
          />
        </div>
      )}

      <div>
        <label className={label}>{c.description}</label>
        <textarea name="description" rows={3} defaultValue={initial?.description ?? ""} className={field} />
      </div>

      <div>
        <label className={label}>{c.matContent}</label>
        <textarea name="content" rows={7} defaultValue={initial?.content ?? ""} className={`${field} font-mono`} />
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Link
          href="/materials"
          className="rounded-xl border border-slate-300 px-6 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200"
        >
          {c.cancel}
        </Link>
        <button
          disabled={busy}
          className="rounded-xl bg-blue-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-600 disabled:opacity-60"
        >
          {uploading
            ? locale === "ar"
              ? "جارٍ الرفع إلى السحابة…"
              : "Uploading to cloud…"
            : pending
              ? c.saving
              : c.save}
        </button>
      </div>
    </form>
  );
}
