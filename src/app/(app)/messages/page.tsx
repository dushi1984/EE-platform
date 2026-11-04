import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/session";
import { getI18n } from "@/lib/i18n-server";
import { fmtDate } from "@/lib/i18n";
import { tt } from "@/lib/i18n-teacher";
import { getMessagesForUser } from "@/lib/queries-teacher";
import { markMessageReadAction } from "@/lib/teacher-actions";
import { TopBar } from "@/components/shell/TopBar";
import { Avatar, Badge, Card, Icon } from "@/components/ui";
import { DownloadButton } from "@/components/TaskSubmissionForm";
import { StudentMessageComposer } from "@/components/StudentMessageComposer";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { locale } = await getI18n();
  const c = tt(locale);
  const rows = await getMessagesForUser(user.id, user.role);
  const teacher = user.role === "teacher";

  return (
    <>
      <TopBar title={c.messages} />

      {!teacher && <StudentMessageComposer />}

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">{teacher ? c.sentMessages : c.inbox}</h1>
            <p className="text-sm text-slate-500">{rows.length} {c.messages.toLowerCase()}</p>
          </div>
          {teacher && (
            <Link href="/students" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700">
              <Icon name="mail" className="h-5 w-5" /> {c.sendMessage}
            </Link>
          )}
        </div>
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.length === 0 && <li className="p-12 text-center text-sm text-slate-500">{c.noMessages}</li>}
          {rows.map((m) => {
            const fromStudent = m.senderId === m.studentId;
            return (
              <li key={m.id} className={`px-5 py-4 ${!m.readAt && ((teacher && fromStudent) || (!teacher && !fromStudent)) ? "bg-blue-50/70 dark:bg-blue-500/10" : ""}`}>
                <div className="flex items-start gap-3">
                  <Avatar
                    name={teacher ? m.student.fullName : m.sender.fullName}
                    src={teacher ? m.student.avatarUrl : m.sender.avatarUrl}
                    size={42}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-bold text-slate-900 dark:text-white">
                        {teacher
                          ? fromStudent
                            ? `${c.from}: ${m.student.fullName}`
                            : `${c.recipient}: ${m.student.fullName}`
                          : fromStudent
                            ? `${c.from}: ${m.sender.fullName}`
                            : `${c.from}: ${m.sender.fullName}`}
                      </p>
                      <span className="text-xs text-slate-400">{fmtDate(locale, m.createdAt)}</span>
                    </div>
                    {teacher && (
                      <p className="text-xs font-semibold text-blue-600">
                        {fromStudent
                          ? locale === "ar"
                            ? "رسالة واردة من الطالب"
                            : "Incoming from student"
                          : m.recipientType === "parent"
                            ? c.parentRecipient
                            : c.studentRecipient}
                      </p>
                    )}
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">{m.body}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {m.attachmentName && (
                        <DownloadButton url={`/api/messages/${m.id}/attachment`} label={m.attachmentName} />
                      )}
                      {!m.readAt && (
                        <form action={markMessageReadAction}>
                          <input type="hidden" name="messageId" value={m.id} />
                          <button className="rounded-lg bg-green-100 px-3 py-1.5 text-xs font-bold text-green-700 hover:bg-green-200">{c.markRead}</button>
                        </form>
                      )}
                      {teacher && (
                        <Link
                          href={`/students/${m.studentId}/message`}
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-navy-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-sky-300"
                        >
                          <Icon name="reply" className="h-3.5 w-3.5" />
                          {locale === "ar" ? "رد" : "Reply"}
                        </Link>
                      )}
                      <Badge tone={m.readAt ? "done" : "todo"}>{m.readAt ? c.read : c.unread}</Badge>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </>
  );
}
