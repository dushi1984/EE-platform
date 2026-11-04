import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser, sessionPath } from "@/lib/session";
import { getI18n } from "@/lib/i18n-server";
import { tr } from "@/lib/i18n";
import { getMaterialBySlug } from "@/lib/queries";
import { TopBar } from "@/components/shell/TopBar";
import { BackArrow, Card, CrumbSep, ForwardArrow, Icon, ProgressBar, SectionTitle } from "@/components/ui";
import { Markdown } from "@/components/Markdown";
import { QuizRunner } from "@/components/QuizRunner";
import { LessonFinishCheckbox, VideoPlayer } from "@/components/VideoPlayer";

export async function generateMetadata({ params }: { params: Promise<{ slug: string; lessonId: string }> }): Promise<Metadata> {
  const { slug, lessonId } = await params;
  const user = await getCurrentUser();
  if (!user) return { title: "Lesson" };
  const m = await getMaterialBySlug(slug, user.id);
  const l = m?.lessons.find((x) => x.id === Number(lessonId));
  return { title: l ? `${l.title} · ${m!.title}` : "Lesson" };
}

export default async function LessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; lessonId: string }>;
  searchParams: Promise<{ step?: string }>;
}) {
  const { slug, lessonId } = await params;
  const { step } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { t, locale } = await getI18n();
  const material = await getMaterialBySlug(slug, user.id);
  if (!material) notFound();
  if (!material.purchased) redirect(await sessionPath(`/materials/${slug}`));

  const idx = material.lessons.findIndex((l) => l.id === Number(lessonId));
  if (idx === -1) notFound();
  const lesson = material.lessons[idx];
  const prev = material.lessons[idx - 1] ?? null;
  const next = material.lessons[idx + 1] ?? null;
  const completed = material.doneSet.has(lesson.id);
  const total = material.lessons.length;
  const percent = total ? Math.round((material.doneSet.size / total) * 100) : 0;
  const showQuiz = step === "quiz" && lesson.questions.length > 0;

  const lessonTitle = tr(locale, lesson.title, lesson.titleAr);
  const publicQuestions = lesson.questions.map((q) => ({ id: q.id, question: q.question, options: q.options as string[] }));

  return (
    <>
      <TopBar title={tr(locale, material.title, material.titleAr)} />

      <SectionTitle center>
        <span className="flex flex-wrap items-center justify-center gap-2 text-xl">
          <Link href={`/materials/${material.slug}`} className="font-medium text-navy-500 hover:underline dark:text-sky-300">
            {t("materials.title")}
          </Link>
          <CrumbSep />
          {showQuiz ? (
            <Link
              href={`/materials/${material.slug}/lessons/${lesson.id}`}
              className="font-medium text-navy-500 hover:underline dark:text-sky-300"
            >
              {t("lesson.video")}
            </Link>
          ) : (
            <span>{t("lesson.video")}</span>
          )}
          {showQuiz && (
            <>
              <CrumbSep />
              <span>{t("lesson.quizStep")}</span>
            </>
          )}
        </span>
      </SectionTitle>

      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
        {/* Lesson list */}
        <aside className="lg:sticky lg:top-5 lg:self-start">
          <Card className="overflow-hidden">
            <div className="border-b border-slate-100 p-4 dark:border-slate-800">
              <Link href={`/materials/${material.slug}`} className="text-xs font-semibold text-navy-500 hover:underline dark:text-sky-300">
                <BackArrow /> {t("lesson.backToMaterial")}
              </Link>
              <div className="mt-3 flex items-center gap-3">
                <ProgressBar percent={percent} className="flex-1" />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{percent}%</span>
              </div>
            </div>
            <ol className="max-h-[50vh] overflow-y-auto p-2 lg:max-h-[calc(100vh-14rem)]">
              {material.lessons.map((l, i) => {
                const isCurrent = l.id === lesson.id;
                const isDone = material.doneSet.has(l.id);
                return (
                  <li key={l.id}>
                    <Link
                      href={`/materials/${material.slug}/lessons/${l.id}`}
                      className={`flex items-start gap-3 rounded-xl px-3 py-2.5 text-sm transition ${isCurrent ? "bg-sun-400/90 font-semibold text-navy-800" : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"}`}
                    >
                      <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold ${isDone ? "bg-green-500 text-white" : isCurrent ? "bg-navy-500 text-white" : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-200"}`}>
                        {isDone ? <Icon name="check" className="h-3 w-3" /> : i + 1}
                      </span>
                      <span className="flex-1">
                        <span className="block leading-snug">{tr(locale, l.title, l.titleAr)}</span>
                        <span className={`text-xs font-normal ${isCurrent ? "text-navy-700" : "text-slate-400"}`}>
                          {l.durationMinutes} {t("common.min")}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </Card>
        </aside>

        {/* Content */}
        <article className="min-w-0 space-y-5">
          {showQuiz ? (
            <QuizRunner
              lessonId={lesson.id}
              lessonTitle={lessonTitle}
              questions={publicQuestions}
              nextHref={next ? `/materials/${material.slug}/lessons/${next.id}` : null}
              materialHref={`/materials/${material.slug}`}
            />
          ) : (
            <>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-navy-500 dark:text-sky-300">{t("lesson.of", { n: idx + 1, total })}</p>
                <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{lessonTitle}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {lesson.durationMinutes} {t("lesson.read")}
                </p>
              </div>

              <VideoPlayer
                videoUrl={lesson.videoUrl}
                title={lessonTitle}
                thumbnailUrl={material.thumbnailUrl}
                durationMinutes={lesson.durationMinutes}
                soonLabel={t("lesson.videoSoon")}
              />

              <Card className="flex flex-col items-center gap-4 p-5 text-center">
                <LessonFinishCheckbox
                  lessonId={lesson.id}
                  slug={material.slug}
                  initialCompleted={completed}
                  label={t("lesson.signFinished")}
                />
                {lesson.questions.length > 0 ? (
                  <Link
                    href={`/materials/${material.slug}/lessons/${lesson.id}?step=quiz`}
                    className="rounded-xl bg-blue-500 px-8 py-3 font-semibold text-white shadow-lg shadow-blue-500/30 hover:bg-blue-600"
                  >
                    {t("lesson.moveToQuiz")}
                  </Link>
                ) : next ? (
                  <Link href={`/materials/${material.slug}/lessons/${next.id}`} className="rounded-xl bg-blue-500 px-8 py-3 font-semibold text-white shadow-lg shadow-blue-500/30 hover:bg-blue-600">
                    {t("lesson.next")} <ForwardArrow />
                  </Link>
                ) : null}
              </Card>

              <Card className="p-6 sm:p-8" >
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t("lesson.notes")}</h3>
                  <Link
                    href={`/materials/${material.slug}/lessons/${lesson.id}/pdf`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-navy-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-sky-300"
                  >
                    <Icon name="file" className="h-4 w-4" />
                    {t("lesson.openPdf")}
                  </Link>
                </div>
                <div id="lesson-notes" dir="ltr">
                  <Markdown content={lesson.content || "_No content yet._"} />
                </div>
              </Card>

              <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  {prev ? (
                    <Link href={`/materials/${material.slug}/lessons/${prev.id}`} className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
                      <BackArrow /> {t("lesson.prev")}: {tr(locale, prev.title, prev.titleAr)}
                    </Link>
                  ) : (
                    <span className="text-sm text-slate-400">—</span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {completed && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                      <Icon name="check" className="h-3.5 w-3.5" /> {t("lesson.completed")}
                    </span>
                  )}
                  {next && (
                    <Link href={`/materials/${material.slug}/lessons/${next.id}`} className="rounded-xl bg-navy-500 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-600">
                      {t("lesson.next")} <ForwardArrow />
                    </Link>
                  )}
                </div>
              </Card>

              {percent === 100 && (
                <div className="rounded-2xl bg-gradient-to-br from-green-500 to-teal-600 p-6 text-white shadow-lg">
                  <h3 className="flex items-center gap-2 text-xl font-bold">
                    <Icon name="graduation" className="h-6 w-6" />
                    {t("lesson.finished")}
                  </h3>
                  <p className="mt-1 text-green-50">{t("lesson.finishedBody")}</p>
                  <div className="mt-4 flex flex-wrap gap-3 print:hidden">
                    <Link href="/grades" className="inline-block rounded-lg bg-white px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-50">
                      {t("grades.title")} <ForwardArrow />
                    </Link>
                    <Link
                      href={`/materials/${material.slug}/certificate`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400 px-4 py-2 text-sm font-bold text-navy-900 shadow hover:bg-amber-300"
                    >
                      <Icon name="trophy" className="h-4 w-4" />
                      {locale === "ar" ? "استلم شهادتك" : "Get your certificate"}
                    </Link>
                  </div>
                </div>
              )}
            </>
          )}
        </article>
      </div>
    </>
  );
}
