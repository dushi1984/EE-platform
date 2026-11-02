import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import QRCode from "qrcode";
import { getCurrentUser } from "@/lib/session";
import { getI18n } from "@/lib/i18n-server";
import { TopBar } from "@/components/shell/TopBar";
import { Card } from "@/components/ui";
import { ContactForm, NameForm, NotificationsForm, PasswordForm, PhotoForm } from "@/components/ProfileForms";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { t } = await getI18n();

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const loginUrl = `${proto}://${host}/api/auth/qr?token=${encodeURIComponent(user.qrToken)}`;
  const qrSvg = await QRCode.toString(loginUrl, { type: "svg", margin: 1, width: 180, color: { dark: "#1c2f66", light: "#ffffff" } });

  return (
    <>
      <TopBar title={t("profile.title")} />

      <div className="flex items-center gap-4 px-2">
        <Link href="/dashboard" className="text-sm font-bold text-navy-500 hover:underline dark:text-sky-300">
          ← {t("dashboard.title")}
        </Link>
        {user.role === "student" && (
          <>
            <Link href="/grades" className="text-sm font-bold text-navy-500 hover:underline dark:text-sky-300">
              {t("grades.title")} →
            </Link>
            <Link href="/materials" className="text-sm font-bold text-navy-500 hover:underline dark:text-sky-300">
              {t("materials.title")} →
            </Link>
          </>
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
          <p className="flex-1 font-mono text-slate-700 dark:text-slate-200">{user.studentCode}</p>
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
