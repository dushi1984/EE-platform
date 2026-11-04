import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/session";
import { getI18n, getTheme } from "@/lib/i18n-server";
import { getMaterialsForUser } from "@/lib/queries";
import { firstAllowedPath, getAccessPolicy } from "@/lib/access";
import { tr } from "@/lib/i18n";
import { Avatar, Badge, ForwardArrow, Icon, LaunchArrow, LocaleToggle, Logo, ProgressBar, SubjectBadge, SubjectGlyph, ThemeToggle, type IconName } from "@/components/ui";
import { MaterialThumb } from "@/components/MaterialCard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Learn science your way",
  description: "Master science with clear lessons, hands-on tasks and progress you can see. Chemistry, physics, biology and mathematics — all in one place.",
};

const content = {
  en: {
    explore: "Explore subjects",
    how: "How it works",
    signIn: "Sign in",
    getStarted: "Get started",
    dashboard: "My dashboard",
    eyebrow: "A better way to learn",
    headline1: "Curiosity starts",
    headline2: "here.",
    heroBody: "Science makes more sense when you can see your progress. Learn with focused lessons, stay on top of every task, and turn your hard work into great results.",
    startLearning: "Start learning free",
    exploreMaterials: "Explore materials",
    studentNote: "Built for students. Made for progress.",
    portal: "YOUR STUDENT SPACE",
    previewTitle: "Everything in its place.",
    previewText: "A simple dashboard for the things that matter: what to study, what’s due, and how far you’ve come.",
    taskPreview: "This week’s tasks",
    taskOne: "Titration lab report",
    taskTwo: "Cell structure worksheet",
    inProgress: "In progress",
    todo: "To do",
    subjectLabel: "FIND YOUR SPARK",
    subjectsTitle: "One place. Every subject.",
    subjectsBody: "From the smallest atom to the biggest ideas, find the help you need to really understand it.",
    chemistry: "Chemistry",
    chemistryBody: "Make reactions make sense.",
    physics: "Physics",
    physicsBody: "Discover how the world works.",
    biology: "Biology",
    biologyBody: "Explore the science of life.",
    mathematics: "Mathematics",
    mathematicsBody: "Find confidence in every equation.",
    picksLabel: "START EXPLORING",
    picksTitle: "Made for your next breakthrough.",
    picksBody: "Bite-sized lessons, real practice, and knowledge that sticks.",
    new: "New",
    lessons: "lessons",
    seeAll: "See your materials",
    stepsLabel: "YOUR JOURNEY",
    stepsTitle: "A little progress, every day.",
    step1: "Find your focus",
    step1Body: "Pick a subject and open a material that meets you where you are.",
    step2: "Learn by doing",
    step2Body: "Read clear lessons, test your knowledge, and finish meaningful tasks.",
    step3: "See how far you’ve come",
    step3Body: "Track completed work and see your grades grow over time.",
    ctaTitle: "Ready to make it click?",
    ctaBody: "Your next “I get it!” moment is just around the corner.",
    ctaButton: "Let’s get started",
    footer: "Learn a little. Discover a lot.",
    rights: "Made for curious minds.",
  },
  ar: {
    explore: "استكشف المواد",
    how: "كيف تعمل المنصة",
    signIn: "دخول",
    getStarted: "ابدأ الآن",
    dashboard: "لوحة التحكم",
    eyebrow: "طريقة أفضل للتعلم",
    headline1: "الفضول يبدأ",
    headline2: "من هنا.",
    heroBody: "العلوم تصبح أسهل عندما ترى تقدمك. تعلّم بدروس واضحة، تابع مهامك خطوة بخطوة، وحوّل مجهودك إلى نتائج تفخر بها.",
    startLearning: "ابدأ التعلم مجاناً",
    exploreMaterials: "استكشف المواد",
    studentNote: "صُممت للطلاب. وصُنعت للتقدم.",
    portal: "مساحتك الدراسية",
    previewTitle: "كل شيء في مكانه.",
    previewText: "لوحة تحكم بسيطة لكل ما يهمك: ماذا تدرس، وما موعد تسليمك، ومدى تقدمك.",
    taskPreview: "مهام هذا الأسبوع",
    taskOne: "تقرير معمل المعايرة",
    taskTwo: "ورقة عمل تركيب الخلية",
    inProgress: "قيد التنفيذ",
    todo: "لم تبدأ",
    subjectLabel: "اكتشف شغفك",
    subjectsTitle: "مكان واحد لكل المواد.",
    subjectsBody: "من أصغر ذرة إلى أكبر الأفكار، ستجد المساعدة التي تحتاجها لتفهم حقاً.",
    chemistry: "الكيمياء",
    chemistryBody: "تفاعلات مفهومة بخطوات بسيطة.",
    physics: "الفيزياء",
    physicsBody: "اكتشف كيف يعمل العالم.",
    biology: "الأحياء",
    biologyBody: "استكشف علم الحياة.",
    mathematics: "الرياضيات",
    mathematicsBody: "ثقة أكبر مع كل معادلة.",
    picksLabel: "ابدأ رحلتك",
    picksTitle: "خطوتك القادمة نحو الفهم.",
    picksBody: "دروس قصيرة، وتدريبات حقيقية، ومعلومات تبقى معك.",
    new: "جديد",
    lessons: "دروس",
    seeAll: "شاهد المواد",
    stepsLabel: "رحلتك الدراسية",
    stepsTitle: "تقدم بسيط كل يوم.",
    step1: "اختر ما يهمك",
    step1Body: "اختر المادة وافتح المحتوى المناسب لمستواك.",
    step2: "تعلّم بالتطبيق",
    step2Body: "اقرأ دروساً واضحة، اختبر معلوماتك، وأكمل مهامك.",
    step3: "شاهد تقدمك",
    step3Body: "تابع ما أنجزته وشاهد درجاتك تتحسن مع الوقت.",
    ctaTitle: "مستعد لتفهمها صح؟",
    ctaBody: "لحظة «فهمتها!» التالية أقرب مما تتخيل.",
    ctaButton: "يلا نبدأ",
    footer: "تعلّم قليلاً. واكتشف الكثير.",
    rights: "صُنعت للعقول الفضولية.",
  },
} as const;

const subjects: { icon: IconName; key: "chemistry" | "physics" | "biology" | "mathematics"; color: string; badge: string; text: string }[] = [
  { icon: "flask", key: "chemistry", color: "bg-[#e9f7f3] dark:bg-emerald-950/40", badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", text: "text-emerald-700 dark:text-emerald-300" },
  { icon: "atom", key: "physics", color: "bg-[#e9f1ff] dark:bg-sky-950/40", badge: "bg-sky-500/15 text-blue-700 dark:text-blue-300", text: "text-blue-700 dark:text-blue-300" },
  { icon: "dna", key: "biology", color: "bg-[#fff0f2] dark:bg-rose-950/40", badge: "bg-rose-500/15 text-rose-700 dark:text-rose-300", text: "text-rose-700 dark:text-rose-300" },
  { icon: "compass", key: "mathematics", color: "bg-[#fff6dd] dark:bg-amber-950/40", badge: "bg-amber-500/15 text-amber-700 dark:text-amber-300", text: "text-amber-700 dark:text-amber-300" },
];

export default async function HomePage() {
  const [user, { locale, t }, theme, materials, policy] = await Promise.all([
    getCurrentUser(),
    getI18n(),
    getTheme(),
    getMaterialsForUser(-1),
    getAccessPolicy(),
  ]);
  const c = content[locale];
  const destination = user ? "/dashboard" : "/register";
  const visitorCanBrowseMaterials = policy.visitorPages.includes("materials");
  const visitorEntry = policy.visitorPages.length > 0 ? firstAllowedPath(null, policy) : null;
  const materialsHref = user ? "/materials" : visitorCanBrowseMaterials ? "/materials" : "/register";
  const featured = materials.slice(0, 3);

  return (
    <div className="overflow-hidden bg-[#f5f8fa] dark:bg-slate-950">
      <header className="relative z-20 border-b border-navy-500/10 bg-white/85 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/85">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between gap-3 px-5 sm:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-2.5 text-navy-500 dark:text-white" dir="ltr">
            <Logo className="h-9 w-9" />
            <span className="text-xl font-extrabold tracking-tight sm:text-2xl">in science</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-600 dark:text-slate-300 md:flex">
            <a href="#subjects" className="hover:text-navy-500 dark:hover:text-sun-400">{c.explore}</a>
            <a href="#how-it-works" className="hover:text-navy-500 dark:hover:text-sun-400">{c.how}</a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle theme={theme} label={t("common.darkMode")} />
            <LocaleToggle locale={locale} />
            <Link href={user ? "/dashboard" : "/login"} className="hidden whitespace-nowrap text-sm font-bold text-navy-500 hover:underline dark:text-white sm:inline">{user ? c.dashboard : c.signIn}</Link>
            <Link href={destination} className="whitespace-nowrap rounded-xl bg-sun-400 px-3.5 py-2.5 text-sm font-extrabold text-navy-800 transition hover:bg-sun-500 sm:px-5">{user ? c.dashboard : c.getStarted}</Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative isolate overflow-hidden pb-20 pt-16 sm:pb-28 sm:pt-24 lg:pt-28">
          <div className="absolute inset-0 -z-10 bg-[url('/images/science-bg.jpg')] bg-cover bg-center opacity-45 dark:opacity-[0.06]" />
          <div className="absolute -end-24 -top-24 -z-10 h-[420px] w-[420px] rounded-full bg-blue-100/75 blur-3xl dark:bg-blue-900/20" />
          <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-[.93fr_1.07fr] lg:gap-16">
            <div className="animate-fade-up">
              <span className="inline-flex items-center gap-2 rounded-full border border-navy-500/10 bg-white px-4 py-2 text-xs font-bold uppercase tracking-widest text-navy-500 shadow-sm dark:border-white/10 dark:bg-slate-900 dark:text-blue-300">
                <span className="h-2 w-2 rounded-full bg-sun-400" /> {c.eyebrow}
              </span>
              <h1 className="mt-7 max-w-xl text-[clamp(3.4rem,6vw,6rem)] font-black leading-[.99] tracking-[-.055em] text-navy-700 rtl:leading-[1.2] dark:text-white">
                {c.headline1}<br /><span className="relative inline-block text-blue-500">{c.headline2}<span className="absolute -bottom-2 start-0 h-2 w-full -rotate-2 rounded-full bg-sun-400/85" /></span>
              </h1>
              <p className="mt-9 max-w-lg text-lg leading-relaxed text-slate-600 dark:text-slate-300">{c.heroBody}</p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link href={destination} className="inline-flex items-center gap-2 rounded-xl bg-navy-500 px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-navy-500/20 transition hover:-translate-y-0.5 hover:bg-navy-600">{c.startLearning} <LaunchArrow /></Link>
                <a href="#materials" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-navy-500 transition hover:border-navy-500/40 hover:bg-slate-50 dark:border-white/15 dark:bg-slate-900 dark:text-white">{c.exploreMaterials} <ForwardArrow /></a>
                {!user && visitorEntry && (
                  <Link href={visitorEntry} className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-5 py-3.5 text-sm font-bold text-navy-600 transition hover:bg-sky-100 dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-300">
                    <Icon name="sparkles" className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                    {t("auth.exploreVisitor")}
                  </Link>
                )}
              </div>
              <p className="mt-7 flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                <Icon name="sparkles" className="h-4.5 w-4.5 text-emerald-500" /> {c.studentNote}
              </p>
            </div>

            <div className="relative mx-auto w-full max-w-[650px] animate-fade-up [animation-delay:120ms]">
              <div className="absolute -inset-5 rounded-[42px] bg-blue-200/35 blur-3xl dark:bg-navy-500/25" />
              <div className="relative overflow-hidden rounded-[26px] border border-navy-500/10 bg-white shadow-[0_35px_85px_rgba(25,47,100,0.17)] dark:border-white/10 dark:bg-slate-900">
                <div className="flex items-center justify-between bg-navy-500 px-5 py-4 text-white sm:px-6">
                  <div className="flex items-center gap-2.5"><Logo className="h-6 w-6" /><span className="font-bold">in science</span></div>
                  <div className="flex items-center gap-2"><Avatar name="Fatma Salah" size={33} src="https://images.pexels.com/photos/8199174/pexels-photo-8199174.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=100" /><span className="text-xs font-semibold">Fatma Salah</span></div>
                </div>
                <div className="bg-[#eff4f7] p-5 sm:p-7 dark:bg-slate-800">
                  <div className="mb-5 flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.17em] text-navy-500 dark:text-blue-300">{c.portal}</p><h2 className="mt-1 text-xl font-extrabold text-navy-700 dark:text-white">{c.taskPreview}</h2></div><span className="rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold text-navy-500 shadow-sm dark:bg-slate-900 dark:text-white">2 / 4</span></div>
                  <div className="space-y-3">
                    <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900"><div className="flex items-center justify-between gap-3"><span className="inline-flex items-center gap-2.5 font-bold text-slate-900 dark:text-white"><SubjectBadge icon="chemistry" size="sm" />{c.taskOne}</span><Badge tone="in_progress">{c.inProgress}</Badge></div><ProgressBar percent={65} className="mt-3" /></div>
                    <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900"><div className="flex items-center justify-between gap-3"><span className="inline-flex items-center gap-2.5 font-bold text-slate-900 dark:text-white"><SubjectBadge icon="biology" size="sm" />{c.taskTwo}</span><Badge tone="todo">{c.todo}</Badge></div><ProgressBar percent={12} className="mt-3" /></div>
                  </div>
                  <div className="mt-5 grid grid-cols-3 gap-3"><div className="rounded-xl bg-[#e1ebff] p-3 text-center dark:bg-blue-950/60"><p className="text-xl font-extrabold text-navy-500 dark:text-blue-300">06</p><p className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">{c.lessons}</p></div><div className="rounded-xl bg-[#fff2cb] p-3 text-center dark:bg-amber-950/40"><p className="text-xl font-extrabold text-amber-600">85%</p><p className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">{locale === "ar" ? "المعدل" : "Average"}</p></div><div className="rounded-xl bg-[#ddf6e9] p-3 text-center dark:bg-emerald-950/40"><p className="text-xl font-extrabold text-emerald-600">04</p><p className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">{locale === "ar" ? "مواد" : "Subjects"}</p></div></div>
                </div>
              </div>
              <div className="absolute -bottom-5 -start-5 hidden rotate-[-7deg] rounded-2xl bg-sun-400 p-3.5 text-navy-900 shadow-lg sm:block" aria-hidden><Icon name="sparkles" className="h-7 w-7" /></div>
              <div className="absolute -end-4 top-16 hidden rotate-[8deg] rounded-2xl bg-white p-3.5 text-sky-600 shadow-lg dark:bg-slate-800 dark:text-sky-300 sm:block" aria-hidden><Icon name="atom" className="h-7 w-7" /></div>
            </div>
          </div>
        </section>

        <section id="subjects" className="bg-white py-20 dark:bg-slate-900 sm:py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="max-w-2xl"><p className="text-xs font-extrabold uppercase tracking-[.2em] text-blue-500">{c.subjectLabel}</p><h2 className="mt-3 text-3xl font-black tracking-tight text-navy-700 dark:text-white sm:text-4xl">{c.subjectsTitle}</h2><p className="mt-3 text-slate-600 dark:text-slate-300">{c.subjectsBody}</p></div>
            <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{subjects.map((s) => <Link href={materialsHref} key={s.key} className={`group rounded-2xl ${s.color} p-6 transition hover:-translate-y-1 hover:shadow-lg`}><div className={`mb-8 grid h-14 w-14 place-items-center rounded-2xl ${s.badge}`}><Icon name={s.icon} className="h-7 w-7" /></div><h3 className={`text-xl font-extrabold ${s.text}`}>{c[s.key]}</h3><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{c[`${s.key}Body`]}</p><LaunchArrow className={`mt-5 text-lg font-bold ${s.text}`} /></Link>)}</div>
          </div>
        </section>

        <section id="materials" className="py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[.2em] text-blue-500">{c.picksLabel}</p><h2 className="mt-3 text-3xl font-black tracking-tight text-navy-700 dark:text-white sm:text-4xl">{c.picksTitle}</h2><p className="mt-3 text-slate-600 dark:text-slate-300">{c.picksBody}</p></div><Link href={materialsHref} className="font-bold text-navy-500 hover:underline dark:text-blue-300">{c.seeAll} <ForwardArrow /></Link></div>
            <div className="mt-9 grid gap-5 md:grid-cols-3">{featured.map((m) => <Link key={m.id} href={user || (visitorCanBrowseMaterials && m.allowVisitors && m.priceCents === 0) ? `/materials/${m.slug}` : "/register"} className="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-900/5 transition hover:-translate-y-1 hover:shadow-xl dark:bg-slate-900 dark:ring-white/10"><div className="relative aspect-[16/9] overflow-hidden"><MaterialThumb url={m.thumbnailUrl} title={m.title} className="transition duration-500 group-hover:scale-105" />{m.isNew && <span className="absolute start-4 top-4 rounded-full bg-sun-400 px-3 py-1 text-xs font-bold text-navy-800">{c.new}</span>}</div><div className="p-5"><span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-300"><SubjectGlyph icon={m.subject.icon} name={m.subject.name} className="h-3.5 w-3.5" />{tr(locale, m.subject.name, m.subject.nameAr)}</span><h3 className="mt-2 text-lg font-extrabold text-navy-700 dark:text-white">{tr(locale, m.title, m.titleAr)}</h3><div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400"><span>{m.lessonCount} {c.lessons} · {m.totalMinutes} {t("common.min")}</span><LaunchArrow className="font-bold text-navy-500 dark:text-blue-300" /></div></div></Link>)}</div>
          </div>
        </section>

        <section id="how-it-works" className="bg-white py-20 dark:bg-slate-900 sm:py-24"><div className="mx-auto max-w-7xl px-5 sm:px-8"><div className="text-center"><p className="text-xs font-extrabold uppercase tracking-[.2em] text-blue-500">{c.stepsLabel}</p><h2 className="mt-3 text-3xl font-black tracking-tight text-navy-700 dark:text-white sm:text-4xl">{c.stepsTitle}</h2></div><div className="mt-12 grid gap-8 md:grid-cols-3">{([1, 2, 3] as const).map((n) => <div key={n} className="relative rounded-2xl border border-slate-100 bg-[#f7f9fb] p-7 dark:border-white/10 dark:bg-slate-800"><span className="grid h-12 w-12 place-items-center rounded-xl bg-navy-500 text-xl font-black text-white">0{n}</span><h3 className="mt-7 text-xl font-extrabold text-navy-700 dark:text-white">{c[`step${n}`]}</h3><p className="mt-2 leading-relaxed text-slate-600 dark:text-slate-300">{c[`step${n}Body`]}</p></div>)}</div></div></section>

        <section className="px-5 py-20 sm:px-8"><div className="mx-auto max-w-7xl overflow-hidden rounded-[32px] bg-navy-500 px-7 py-14 text-center text-white shadow-2xl shadow-navy-500/20 sm:px-12 sm:py-20"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/15 text-sun-400"><Icon name="sparkles" className="h-8 w-8" /></span><h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">{c.ctaTitle}</h2><p className="mx-auto mt-4 max-w-md text-blue-100">{c.ctaBody}</p><Link href={destination} className="mt-8 inline-flex items-center gap-2 rounded-xl bg-sun-400 px-7 py-3.5 font-extrabold text-navy-800 transition hover:bg-sun-500">{c.ctaButton} <LaunchArrow /></Link></div></section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-9 dark:border-white/10 dark:bg-slate-900"><div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-5 px-5 sm:flex-row sm:items-center sm:px-8"><div className="flex items-center gap-2 text-navy-500 dark:text-white"><Logo className="h-7 w-7" /><span className="font-extrabold">in science</span><span className="ms-3 text-sm font-normal text-slate-500 dark:text-slate-400">{c.footer}</span></div><div className="flex items-center gap-5 text-sm font-semibold text-slate-600 dark:text-slate-300"><Link href="/login" className="hover:text-navy-500">{c.signIn}</Link><Link href="/register" className="hover:text-navy-500">{c.getStarted}</Link><span>© {new Date().getFullYear()}</span></div></div></footer>
    </div>
  );
}
