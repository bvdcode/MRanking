import type { JsonObject, JsonValue } from "./json-value";

const YANDEX_PROXY_ORIGIN = "http://horse.datavale.org:8787";
const SIGNATURE_SALT = "XGRlBW9FXlekgbPrRHuSiA";
const MD5_SHIFTS = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
] as const;
const MD5_CONSTANTS = Array.from(
  { length: 64 },
  (_, index) =>
    Math.floor(Math.abs(Math.sin(index + 1)) * 0x1_0000_0000) >>> 0,
);

export async function resolveYandexPreviewUrl(
  trackId: string,
  signal?: AbortSignal,
  request: typeof fetch = fetch,
): Promise<string> {
  if (!/^\d+$/.test(trackId)) {
    throw new Error("Invalid Yandex Music track");
  }
  const downloadResponse = await request(
    `${YANDEX_PROXY_ORIGIN}/tracks/${encodeURIComponent(trackId)}/download-info`,
    {
      signal,
      headers: { accept: "application/json" },
    },
  );
  if (!downloadResponse.ok) {
    throw new Error("Yandex Music preview is unavailable");
  }
  const envelope = (await downloadResponse.json()) as JsonObject;
  const variants = Array.isArray(envelope.result)
    ? envelope.result.filter(isObject)
    : [];
  const variant = variants
    .filter(
      (item) => stringValue(item.codec) === "mp3" && item.preview !== false,
    )
    .sort(
      (left, right) =>
        numberValue(right.bitrateInKbps) - numberValue(left.bitrateInKbps),
    )[0];
  if (!variant) {
    throw new Error("Yandex Music did not return an MP3 preview");
  }

  const fileInfoUrl = safeFileInfoUrl(stringValue(variant.downloadInfoUrl));
  const fileInfoResponse = await request(fileInfoUrl, {
    signal,
    headers: { accept: "application/xml,text/xml" },
  });
  if (!fileInfoResponse.ok) {
    throw new Error("Yandex Music preview metadata is unavailable");
  }
  const fileInfo = await fileInfoResponse.text();
  const host = xmlValue(fileInfo, "host");
  const path = xmlValue(fileInfo, "path");
  const timestamp = xmlValue(fileInfo, "ts");
  const secret = xmlValue(fileInfo, "s");
  validateFileInfo(host, path, timestamp, secret);

  const signature = md5Hex(`${SIGNATURE_SALT}${path.slice(1)}${secret}`);
  return `https://${host}/get-mp3/${signature}/${timestamp}${path}`;
}

export function md5Hex(value: string): string {
  const bytes = new TextEncoder().encode(value);
  const paddedLength = Math.ceil((bytes.length + 9) / 64) * 64;
  const buffer = new Uint8Array(paddedLength);
  buffer.set(bytes);
  buffer[bytes.length] = 0x80;
  const view = new DataView(buffer.buffer);
  const bitLength = bytes.length * 8;
  view.setUint32(paddedLength - 8, bitLength >>> 0, true);
  view.setUint32(
    paddedLength - 4,
    Math.floor(bitLength / 0x1_0000_0000),
    true,
  );

  let first = 0x67452301;
  let second = 0xefcdab89;
  let third = 0x98badcfe;
  let fourth = 0x10325476;
  for (let offset = 0; offset < paddedLength; offset += 64) {
    const words = Array.from(
      { length: 16 },
      (_, index) => view.getUint32(offset + index * 4, true),
    );
    let a = first;
    let b = second;
    let c = third;
    let d = fourth;
    for (let index = 0; index < 64; index += 1) {
      let mixed: number;
      let wordIndex: number;
      if (index < 16) {
        mixed = (b & c) | (~b & d);
        wordIndex = index;
      } else if (index < 32) {
        mixed = (d & b) | (~d & c);
        wordIndex = (5 * index + 1) % 16;
      } else if (index < 48) {
        mixed = b ^ c ^ d;
        wordIndex = (3 * index + 5) % 16;
      } else {
        mixed = c ^ (b | ~d);
        wordIndex = (7 * index) % 16;
      }
      const sum =
        (a + mixed + MD5_CONSTANTS[index] + words[wordIndex]) >>> 0;
      a = d;
      d = c;
      c = b;
      b = (b + rotateLeft(sum, MD5_SHIFTS[index])) >>> 0;
    }
    first = (first + a) >>> 0;
    second = (second + b) >>> 0;
    third = (third + c) >>> 0;
    fourth = (fourth + d) >>> 0;
  }

  const digest = new Uint8Array(16);
  const digestView = new DataView(digest.buffer);
  digestView.setUint32(0, first, true);
  digestView.setUint32(4, second, true);
  digestView.setUint32(8, third, true);
  digestView.setUint32(12, fourth, true);
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

function safeFileInfoUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Yandex Music returned invalid preview metadata");
  }
  if (
    url.protocol !== "https:" ||
    url.hostname !== "storage.mds.yandex.net" ||
    !/^\/file-download-info\/[A-Za-z0-9._-]+\/preview$/.test(url.pathname)
  ) {
    throw new Error("Yandex Music returned an unsupported preview source");
  }
  return url;
}

function validateFileInfo(
  host: string,
  path: string,
  timestamp: string,
  secret: string,
): void {
  if (!/^[a-z0-9-]+\.storage\.yandex\.net$/i.test(host)) {
    throw new Error("Yandex Music returned an invalid audio host");
  }
  if (
    !path.startsWith("/") ||
    path.length > 2_048 ||
    /[\u0000-\u001f\\]/.test(path) ||
    !/^[0-9a-f]+$/i.test(timestamp) ||
    !/^[A-Za-z0-9]+$/.test(secret)
  ) {
    throw new Error("Yandex Music returned invalid audio metadata");
  }
}

function xmlValue(xml: string, name: string): string {
  const match = xml.match(new RegExp(`<${name}>([^<]+)</${name}>`));
  return match ? decodeXml(match[1].trim()) : "";
}

function decodeXml(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function rotateLeft(value: number, bits: number): number {
  return ((value << bits) | (value >>> (32 - bits))) >>> 0;
}

function isObject(value: JsonValue): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: JsonValue | undefined): string {
  return typeof value === "string" ? value : "";
}

function numberValue(value: JsonValue | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
