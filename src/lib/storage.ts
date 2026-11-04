export const FILES_BUCKET = "files";
export const MAX_CLOUD_FILE_BYTES = 25 * 1024 * 1024; // 25 MB

export type StorageFolder = "materials" | "tasks" | "submissions" | "messages";

function getSupabaseConfig() {
  let url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/\/+$/, "");
  if (!url && process.env.DATABASE_URL) {
    const m = /postgres\.([a-z0-9]{15,30}):/i.exec(process.env.DATABASE_URL);
    if (m?.[1]) {
      url = `https://${m[1]}.supabase.co`;
    }
  }
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  return { url, key, configured: Boolean(url && key) };
}

export function isSupabaseStorageConfigured(): boolean {
  return getSupabaseConfig().configured;
}

export function guessMimeType(fileName: string, provided?: string | null): string {
  if (provided && provided !== "application/octet-stream") return provided;
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  switch (ext) {
    case "pdf":
      return "application/pdf";
    case "doc":
      return "application/msword";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "ppt":
      return "application/vnd.ms-powerpoint";
    case "pptx":
      return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    case "xls":
      return "application/vnd.ms-excel";
    case "xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case "txt":
      return "text/plain; charset=utf-8";
    case "md":
      return "text/markdown; charset=utf-8";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    default:
      return provided || "application/octet-stream";
  }
}

export function buildStorageObjectPath(folder: StorageFolder, originalName: string): string {
  const clean = (originalName || "document")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90) || "file";
  const rand = Math.random().toString(36).slice(2, 8);
  return `${folder}/${Date.now()}-${rand}-${clean}`;
}

function normalizeStorageUrl(baseUrl: string, returnedPath: string): string {
  if (returnedPath.startsWith("http://") || returnedPath.startsWith("https://")) {
    return returnedPath;
  }
  if (returnedPath.startsWith("/storage/v1/")) {
    return `${baseUrl}${returnedPath}`;
  }
  const rel = returnedPath.startsWith("/") ? returnedPath : `/${returnedPath}`;
  return `${baseUrl}/storage/v1${rel}`;
}

export async function createSignedUploadUrl(folder: StorageFolder, fileName: string) {
  const { url, key, configured } = getSupabaseConfig();
  if (!configured) return null;

  const storagePath = buildStorageObjectPath(folder, fileName);
  const encodedPath = storagePath.split("/").map(encodeURIComponent).join("/");
  const endpoint = `${url}/storage/v1/object/upload/sign/${FILES_BUCKET}/${encodedPath}`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
    cache: "no-store",
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Supabase signed upload failed (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as { url?: string; signedURL?: string; token?: string };
  const rawUrl = data.url || data.signedURL;
  if (!rawUrl) throw new Error("Missing signed upload URL from Supabase");

  return {
    bucket: FILES_BUCKET,
    storagePath,
    uploadUrl: normalizeStorageUrl(url, rawUrl),
    token: data.token ?? null,
  };
}

export async function uploadBufferToFilesBucket(
  folder: StorageFolder,
  fileName: string,
  buffer: Buffer,
  providedMime?: string | null,
) {
  const { url, key, configured } = getSupabaseConfig();
  const mimeType = guessMimeType(fileName, providedMime);
  if (!configured) return null;

  const storagePath = buildStorageObjectPath(folder, fileName);
  const encodedPath = storagePath.split("/").map(encodeURIComponent).join("/");
  const endpoint = `${url}/storage/v1/object/${FILES_BUCKET}/${encodedPath}`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
      "Content-Type": mimeType,
      "x-upsert": "true",
    },
    body: new Uint8Array(buffer),
    cache: "no-store",
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Supabase upload failed (${res.status}): ${errText}`);
  }

  return {
    bucket: FILES_BUCKET,
    storagePath,
    mimeType,
  };
}

export async function createSignedDownloadUrl(
  storagePath: string,
  expiresInSeconds = 3600,
  downloadFileName?: string,
): Promise<string | null> {
  const { url, key, configured } = getSupabaseConfig();
  if (!configured || !storagePath) return null;

  const encodedPath = storagePath.split("/").map(encodeURIComponent).join("/");
  const endpoint = `${url}/storage/v1/object/sign/${FILES_BUCKET}/${encodedPath}`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ expiresIn: expiresInSeconds }),
    cache: "no-store",
  });

  if (!res.ok) return null;
  const data = (await res.json()) as { signedURL?: string; signedUrl?: string; url?: string };
  const raw = data.signedURL || data.signedUrl || data.url;
  if (!raw) return null;
  const full = normalizeStorageUrl(url, raw);
  if (!downloadFileName) return full;
  const sep = full.includes("?") ? "&" : "?";
  return `${full}${sep}download=${encodeURIComponent(downloadFileName)}`;
}

export async function downloadFromFilesBucket(storagePath: string) {
  const { url, key, configured } = getSupabaseConfig();
  if (!configured || !storagePath) return null;

  const encodedPath = storagePath.split("/").map(encodeURIComponent).join("/");
  const endpoint = `${url}/storage/v1/object/${FILES_BUCKET}/${encodedPath}`;
  const res = await fetch(endpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
    },
    cache: "no-store",
  });

  if (!res.ok) return null;
  const arrayBuf = await res.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuf),
    contentType: res.headers.get("content-type") || "application/octet-stream",
  };
}

export async function deleteFromFilesBucket(storagePath: string | null | undefined) {
  const { url, key, configured } = getSupabaseConfig();
  if (!configured || !storagePath) return;

  await fetch(`${url}/storage/v1/object/${FILES_BUCKET}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prefixes: [storagePath] }),
    cache: "no-store",
  }).catch(() => {});
}

/* -------------------- Google Drive Link Helpers -------------------- */

export type ParsedGoogleDriveLink = {
  fileId: string;
  docType: "document" | "presentation" | "spreadsheets" | "file";
  previewUrl: string;
  downloadUrl: string;
  openUrl: string;
  viewUrl: string;
};

export function parseGoogleDriveUrl(rawUrl: string | null | undefined): ParsedGoogleDriveLink | null {
  if (!rawUrl) return null;
  let u: URL;
  try {
    u = new URL(rawUrl.trim());
  } catch {
    return null;
  }

  const host = u.hostname.toLowerCase();
  if (!host.includes("drive.google.com") && !host.includes("docs.google.com")) {
    return null;
  }

  const docMatch = /\/(document|presentation|spreadsheets)\/d\/([a-zA-Z0-9_-]+)/.exec(u.pathname);
  if (docMatch) {
    const docType = docMatch[1] as "document" | "presentation" | "spreadsheets";
    const fileId = docMatch[2];
    const exportFmt = docType === "document" ? "docx" : docType === "presentation" ? "pdf" : "xlsx";
    const openUrl = `https://docs.google.com/${docType}/d/${fileId}/edit`;
    return {
      fileId,
      docType,
      previewUrl: `https://docs.google.com/${docType}/d/${fileId}/preview`,
      downloadUrl: `https://docs.google.com/${docType}/d/${fileId}/export?format=${exportFmt}`,
      openUrl,
      viewUrl: openUrl,
    };
  }

  const fileMatch = /\/file\/d\/([a-zA-Z0-9_-]+)/.exec(u.pathname);
  const queryId = u.searchParams.get("id");
  const fileId = fileMatch?.[1] || queryId;
  if (!fileId) return null;

  const openUrl = `https://drive.google.com/file/d/${fileId}/view`;
  return {
    fileId,
    docType: "file",
    previewUrl: `https://drive.google.com/file/d/${fileId}/preview`,
    downloadUrl: `https://drive.google.com/uc?export=download&id=${fileId}`,
    openUrl,
    viewUrl: openUrl,
  };
}
