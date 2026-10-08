import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { getFfmpegArgsForTarget, type TargetFormat } from "./formats";

const CONVERT_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes for large local files

export type ConvertResult = {
  outputPath: string;
  inputPath: string;
  workDir: string;
  filename: string;
  mimeType: string;
};

export async function ensureFfmpegAvailable(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const proc = spawn("ffmpeg", ["-version"]);
    let stderr = "";
    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    proc.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "ENOENT") {
        reject(
          new Error(
            "FFmpeg was not found on PATH. Install it (e.g. winget install ffmpeg) and restart the terminal.",
          ),
        );
        return;
      }
      reject(err);
    });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg check failed: ${stderr || `exit ${code}`}`));
    });
  });
}

export async function writeUploadToTemp(
  file: File,
): Promise<{ workDir: string; inputPath: string }> {
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "media-convert-"));
  const safeName = path.basename(file.name).replace(/[^\w.\-()+ ]+/g, "_");
  const inputPath = path.join(workDir, `input-${randomUUID()}-${safeName}`);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(inputPath, buffer);
  return { workDir, inputPath };
}

export async function convertWithFfmpeg(
  inputPath: string,
  workDir: string,
  originalName: string,
  target: TargetFormat,
): Promise<ConvertResult> {
  const base = path.parse(originalName).name || "converted";
  const safeBase = base.replace(/[^\w.\-()+ ]+/g, "_");
  const filename = `${safeBase}.${target.extension}`;
  const outputPath = path.join(workDir, `output-${randomUUID()}.${target.extension}`);

  const codecArgs = getFfmpegArgsForTarget(target.id);
  const args = [
    "-y",
    "-i",
    inputPath,
    ...codecArgs,
    outputPath,
  ];

  await runFfmpeg(args);

  return {
    outputPath,
    inputPath,
    workDir,
    filename,
    mimeType: target.mimeType,
  };
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", args);
    let stderr = "";

    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      reject(new Error("Conversion timed out after 10 minutes."));
    }, CONVERT_TIMEOUT_MS);

    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
      if (stderr.length > 50_000) {
        stderr = stderr.slice(-25_000);
      }
    });

    proc.on("error", (err: NodeJS.ErrnoException) => {
      clearTimeout(timer);
      if (err.code === "ENOENT") {
        reject(
          new Error(
            "FFmpeg was not found on PATH. Install it (e.g. winget install ffmpeg) and restart the terminal.",
          ),
        );
        return;
      }
      reject(err);
    });

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve();
        return;
      }
      const hint = stderr.trim().split("\n").slice(-8).join("\n");
      reject(
        new Error(
          hint
            ? `FFmpeg failed (exit ${code}):\n${hint}`
            : `FFmpeg failed with exit code ${code}.`,
        ),
      );
    });
  });
}

export async function cleanupPaths(...paths: (string | undefined)[]): Promise<void> {
  for (const p of paths) {
    if (!p) continue;
    try {
      await fs.rm(p, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  }
}
