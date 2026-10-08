import { createReadStream, promises as fs } from "node:fs";
import { Readable } from "node:stream";
import { NextRequest, NextResponse } from "next/server";
import {
  cleanupPaths,
  convertWithFfmpeg,
  ensureFfmpegAvailable,
  writeUploadToTemp,
} from "@/lib/ffmpeg";
import {
  getTargetById,
  isAcceptedInput,
} from "@/lib/formats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Allow large local media uploads (bytes). */
export const maxDuration = 600;

export async function POST(request: NextRequest) {
  let workDir: string | undefined;
  let inputPath: string | undefined;
  let outputPath: string | undefined;

  try {
    await ensureFfmpegAvailable();

    const formData = await request.formData();
    const file = formData.get("file");
    const formatId = formData.get("format");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Missing media file. Attach a file under the field name \"file\"." },
        { status: 400 },
      );
    }

    if (typeof formatId !== "string" || !formatId) {
      return NextResponse.json(
        { error: "Missing target format. Send a \"format\" field (e.g. mp3, mp4)." },
        { status: 400 },
      );
    }

    if (!isAcceptedInput(file.name, file.type)) {
      return NextResponse.json(
        {
          error:
            "Unsupported input type. Use common video or audio files (mp4, webm, mkv, mov, avi, mp3, wav, aac, flac, ogg, m4a, …).",
        },
        { status: 400 },
      );
    }

    const target = getTargetById(formatId);
    if (!target) {
      return NextResponse.json(
        { error: `Unknown target format: ${formatId}` },
        { status: 400 },
      );
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "The uploaded file is empty." }, { status: 400 });
    }

    const written = await writeUploadToTemp(file);
    workDir = written.workDir;
    inputPath = written.inputPath;

    const result = await convertWithFfmpeg(
      inputPath,
      workDir,
      file.name,
      target,
    );
    outputPath = result.outputPath;

    const stat = await fs.stat(outputPath);
    const nodeStream = createReadStream(outputPath);
    const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream;

    // Clean up after the response finishes streaming
    const cleanup = async () => {
      await cleanupPaths(workDir);
    };
    nodeStream.on("close", () => {
      void cleanup();
    });
    nodeStream.on("error", () => {
      void cleanup();
    });

    const asciiName = result.filename.replace(/[^\x20-\x7E]/g, "_");
    const utf8Name = encodeURIComponent(result.filename);

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        "Content-Type": result.mimeType,
        "Content-Length": String(stat.size),
        "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${utf8Name}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    await cleanupPaths(workDir);
    const message =
      err instanceof Error ? err.message : "Conversion failed unexpectedly.";
    const status = message.includes("FFmpeg was not found") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
