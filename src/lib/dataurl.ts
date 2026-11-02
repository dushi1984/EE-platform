export function parseDataUrl(value: string | null | undefined) {
  if (!value || !value.startsWith("data:")) return null;
  const comma = value.indexOf(",");
  if (comma === -1) return null;
  const meta = value.slice(5, comma);
  const body = value.slice(comma + 1);
  const isBase64 = meta.endsWith(";base64");
  const mime = (isBase64 ? meta.slice(0, -7) : meta).split(";")[0] || "application/octet-stream";
  const buffer = isBase64 ? Buffer.from(body, "base64") : Buffer.from(decodeURIComponent(body));
  return { mime, buffer };
}
