import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import QRCode from "qrcode";
import { getCurrentUser } from "@/lib/session";
import { getI18n } from "@/lib/i18n-server";
import { canAccessStudentPage, firstAllowedPath, getAccessPolicy, normalizeAccountStatus } from "@/lib/access";
import { TopBar } from "@/components/shell/TopBar";
import { BackArrow, Badge, Card, ForwardArrow } from "@/components/ui";
import { ContactForm, NameForm, NotificationsForm, PasswordForm, PhotoForm } from "@/components/ProfileForms";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const [user, policy, { t, locale }] = await Promise.all([
    getCurrentUser(),
    getAccessPolicy(),
    getI18n(),
  ]);
  if (!user) redirect("/login");
  const accountStatus = user.role === "student" ? normalizeAccountStatus(user.accountStatus) : "approved";
  const backHref = user.role === "student" ? firstAllowedPath(user, policy) : "/dashboard";

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const loginUrl = `${proto}://${host}/api/auth/qr?token=${encodeURIComponent(user.qrToken)}`;
  const qrSvg = await QRCode.toString(loginUrl, { type: "svg", margin: 1, width: 180, color: { dark: "#1c2f66", light: "#ffffff" } });

  return (
    <>
      <TopBar title={t("profile.title")} />

      <div className="flex flex-wrap items-center gap-4 px-2">
        <Link href={backHref} className="text-sm font-bold text-navy-500 hover:underline dark:text-sky-300">
          <BackArrow /> {t("dashboard.title")}
        </Link>
        {user.role === "student" && canAccessStudentPage(user, "grades", policy) && (
          <Link href="/grades" className="text-sm font-bold text-navy-500 hover:underline dark:text-sky-300">
            {t("grades.title")} <ForwardArrow />
          </Link>
        )}
        {user.role === "student" && canAccessStudentPage(user, "materials", policy) && (
          <Link href="/materials" className="text-sm font-bold text-navy-500 hover:underline dark:text-sky-300">
            {t("materials.title")} <ForwardArrow />
          </Link>
        )}
      </div>

      <Card className="px-6">
        <SectionHeader>{t("profile.section")}</SectionHeader>
        <Row label={t("profile.yourPhoto")} hint={t("profile.yourPhotoHint")}>
          <PhotoForm name={user.fullName} avatarUrl={user.avatarUrl} />
        </Row>
        <Row label={t("profile.personalInfo")} hint={t("profile.personalInfoHint")} last>
          <NameForm fullName={user.fullName} />
        </Row>
      </Card>

      <Card className="px-6">
        <SectionHeader>{t("profile.account")}</SectionHeader>
        <Row label={t("profile.emailPhone")}>
          <ContactForm email={user.email} phone={user.phone} parentPhone={user.parentPhone} />
        </Row>
        <Row label={t("common.studentId")}>
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-mono text-slate-700 dark:text-slate-200">{user.studentCode}</p>
            {user.role === "student" && (
              <>
                <Badge tone="todo">{user.grade}</Badge>
                <Badge tone={accountStatus === "approved" ? "done" : accountStatus === "pending" ? "in_progress" : "overdue"}>
                  {accountStatus === "approved"
                    ? locale === "ar"
                      ? "حساب معتمد"
                      : "Approved"
                    : accountStatus === "pending"
                      ? locale === "ar"
                        ? "بانتظار موافقة المعلم"
                        : "Pending Approval"
                      : locale === "ar"
                        ? "موقوف مؤقتاً"
                        : "Suspended"}
                </Badge>
              </>
            )}
          </div>
        </Row>
        <Row label={t("profile.password")} last>
          <PasswordForm />
        </Row>
      </Card>

      <Card className="px-6">
        <SectionHeader>{t("profile.notification")}</SectionHeader>
        <NotificationsForm notifyEmail={user.notifyEmail} notifySms={user.notifySms} notifyTasks={user.notifyTasks} />
      </Card>

      <Card className="px-6">
        <SectionHeader>{t("profile.qr")}</SectionHeader>
        <div className="flex flex-col items-start gap-6 py-5 sm:flex-row sm:items-center">
          <div className="shrink-0 rounded-xl bg-white p-2 shadow ring-1 ring-slate-200 [&>svg]:h-44 [&>svg]:w-44" dangerouslySetInnerHTML={{ __html: qrSvg }} />
          <div className="min-w-0">
            <p className="text-sm text-slate-600 dark:text-slate-300">{t("profile.qrHint")}</p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{t("profile.qrCode")}</p>
            <code className="mt-1 inline-block rounded-lg bg-slate-100 px-3 py-1.5 font-mono text-sm text-slate-800 dark:bg-slate-800 dark:text-slate-100" dir="ltr">
              {user.qrToken}
            </code>
          </div>
        </div>
      </Card>
    </>
  );
}

function SectionHeader({ children }: { children: ReactNode }) {
  return <h2 className="border-b border-slate-200 py-5 text-2xl font-bold text-slate-900 dark:border-slate-700 dark:text-white">{children}</h2>;
}

function Row({ label, hint, children, last = false }: { label: string; hint?: string; children: ReactNode; last?: boolean }) {
  return (
    <div className={`flex flex-col gap-4 py-6 sm:flex-row sm:items-center ${last ? "" : "border-b border-slate-200 dark:border-slate-700"}`}>
      <div className="w-full shrink-0 sm:w-44">
        <p className="font-bold text-slate-900 dark:text-white">{label}</p>
        {hint && <p className="text-sm text-slate-500 dark:text-slate-400">{hint}</p>}
      </div>
      {children}
    </div>
  );
}
