import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireTeacher } from "@/lib/roles";
import { getI18n } from "@/lib/i18n-server";
import { fmtDate } from "@/lib/i18n";
import { tt } from "@/lib/i18n-teacher";
import { getStudentDetail } from "@/lib/queries-teacher";
import { TopBar } from "@/components/shell/TopBar";
import { Avatar, BackArrow, Badge, Card, Icon } from "@/components/ui";
import { MessageForm } from "@/components/teacher/MessageForm";
import { DownloadButton } from "@/components/TaskSubmissionForm";

export const metadata: Metadata = { title: "Message Student" };

export default async function StudentMessagePage({ params }: { params: Promise<{ id: string }> }) {
  await requireTeacher();
  const { id } = await params;
  const { locale } = await getI18n();
  const c = tt(locale);
  const detail = await getStudentDetail(Number(id));
  if (!detail) notFound();

  return (
    <>
      <TopBar title={c.navStudents} />
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 px-2">
          <div className="flex items-center gap-3">
            <Avatar name={detail.student.fullName} src={detail.student.avatarUrl} size={48} />
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{c.messageStudentParent}</h1>
              <p className="text-sm text-slate-500">{detail.student.fullName} · {detail.student.grade}</p>
            </div>
          </div>
          <Link href={`/students/${detail.student.id}`} className="text-sm font-bold text-blue-600 hover:underline"><BackArrow /> {c.studentProfile}</Link>
        </div>

        <MessageForm studentId={detail.student.id} />

        <Card className="overflow-hidden">
          <h2 className="border-b border-slate-200 px-5 py-4 text-lg font-bold text-slate-900 dark:border-slate-700 dark:text-white">{c.sentMessages}</h2>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {detail.messages.length === 0 && <li className="p-8 text-center text-sm text-slate-500">{c.noMessages}</li>}
            {detail.messages.map((m) => (
              <li key={m.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-500">{fmtDate(locale, m.createdAt)} · {m.recipientType === "parent" ? c.parentRecipient : c.studentRecipient}</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-200">{m.body}</p>
                  </div>
                  <Badge tone={m.readAt ? "done" : "todo"}>{m.readAt ? c.read : c.unread}</Badge>
                  {m.attachmentName && (
                    <DownloadButton url={`/api/messages/${m.id}/attachment`} label={m.attachmentName} compact />
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
