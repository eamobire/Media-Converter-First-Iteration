# Media Converter

Local Next.js web app that converts video and audio with **FFmpeg**. Upload a file, choose a target format from the dropdown, and download the result. Everything runs on your machine at `http://localhost:3000`.

## Features

- Video → audio (e.g. MP4 → MP3)
- Video → video (e.g. MOV → MP4, WebM, MKV)
- Audio → audio (e.g. M4A → WAV, FLAC, OGG)
- Drag-and-drop upload and target format dropdown

**Audio targets:** MP3, WAV, AAC, FLAC, OGG  
**Video targets:** MP4, WebM, MKV, MOV

## Prerequisites

1. **Node.js** 18+ (LTS recommended)
2. **FFmpeg** installed and available on your `PATH`

### Install FFmpeg on Windows

```bash
winget install ffmpeg
```

Or with Chocolatey:

```bash
choco install ffmpeg
```

Then **close and reopen** your terminal, and confirm:

```bash
ffmpeg -version
```

## Setup

```bash
npm install
```

## Run (localhost)

**Easiest:** double-click [`Start.bat`](Start.bat). It installs dependencies if needed, opens your browser, and starts the app.

Or from a terminal:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Usage

1. Drop or select a video/audio file
2. Choose **Convert to** from the dropdown
3. Click **Convert** — the browser downloads the result when FFmpeg finishes

Large files can take several minutes. Practical upload size for local use is on the order of hundreds of MB (configured around 500 MB).

## Scripts

| Command       | Description              |
| ------------- | ------------------------ |
| `npm run dev` | Start development server |
| `npm run build` | Production build       |
| `npm start`   | Run production server    |

## How it works

The UI posts the file and target format to `POST /api/convert`. The API writes a temp copy, runs system FFmpeg, streams the output back as a download, then deletes temp files.
