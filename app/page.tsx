"use client";

import { useMemo, useRef, useState, type DragEvent, type FormEvent } from "react";
import {
  getTargetsForInput,
  isAcceptedInput,
  type TargetFormat,
} from "@/lib/formats";

type Status =
  | { kind: "idle" }
  | { kind: "converting" }
  | { kind: "done"; filename: string }
  | { kind: "error"; message: string };

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function filenameFromDisposition(header: string | null, fallback: string): string {
  if (!header) return fallback;
  const match = /filename\*?=(?:UTF-8''|")?([^";]+)"?/i.exec(header);
  if (!match?.[1]) return fallback;
  try {
    return decodeURIComponent(match[1].replace(/"/g, "").trim());
  } catch {
    return match[1].replace(/"/g, "").trim();
  }
}

export default function HomePage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [formatId, setFormatId] = useState("mp3");
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const targets: TargetFormat[] = useMemo(() => {
    if (!file) {
      return getTargetsForInput("video.mp4", "video/mp4");
    }
    return getTargetsForInput(file.name, file.type);
  }, [file]);

  const selectedFormat = targets.find((t) => t.id === formatId) ?? targets[0];

  function assignFile(next: File | null) {
    if (!next) {
      setFile(null);
      setStatus({ kind: "idle" });
      return;
    }
    if (!isAcceptedInput(next.name, next.type)) {
      setStatus({
        kind: "error",
        message:
          "Unsupported file type. Choose a common video or audio file (mp4, webm, mkv, mov, avi, mp3, wav, aac, flac, ogg, m4a, …).",
      });
      return;
    }
    setFile(next);
    setStatus({ kind: "idle" });
    const nextTargets = getTargetsForInput(next.name, next.type);
    if (!nextTargets.some((t) => t.id === formatId)) {
      setFormatId(nextTargets[0]?.id ?? "mp3");
    }
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) assignFile(dropped);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!file || !selectedFormat) return;

    setStatus({ kind: "converting" });

    try {
      const body = new FormData();
      body.append("file", file);
      body.append("format", selectedFormat.id);

      const response = await fetch("/api/convert", {
        method: "POST",
        body,
      });

      if (!response.ok) {
        let message = `Conversion failed (${response.status}).`;
        try {
          const data = (await response.json()) as { error?: string };
          if (data.error) message = data.error;
        } catch {
          // keep default message
        }
        setStatus({ kind: "error", message });
        return;
      }

      const blob = await response.blob();
      const downloadName = filenameFromDisposition(
        response.headers.get("Content-Disposition"),
        `${file.name.replace(/\.[^.]+$/, "")}.${selectedFormat.extension}`,
      );

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = downloadName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      setStatus({ kind: "done", filename: downloadName });
    } catch (err) {
      setStatus({
        kind: "error",
        message:
          err instanceof Error
            ? err.message
            : "Network error while converting. Is the dev server running?",
      });
    }
  }

  return (
    <main className="shell">
      <h1 className="brand">Media Converter</h1>
      <p className="lede">
        Drop a video or audio file, pick a target format, and download the
        result — conversion runs on your machine via FFmpeg.
      </p>

      <form className="panel" onSubmit={onSubmit}>
        <label
          className={[
            "dropzone",
            dragging ? "is-dragging" : "",
            file ? "has-file" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onDragEnter={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragging(false);
          }}
          onDrop={onDrop}
        >
          <input
            ref={inputRef}
            type="file"
            accept="audio/*,video/*,.mp4,.webm,.mkv,.mov,.avi,.mp3,.wav,.aac,.flac,.ogg,.m4a,.wma,.opus,.m4v,.mpeg,.mpg,.3gp"
            onChange={(e) => assignFile(e.target.files?.[0] ?? null)}
          />
          <p className="drop-title">
            {file ? "File ready" : "Drop media here"}
          </p>
          <p className="drop-hint">
            {file
              ? "Click to choose a different file"
              : "or click to browse — video and audio supported"}
          </p>
          {file ? (
            <div className="file-chip">
              <span title={file.name}>
                {file.name} · {formatBytes(file.size)}
              </span>
            </div>
          ) : null}
        </label>

        <div className="controls">
          <div className="field">
            <label htmlFor="format">Convert to</label>
            <select
              id="format"
              value={selectedFormat?.id ?? ""}
              disabled={!file || status.kind === "converting"}
              onChange={(e) => setFormatId(e.target.value)}
            >
              {targets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label} ({t.kind})
                </option>
              ))}
            </select>
          </div>

          <div className="actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!file || status.kind === "converting"}
            >
              {status.kind === "converting" ? "Converting…" : "Convert"}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={!file || status.kind === "converting"}
              onClick={() => {
                assignFile(null);
                setFormatId("mp3");
                if (inputRef.current) inputRef.current.value = "";
              }}
            >
              Clear
            </button>
          </div>
        </div>

        <div className="status" aria-live="polite">
          {status.kind === "converting" ? (
            <p className="status-busy">Converting with FFmpeg…</p>
          ) : null}
          {status.kind === "error" ? (
            <p className="status-error">{status.message}</p>
          ) : null}
          {status.kind === "done" ? (
            <p className="status-ok">Downloaded {status.filename}</p>
          ) : null}
        </div>
      </form>

      <p className="footer-note">
        Requires FFmpeg on your PATH. Large files may take a few minutes.
      </p>
    </main>
  );
}
