"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n-client";
import { Icon } from "@/components/ui";

type DetectedBarcode = { rawValue: string };
type BarcodeDetectorLike = { detect(source: HTMLVideoElement): Promise<DetectedBarcode[]> };
type BarcodeDetectorCtor = new (opts?: { formats?: string[] }) => BarcodeDetectorLike;

type Status = "idle" | "starting" | "scanning" | "found" | "denied" | "photo_failed";

export function QrScanner() {
  const { t, locale } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    window.location.assign(`/api/auth/qr?token=${encodeURIComponent(token)}`);
  };

  const start = async () => {
    setStatus("starting");
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus("denied");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      video.setAttribute("playsinline", "true");
      await video.play();

      const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
      const nativeDetector = Detector ? new Detector({ formats: ["qr_code"] }) : null;
      const jsQRModule = nativeDetector ? null : await import("jsqr");
      const decodeJsQr = jsQRModule?.default ?? null;

      setStatus("scanning");
      let last = 0;

      const tick = async (ts: number) => {
        if (!streamRef.current) return;
        if (ts - last > 220 && video.readyState >= 2) {
          last = ts;
          try {
            if (nativeDetector) {
              const codes = await nativeDetector.detect(video);
              if (codes.length && codes[0].rawValue) {
                handleResult(codes[0].rawValue);
                return;
              }
            } else if (decodeJsQr && canvasRef.current && video.videoWidth > 0 && video.videoHeight > 0) {
              const canvas = canvasRef.current;
              const scale = Math.min(1, 520 / Math.max(video.videoWidth, video.videoHeight));
              const w = Math.max(1, Math.round(video.videoWidth * scale));
              const h = Math.max(1, Math.round(video.videoHeight * scale));
              canvas.width = w;
              canvas.height = h;
              const ctx = canvas.getContext("2d", { willReadFrequently: true });
              if (ctx) {
                ctx.drawImage(video, 0, 0, w, h);
                const imageData = ctx.getImageData(0, 0, w, h);
                const code = decodeJsQr(imageData.data, w, h, { inversionAttempts: "attemptBoth" });
                if (code?.data) {
                  handleResult(code.data);
                  return;
                }
              }
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

  const handlePhotoUpload = async (file?: File) => {
    if (!file) return;
    try {
      const jsQR = (await import("jsqr")).default;
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const canvas = canvasRef.current ?? document.createElement("canvas");
        const scale = Math.min(1, 900 / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          setStatus("photo_failed");
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const imageData = ctx.getImageData(0, 0, w, h);
        const code = jsQR(imageData.data, w, h, { inversionAttempts: "attemptBoth" });
        if (code?.data) {
          handleResult(code.data);
        } else {
          setStatus("photo_failed");
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        setStatus("photo_failed");
      };
      img.src = objectUrl;
    } catch {
      setStatus("photo_failed");
    }
  };

  const showVideo = status === "scanning" || status === "starting" || status === "found";

  return (
    <div className="mt-4 flex flex-col items-center">
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void handlePhotoUpload(e.target.files?.[0]);
          e.currentTarget.value = "";
        }}
      />

      {/* Scan frame */}
      <div className="relative aspect-square w-full max-w-[280px] overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
        <video ref={videoRef} muted playsInline className={`h-full w-full object-cover ${showVideo ? "" : "hidden"}`} />
        {!showVideo && (
          <div className="grid h-full w-full place-items-center">
            <Icon name="camera" className="h-14 w-14 text-slate-400" />
          </div>
        )}
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
        {status === "photo_failed" &&
          (locale === "ar"
            ? "لم يتم العثور على رمز QR واضح في الصورة. حاول مرة أخرى."
            : "Could not detect a clear QR code in that image. Please try again.")}
      </p>

      <div className="mt-4 flex w-full flex-col gap-2.5">
        {(status === "idle" || status === "denied" || status === "photo_failed") && (
          <button
            type="button"
            onClick={start}
            className="block w-full cursor-pointer rounded-2xl bg-blue-500 py-3.5 text-center text-lg font-bold text-white shadow-lg shadow-blue-500/30 transition hover:bg-blue-600 active:scale-[0.99]"
          >
            {t("auth.qrStart")}
          </button>
        )}
        {status !== "found" && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 active:scale-[0.99] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <Icon name="upload" className="h-4.5 w-4.5" />
            {locale === "ar" ? "مسح رمز QR من صورة" : "Scan QR from image / photo"}
          </button>
        )}
      </div>
    </div>
  );
}
