export const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB in Supabase `files` bucket

export const GOOGLE_DRIVE_FOLDER_URL =
  process.env.NEXT_PUBLIC_GOOGLE_DRIVE_FOLDER_URL ||
  "https://drive.google.com/drive/folders/1qppjPDCVYDEiFqGxJ87mXeco0lxEgRmJ";

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getClientSessionToken(): string {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  return (
    params.get("session") ||
    localStorage.getItem("insci_session") ||
    sessionStorage.getItem("insci_session") ||
    ""
  );
}

export type DirectCloudUploadResult = {
  storagePath: string;
  bucket: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

/**
 * Uploads a file (PDF, DOC, DOCX, image, worksheet, etc.) directly from the browser
 * into the Supabase Storage `files` bucket via a server-minted signed upload URL.
 * Returns `null` if cloud storage is not configured so callers can fall back cleanly.
 */
export async function uploadFileToCloudBucket(
  folder: "materials" | "tasks" | "submissions" | "messages",
  file: File,
  onProgress?: (pct: number) => void,
): Promise<DirectCloudUploadResult | null> {
  try {
    const token = getClientSessionToken();
    const signRes = await fetch("/api/storage/upload-url", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "x-session-token": token } : {}),
      },
      body: JSON.stringify({
        folder,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      }),
    });

    const signed = await signRes.json().catch(() => null);
    if (!signRes.ok || !signed?.ok || !signed.uploadUrl) {
      return null;
    }

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", signed.uploadUrl);
      xhr.setRequestHeader("Content-Type", signed.mimeType || file.type || "application/octet-stream");
      xhr.setRequestHeader("x-upsert", "true");
      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable && onProgress) {
          onProgress(Math.round((ev.loaded / ev.total) * 100));
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress?.(100);
          resolve();
        } else {
          reject(new Error(`storage_put_${xhr.status}`));
        }
      };
      xhr.onerror = () => reject(new Error("storage_network_error"));
      xhr.send(file);
    });

    return {
      storagePath: signed.storagePath,
      bucket: signed.bucket || "files",
      fileName: file.name,
      mimeType: signed.mimeType || file.type || "application/octet-stream",
      sizeBytes: file.size,
    };
  } catch {
    return null;
  }
}
