"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Icon } from "@/components/ui";
import { setLessonCompleteAction } from "@/lib/actions";
import { reloadWithSession } from "@/components/shell/Shell";

export function toEmbedUrl(url: string | null) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube-nocookie.com/embed/${id}`;
      if (u.pathname.startsWith("/embed/")) return url;
    }
    if (u.hostname === "youtu.be") return `https://www.youtube-nocookie.com/embed${u.pathname}`;
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
    return url;
  } catch {
    return null;
  }
}

export function LessonFinishCheckbox({
  lessonId,
  slug,
  initialCompleted,
  label,
}: {
  lessonId: number;
  slug: string;
  initialCompleted: boolean;
  label: string;
}) {
  const [completed, setCompleted] = useState(initialCompleted);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setCompleted(initialCompleted);
  }, [initialCompleted]);

  const toggle = () => {
    const next = !completed;
    setCompleted(next);
    startTransition(async () => {
      await setLessonCompleteAction(lessonId, slug, next);
      reloadWithSession();
    });
  };

  return (
    <button
      type="button"
      disabled={pending}
      onClick={toggle}
      className="flex items-center gap-2.5 font-semibold text-slate-900 transition hover:opacity-80 disabled:opacity-60 dark:text-white"
    >
      <span>{label}</span>
      <span
        className={`grid h-6 w-6 place-items-center rounded-md border-2 transition ${
          completed ? "border-green-500 bg-green-500 text-white" : "border-slate-500 bg-white dark:bg-slate-800"
        }`}
      >
        {completed && <Icon name="check" className="h-4 w-4" />}
      </span>
    </button>
  );
}

export function VideoPlayer({
  videoUrl,
  title,
  thumbnailUrl,
  durationMinutes,
  soonLabel,
}: {
  videoUrl: string | null;
  title: string;
  thumbnailUrl: string | null;
  durationMinutes: number;
  soonLabel: string;
}) {
  const embed = toEmbedUrl(videoUrl);
  const [mode, setMode] = useState<"studio" | "embed">(embed ? "embed" : "studio");
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(18);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalSeconds = Math.max(60, durationMinutes * 60);
  const currentSeconds = Math.round((progress / 100) * totalSeconds);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          setPlaying(false);
          return 100;
        }
        return Math.min(100, +(p + 0.5).toFixed(1));
      });
    }, 300);
    return () => clearInterval(id);
  }, [playing]);

  const fmtTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      el.requestFullscreen?.().catch(() => {});
    }
  };

  return (
    <div className="space-y-2">
      {embed && (
        <div className="flex items-center justify-end gap-2 text-xs">
          <button
            type="button"
            onClick={() => setMode("embed")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 font-semibold transition ${
              mode === "embed" ? "bg-navy-500 text-white" : "bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            <Icon name="video" className="h-3.5 w-3.5" />
            Video Lecture
          </button>
          <button
            type="button"
            onClick={() => setMode("studio")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 font-semibold transition ${
              mode === "studio" ? "bg-navy-500 text-white" : "bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            <Icon name="play" className="h-3.5 w-3.5" />
            Interactive Studio Player
          </button>
        </div>
      )}

      {mode === "embed" && embed ? (
        <div className="aspect-video overflow-hidden rounded-2xl bg-black shadow-xl ring-1 ring-slate-900/10">
          <iframe
            src={embed}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={title}
          />
        </div>
      ) : (
        <div
          ref={containerRef}
          className="relative aspect-video select-none overflow-hidden rounded-2xl bg-gradient-to-br from-[#19214a] via-[#2a3c82] to-[#4c5fb8] shadow-xl"
        >
          {thumbnailUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbnailUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-luminosity" />
          )}

          {/* Animated presentation stage */}
          <div
            onClick={() => setPlaying((p) => !p)}
            className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center p-6 text-center text-white"
          >
            <div className="mb-3 rounded-full bg-white/10 px-4 py-1 text-xs font-bold uppercase tracking-widest text-sky-200 backdrop-blur-sm">
              in science · {playing ? "Now Playing" : "Interactive Lesson"}
            </div>
            <h3 className="max-w-lg text-xl font-extrabold tracking-tight sm:text-3xl">{title}</h3>
            <p className="mt-2 text-xs text-blue-100/80 sm:text-sm">
              {fmtTime(currentSeconds)} / {fmtTime(totalSeconds)}
            </p>
            {!playing && (
              <span className="mt-5 grid h-16 w-16 place-items-center rounded-full bg-white/20 ring-2 ring-white/70 backdrop-blur transition hover:scale-105">
                <Icon name="play" className="h-8 w-8 text-white" />
              </span>
            )}
          </div>

          {/* Floating dark control dock matching the reference design */}
          <div className="absolute inset-x-0 bottom-0 flex justify-center p-3 sm:p-5">
            <div className="w-full max-w-lg rounded-2xl bg-[#161c36]/95 px-5 py-3.5 text-white shadow-2xl backdrop-blur">
              {/* Red/white scrubber bar */}
              <div
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
                  setProgress(Math.round(pct));
                }}
                className="relative h-1.5 w-full cursor-pointer rounded-full bg-white/80"
                dir="ltr"
              >
                <div className="h-full rounded-full bg-red-600" style={{ width: `${progress}%` }} />
                <span
                  className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-600 shadow"
                  style={{ left: `${progress}%` }}
                />
              </div>

              {/* Control buttons row */}
              <div className="mt-3 flex items-center justify-between px-1" dir="ltr">
                <button
                  type="button"
                  onClick={() => setMuted((m) => !m)}
                  aria-label={muted ? "Unmute" : "Mute"}
                  className="text-white/85 hover:text-white"
                >
                  <Icon name={muted ? "volume-mute" : "volume"} className="h-4.5 w-4.5" />
                </button>

                <div className="flex items-center gap-5">
                  <button
                    type="button"
                    onClick={() => setProgress((p) => Math.max(0, p - 10))}
                    aria-label="Rewind"
                    className="text-white/85 hover:text-white"
                  >
                    <Icon name="rewind" className="h-4.5 w-4.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPlaying(false);
                      setProgress(0);
                    }}
                    aria-label="Stop"
                    className="text-white/85 hover:text-white"
                  >
                    <Icon name="stop" className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlaying((p) => !p)}
                    aria-label={playing ? "Pause" : "Play"}
                    className="rounded-lg bg-white/15 px-3 py-1.5 font-bold text-white hover:bg-white/25"
                  >
                    <Icon name={playing ? "pause" : "play"} className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setProgress((p) => Math.min(100, p + 10))}
                    aria-label="Fast forward"
                    className="text-white/85 hover:text-white"
                  >
                    <Icon name="fast-forward" className="h-4.5 w-4.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={toggleFullscreen}
                  aria-label="Fullscreen"
                  className="text-white/85 hover:text-white"
                >
                  <Icon name="maximize" className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>
          </div>
          <span className="sr-only">{soonLabel}</span>
        </div>
      )}
    </div>
  );
}
