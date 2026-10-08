export type MediaKind = "audio" | "video";

export type TargetFormat = {
  id: string;
  label: string;
  extension: string;
  mimeType: string;
  kind: MediaKind;
};

export const AUDIO_TARGETS: TargetFormat[] = [
  {
    id: "mp3",
    label: "MP3",
    extension: "mp3",
    mimeType: "audio/mpeg",
    kind: "audio",
  },
  {
    id: "wav",
    label: "WAV",
    extension: "wav",
    mimeType: "audio/wav",
    kind: "audio",
  },
  {
    id: "aac",
    label: "AAC",
    extension: "aac",
    mimeType: "audio/aac",
    kind: "audio",
  },
  {
    id: "flac",
    label: "FLAC",
    extension: "flac",
    mimeType: "audio/flac",
    kind: "audio",
  },
  {
    id: "ogg",
    label: "OGG",
    extension: "ogg",
    mimeType: "audio/ogg",
    kind: "audio",
  },
];

export const VIDEO_TARGETS: TargetFormat[] = [
  {
    id: "mp4",
    label: "MP4",
    extension: "mp4",
    mimeType: "video/mp4",
    kind: "video",
  },
  {
    id: "webm",
    label: "WebM",
    extension: "webm",
    mimeType: "video/webm",
    kind: "video",
  },
  {
    id: "mkv",
    label: "MKV",
    extension: "mkv",
    mimeType: "video/x-matroska",
    kind: "video",
  },
  {
    id: "mov",
    label: "MOV",
    extension: "mov",
    mimeType: "video/quicktime",
    kind: "video",
  },
];

export const ALL_TARGETS: TargetFormat[] = [...AUDIO_TARGETS, ...VIDEO_TARGETS];

const AUDIO_EXTENSIONS = new Set([
  "mp3",
  "wav",
  "aac",
  "flac",
  "ogg",
  "oga",
  "m4a",
  "wma",
  "opus",
  "aiff",
  "aif",
]);

const VIDEO_EXTENSIONS = new Set([
  "mp4",
  "webm",
  "mkv",
  "mov",
  "avi",
  "wmv",
  "flv",
  "m4v",
  "mpeg",
  "mpg",
  "3gp",
  "ts",
]);

const ACCEPTED_EXTENSIONS = new Set([...AUDIO_EXTENSIONS, ...VIDEO_EXTENSIONS]);

export function getExtension(filename: string): string {
  const parts = filename.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

export function isAcceptedInput(filename: string, mimeType?: string): boolean {
  const ext = getExtension(filename);
  if (ACCEPTED_EXTENSIONS.has(ext)) return true;
  if (!mimeType) return false;
  return mimeType.startsWith("audio/") || mimeType.startsWith("video/");
}

export function detectMediaKind(
  filename: string,
  mimeType?: string,
): MediaKind | null {
  const ext = getExtension(filename);
  if (AUDIO_EXTENSIONS.has(ext)) return "audio";
  if (VIDEO_EXTENSIONS.has(ext)) return "video";
  if (mimeType?.startsWith("audio/")) return "audio";
  if (mimeType?.startsWith("video/")) return "video";
  return null;
}

/** Video sources get audio + video targets; audio sources get audio only. */
export function getTargetsForInput(
  filename: string,
  mimeType?: string,
): TargetFormat[] {
  const kind = detectMediaKind(filename, mimeType);
  if (kind === "audio") return AUDIO_TARGETS;
  if (kind === "video") return ALL_TARGETS;
  return ALL_TARGETS;
}

export function getTargetById(id: string): TargetFormat | undefined {
  return ALL_TARGETS.find((t) => t.id === id);
}

/** FFmpeg output args per target format (input path is prepended separately). */
export function getFfmpegArgsForTarget(targetId: string): string[] {
  switch (targetId) {
    case "mp3":
      return ["-vn", "-acodec", "libmp3lame", "-q:a", "2"];
    case "wav":
      return ["-vn", "-acodec", "pcm_s16le"];
    case "aac":
      return ["-vn", "-acodec", "aac", "-b:a", "192k"];
    case "flac":
      return ["-vn", "-acodec", "flac"];
    case "ogg":
      return ["-vn", "-acodec", "libvorbis", "-q:a", "5"];
    case "mp4":
      return [
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        "23",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-movflags",
        "+faststart",
      ];
    case "webm":
      return [
        "-c:v",
        "libvpx-vp9",
        "-crf",
        "30",
        "-b:v",
        "0",
        "-c:a",
        "libopus",
        "-b:a",
        "128k",
      ];
    case "mkv":
      return [
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        "23",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
      ];
    case "mov":
      return [
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        "23",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
      ];
    default:
      throw new Error(`Unsupported target format: ${targetId}`);
  }
}
