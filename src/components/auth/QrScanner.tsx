"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n-client";
import { Icon } from "@/components/ui";

type DetectedBarcode = { rawValue: string };
type BarcodeDetectorLike = { detect(source: HTMLVideoElement): Promise<DetectedBarcode[]> };
type BarcodeDetectorCtor = new (opts?: { formats?: string[] }) => BarcodeDetectorLike;

type Status = "idle" | "starting" | "scanning" | "found" | "denied" | "unsupported";

export function QrScanner() {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const [status, setStatus] = useState<Status>("idle");

  const stop = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
  };

  useEffect(() => stop, []);

  const handleResult = (raw: string) => {
    setStatus("found");
    stop();
    let token = raw.trim();
    try {
      const url = new URL(raw);
      token = url.searchParams.get("token") ?? token;
    } catch {
      /* bare token */
    }
    window.location.href = `/api/auth/qr?token=${encodeURIComponent(token)}`;
  };

  const start = async () => {
    setStatus("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();

      const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
      if (!Detector) {
        setStatus("unsupported");
        return;
      }
      const detector = new Detector({ formats: ["qr_code"] });
      setStatus("scanning");
      let last = 0;
      const tick = async (ts: number) => {
        if (!streamRef.current) return;
        if (ts - last > 250) {
          last = ts;
          try {
            const codes = await detector.detect(video);
            if (codes.length && codes[0].rawValue) {
              handleResult(codes[0].rawValue);
              return;
            }
          } catch {
            /* ignore frame errors */
          }
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setStatus("denied");
    }
  };

  const showVideo = status === "scanning" || status === "unsupported" || status === "starting" || status === "found";

  return (
    <div className="mt-4 flex flex-col items-center">
      {/* Scan frame */}
      <div className="relative aspect-square w-full max-w-[280px] overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
        <video ref={videoRef} muted playsInline className={`h-full w-full object-cover ${showVideo ? "" : "hidden"}`} />
        {!showVideo && (
          <div className="grid h-full w-full place-items-center">
            <Icon name="camera" className="h-14 w-14 text-slate-400" />
          </div>
        )}
        {/* Corner brackets like the reference design */}
        <span className="pointer-events-none absolute left-3 top-3 h-14 w-14 border-l-[14px] border-t-[14px] border-slate-900 dark:border-white" />
        <span className="pointer-events-none absolute right-3 top-3 h-14 w-14 border-r-[14px] border-t-[14px] border-slate-900 dark:border-white" />
        <span className="pointer-events-none absolute bottom-3 left-3 h-14 w-14 border-b-[14px] border-l-[14px] border-slate-900 dark:border-white" />
        <span className="pointer-events-none absolute bottom-3 right-3 h-14 w-14 border-b-[14px] border-r-[14px] border-slate-900 dark:border-white" />
        <span className="pointer-events-none absolute inset-x-6 h-3 rounded-full bg-slate-900/80 dark:bg-white/80" style={{ top: "50%", transform: "translateY(-50%)" }} />
        {status === "scanning" && <span className="pointer-events-none absolute inset-x-6 h-0.5 bg-blue-500 shadow-[0_0_12px_2px_rgba(59,130,246,0.8)] animate-scanline" />}
      </div>

      <p className="mt-3 text-center text-base font-medium text-slate-800 dark:text-slate-200">
        {status === "idle" && t("auth.qrAllowCamera")}
        {status === "starting" && t("auth.qrAllowCamera")}
        {status === "scanning" && t("auth.qrScanning")}
        {status === "found" && t("auth.signingIn")}
        {status === "denied" && t("auth.qrDenied")}
        {status === "unsupported" && t("auth.qrUnsupported")}
      </p>

      {(status === "idle" || status === "denied") && (
        <button
          type="button"
          onClick={start}
          className="mt-4 block w-full rounded-2xl bg-blue-500 py-4 text-center text-xl font-bold text-white shadow-lg shadow-blue-500/30 transition hover:bg-blue-600"
        >
          {t("auth.qrStart")}
        </button>
      )}
    </div>
  );
}
