"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { AccountStatus } from "@/db/schema";
import type { Locale } from "@/lib/i18n";
import {
  quickSendStudentMessageAction,
  setStudentAccountStatusAction,
} from "@/lib/teacher-actions";
import { Icon } from "@/components/ui";
import { AccountStatusPill } from "./StatusPill";

type ClassOption = {
  id: number;
  name: string;
  nameAr: string;
  levelName?: string;
  levelNameAr?: string;
};

export function StudentModerationControls({
  studentId,
  studentName,
  studentGrade,
  currentStatus,
  currentClassId = null,
  currentNote = "",
  classes = [],
  locale,
  compact = false,
}: {
  studentId: number;
  studentName: string;
  studentGrade: string;
  currentStatus: AccountStatus;
  currentClassId?: number | null;
  currentNote?: string;
  classes?: ClassOption[];
  locale: Locale;
  compact?: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<AccountStatus>(currentStatus);
  const [classId, setClassId] = useState<string>(currentClassId ? String(currentClassId) : "");
  const [note, setNote] = useState(currentNote);
  const [msgOpen, setMsgOpen] = useState(false);
  const [msgBody, setMsgBody] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const applyStatus = (next: AccountStatus) => {
    setFeedback(null);
    startTransition(async () => {
      const res = await setStudentAccountStatusAction({
        studentId,
        status: next,
        note,
        ...(classes.length > 0 ? { classId: classId ? Number(classId) : null } : {}),
      });
      if (res.ok) {
        setStatus(next);
        setFeedback(
          next === "approved"
            ? locale === "ar"
              ? "تمت الموافقة على حساب الطالب وإشعاره فوراً."
              : "Student approved and notified."
            : next === "suspended"
              ? locale === "ar"
                ? "تم إيقاف حساب الطالب مؤقتاً."
                : "Student account suspended."
              : next === "blocked"
                ? locale === "ar"
                  ? "تم حظر حساب الطالب وإلغاء جلسته."
                  : "Student account blocked."
                : locale === "ar"
                  ? "تم تحديث حالة الحساب."
                  : "Status updated.",
        );
        router.refresh();
      }
    });
  };

  const sendQuickMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgBody.trim()) return;
    setFeedback(null);
    startTransition(async () => {
      const res = await quickSendStudentMessageAction(studentId, msgBody);
      if (res.ok) {
        setMsgBody("");
        setMsgOpen(false);
        setFeedback(
          locale === "ar"
            ? `تم إرسال الرسالة إلى ${studentName.split(" ")[0]}.`
            : `Message sent to ${studentName.split(" ")[0]}.`,
        );
        router.refresh();
      }
    });
  };

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {status !== "approved" && (
            <button
              type="button"
              disabled={pending}
              onClick={() => applyStatus("approved")}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 disabled:opacity-50"
            >
              <Icon name="check" className="h-3.5 w-3.5" />
              {locale === "ar" ? "موافقة" : "Approve"}
            </button>
          )}
          {status !== "suspended" && (
            <button
              type="button"
              disabled={pending}
              onClick={() => applyStatus("suspended")}
              className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2.5 py-1.5 text-xs font-bold text-amber-900 transition hover:bg-amber-200 disabled:opacity-50 dark:bg-amber-500/20 dark:text-amber-200"
            >
              {locale === "ar" ? "إيقاف" : "Suspend"}
            </button>
          )}
          {status !== "blocked" && (
            <button
              type="button"
              disabled={pending}
              onClick={() => applyStatus("blocked")}
              className="inline-flex items-center gap-1 rounded-lg bg-red-100 px-2.5 py-1.5 text-xs font-bold text-red-700 transition hover:bg-red-200 disabled:opacity-50 dark:bg-red-500/20 dark:text-red-300"
            >
              {locale === "ar" ? "حظر" : "Block"}
            </button>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={() => setMsgOpen((v) => !v)}
            className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100 dark:bg-blue-500/15 dark:text-blue-300"
          >
            <Icon name="mail" className="h-3.5 w-3.5" />
            {locale === "ar" ? "رسالة" : "Message"}
          </button>
        </div>

        {msgOpen && (
          <form onSubmit={sendQuickMessage} className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={msgBody}
              onChange={(e) => setMsgBody(e.target.value)}
              placeholder={
                locale === "ar"
                  ? `اكتب رسالة سريعة إلى ${studentName.split(" ")[0]}...`
                  : `Quick message to ${studentName.split(" ")[0]}...`
              }
              className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
            <button
              type="submit"
              disabled={pending || !msgBody.trim()}
              className="rounded-lg bg-navy-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-navy-600 disabled:opacity-50"
            >
              {locale === "ar" ? "إرسال" : "Send"}
            </button>
          </form>
        )}

        {feedback && (
          <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">{feedback}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border-2 border-navy-500/15 bg-gradient-to-br from-white via-slate-50/70 to-sky-50/40 p-5 dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/70">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
            {locale === "ar"
              ? "حالة اعتماد الحساب وإجراءات المعلم"
              : "Account Approval & Moderation"}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {locale === "ar"
              ? `الصف المختار عند التسجيل: ${studentGrade} — يمكنك الموافقة أو الإيقاف المؤقت أو الحظر أو إرسال رسالة مباشرة.`
              : `Selected signup grade: ${studentGrade} — approve for full access, suspend, block, or send a direct message.`}
          </p>
        </div>
        <AccountStatusPill status={status} locale={locale} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {classes.length > 0 && (
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">
              {locale === "ar" ? "تسكين الطالب في فصل دراسي (اختياري)" : "Assign Class Section (optional)"}
            </span>
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              <option value="">
                {locale === "ar" ? `بدون فصل محدد (${studentGrade})` : `Grade only (${studentGrade})`}
              </option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {locale === "ar" ? cls.nameAr || cls.name : cls.name}
                  {cls.levelName ? ` — ${locale === "ar" ? cls.levelNameAr || cls.levelName : cls.levelName}` : ""}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="block">
          <span className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">
            {locale === "ar"
              ? "ملاحظة للطالب (تظهر في إشعار الحالة)"
              : "Note to Student (included in status notification)"}
          </span>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              locale === "ar"
                ? "مثال: مرحباً بك في الصف العاشر! تم تفعيل حسابك."
                : "e.g. Welcome to Grade 10! Your account is now active."
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          disabled={pending}
          onClick={() => applyStatus("approved")}
          className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-extrabold shadow-xs transition disabled:opacity-50 ${
            status === "approved"
              ? "bg-emerald-600 text-white ring-2 ring-emerald-300"
              : "bg-emerald-600 text-white hover:bg-emerald-700"
          }`}
        >
          <Icon name="check" className="h-4 w-4" />
          {status === "approved"
            ? locale === "ar"
              ? "حفظ التغييرات / معتمد"
              : "Approved (Save Changes)"
            : locale === "ar"
              ? "موافقة وتفعيل الحساب"
              : "Approve Student"}
        </button>

        <button
          type="button"
          disabled={pending}
          onClick={() => applyStatus("suspended")}
          className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-extrabold transition disabled:opacity-50 ${
            status === "suspended"
              ? "bg-amber-500 text-white ring-2 ring-amber-300"
              : "bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-500/20 dark:text-amber-200"
          }`}
        >
          <Icon name="clock" className="h-4 w-4" />
          {locale === "ar" ? "إيقاف مؤقت" : "Suspend"}
        </button>

        <button
          type="button"
          disabled={pending}
          onClick={() => applyStatus("blocked")}
          className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-extrabold transition disabled:opacity-50 ${
            status === "blocked"
              ? "bg-red-600 text-white ring-2 ring-red-300"
              : "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-500/20 dark:text-red-300"
          }`}
        >
          <Icon name="lock" className="h-4 w-4" />
          {locale === "ar" ? "حظر الحساب" : "Block"}
        </button>

        <button
          type="button"
          disabled={pending}
          onClick={() => setMsgOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-xs transition hover:bg-blue-700"
        >
          <Icon name="mail" className="h-4 w-4" />
          {locale === "ar" ? "إرسال رسالة سريعة" : "Send Quick Message"}
        </button>

        <Link
          href={`/students/${studentId}/message`}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          {locale === "ar" ? "رسالة مع مرفق" : "Full Composer"}
        </Link>
      </div>

      {msgOpen && (
        <form onSubmit={sendQuickMessage} className="space-y-2 rounded-xl border border-blue-200 bg-blue-50/60 p-3.5 dark:border-blue-800/60 dark:bg-blue-950/30">
          <textarea
            rows={2}
            value={msgBody}
            onChange={(e) => setMsgBody(e.target.value)}
            placeholder={
              locale === "ar"
                ? `اكتب رسالتك إلى ${studentName}...`
                : `Write a direct message to ${studentName}...`
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setMsgOpen(false)}
              className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200/60 dark:text-slate-300"
            >
              {locale === "ar" ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={pending || !msgBody.trim()}
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-extrabold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {locale === "ar" ? "إرسال الآن" : "Send Message"}
            </button>
          </div>
        </form>
      )}

      {feedback && (
        <p className="rounded-xl bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
          {feedback}
        </p>
      )}
    </div>
  );
}
