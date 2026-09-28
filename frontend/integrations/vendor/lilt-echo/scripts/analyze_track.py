#!/usr/bin/env python3
"""Explicit, single-job local analysis. No catalog, room service or automatic uploads."""
from __future__ import annotations

import argparse
import asyncio
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "services/api"))
MAX_SECONDS = 720


def worker_module(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / "services/audio-analysis/python" / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def run(args, *, timeout=240, env=None):
    try:
        result = subprocess.run(args, check=True, capture_output=True, timeout=timeout, env=env)
    except (subprocess.SubprocessError, OSError):
        # stderr can contain source paths. Fail with the phase, not the body.
        raise RuntimeError(f"{Path(args[0]).name}_failed_or_timed_out") from None
    return result.stdout


def read_json(path, limit=160000):
    if path.stat().st_size > limit:
        raise ValueError("input_json_too_large")
    return json.loads(path.read_text(encoding="utf-8"))


def write_artifact(path, artifact):
    encoded = json.dumps(artifact, ensure_ascii=False, allow_nan=False, separators=(",", ":")).encode()
    if len(encoded) > 8 * 1024 * 1024:
        raise ValueError("artifact_too_large")
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary = tempfile.mkstemp(prefix=".analysis-", dir=path.parent)
    try:
        with os.fdopen(descriptor, "wb") as stream:
            stream.write(encoded)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        Path(temporary).unlink(missing_ok=True)


def compact_vocal_evidence(analysis):
    result = dict(analysis)
    pitch = dict(result.get("vocal_pitch") or {})
    frames = pitch.pop("frames", [])
    pitch["frame_count"] = len(frames)
    pitch["frame_storage"] = "artifact.frames"
    result["vocal_pitch"] = pitch
    return result


def hearing_windows(duration_ms, explicit):
    if explicit:
        starts = [round(float(value) * 1000) for value in explicit.split(",")]
        if len(starts) > 3:
            raise ValueError("at_most_three_hearing_windows")
    else:
        starts = [round(max(0, duration_ms - 20000) * fraction) for fraction in (.15, .5, .85)]
    starts = list(dict.fromkeys(starts))
    if any(start < 0 or start >= duration_ms for start in starts):
        raise ValueError("hearing_window_outside_track")
    return [(start, min(duration_ms, start + 20000)) for start in starts]


async def analyze_track(args):
    from app.model_gateway import ModelEndpoint, hear_clip, write_impression
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,64}", args.song_id):
        raise ValueError("invalid_song_id")
    if not args.input.is_file():
        raise ValueError("authorized_local_audio_file_required")
    if args.output.exists() and not args.replace:
        raise ValueError("output_exists_use_explicit_replace")
    if args.write_impression and not args.hear:
        raise ValueError("write_impression_requires_hear_not_just_acoustic_numbers")
    if args.hear:
        ModelEndpoint.from_env("HEARING")
    if args.write_impression:
        ModelEndpoint.from_env("WRITER")
    context = read_json(args.context_json) if args.context_json else {}
    if not isinstance(context, dict):
        raise ValueError("context_must_be_object")
    lyrics = read_json(args.lyrics_json) if args.lyrics_json else []
    if not isinstance(lyrics, list) or len(lyrics) > 2000:
        raise ValueError("lyrics_must_be_bounded_list")
    lyrics = [{"at_ms": int(line["at_ms"]), "text": str(line.get("text") or "")[:500],
               "translation": str(line.get("translation") or "")[:500]} for line in lyrics]
    song = {"id": args.song_id, "title": args.title or args.song_id, "artist": args.artist}
    with tempfile.TemporaryDirectory(prefix="singalong-analysis-") as temporary:
        temporary = Path(temporary)
        wav = temporary / "input.wav"
        run(["ffmpeg", "-nostdin", "-v", "error", "-i", str(args.input.resolve()),
             "-t", str(MAX_SECONDS), "-vn", "-ac", "2", "-ar", "44100", "-c:a", "pcm_s16le", str(wav)])
        # Existing low-dependency full-mix extractor remains the honest fallback.
        mix = temporary / "mix.json"
        run(["node", str(ROOT / "services/audio-analysis/src/analyze-file.mjs"),
             "--input", str(wav), "--song-id", args.song_id, "--output", str(mix)])
        artifact = read_json(mix, 8 * 1024 * 1024)
        local = worker_module("analyze").analyze(wav, force_fallback=args.basic)
        evidence = {"acoustic_analysis": local, "expressive_motion": local.get("expressive_motion"),
                    "short_windows": [], "limitations": ["Acoustic measurements do not determine emotion."]}
        if args.separate_vocals:
            environment = os.environ.copy()
            environment.update({name: "2" for name in ("OMP_NUM_THREADS", "MKL_NUM_THREADS", "OPENBLAS_NUM_THREADS")})
            run([args.demucs_python or sys.executable, "-m", "demucs", "-d", args.device,
                 "-n", "htdemucs", "--two-stems", "vocals", "--shifts", "0", "-j", "1",
                 "-o", str(temporary / "separated"), str(wav)], timeout=1800, env=environment)
            vocals = temporary / "separated/htdemucs/input/vocals.wav"
            accompaniment = vocals.with_name("no_vocals.wav")
            raw = run([sys.executable, str(ROOT / "services/audio-analysis/python/analyze_vocals.py"),
                       "--vocals", str(vocals), "--accompaniment", str(accompaniment)], timeout=600)
            vocal = json.loads(raw)
            pitch = vocal["vocal_pitch"]
            artifact.update({"source": "separated_vocal_pyin", "reference_kind": "separated_vocal_pyin",
                             "frames": pitch["frames"], "frame_count": len(pitch["frames"]),
                             "voiced_ratio": pitch["voiced_ratio"], "duration_ms": pitch["duration_ms"]})
            evidence["vocal_deep"] = {"local_vocal_motion": compact_vocal_evidence(vocal),
                                      "isolated_vocal_witnesses": []}
        if args.hear:
            print("Explicit hearing enabled: up to three short original-mix clips will be sent to HEARING_URL.")
            for start, end in hearing_windows(artifact["duration_ms"], args.windows):
                clip = run(["ffmpeg", "-nostdin", "-v", "error", "-ss", str(start / 1000),
                            "-i", str(wav), "-t", str((end - start) / 1000), "-ac", "1", "-ar", "24000",
                            "-f", "mp3", "-b:a", "64k", "pipe:1"])
                nearby = [line for line in lyrics if start <= line["at_ms"] <= end][:24]
                observation = await hear_clip(clip, song, start, end, nearby)
                evidence["short_windows"].append(observation)
        artifact.update({"title": song["title"], "artist": song["artist"],
                         "evidence": evidence, "impression": "", "lyrics": lyrics,
                         "input_limit_seconds": MAX_SECONDS})
        if args.write_impression:
            context.setdefault("lyric_memory", [
                f"原文：{line['text']}｜中译：{line['translation']}" for line in lyrics[:48]])
            artifact["impression"] = await write_impression(song, evidence, context=context)
        write_artifact(args.output, artifact)
        print(json.dumps({"song_id": args.song_id, "source": artifact["source"],
                          "frames": len(artifact["frames"]), "heard_windows": len(evidence["short_windows"]),
                          "impression_generated": bool(artifact["impression"])}))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--song-id", required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--title", default="")
    parser.add_argument("--artist", default="")
    parser.add_argument("--basic", action="store_true", help="Use coarse standard-library acoustic fallback")
    parser.add_argument("--separate-vocals", action="store_true")
    parser.add_argument("--demucs-python", help="Optional separate Demucs virtual environment interpreter")
    parser.add_argument("--device", choices=["cpu", "cuda"], default="cpu")
    parser.add_argument("--hear", action="store_true", help="Explicitly send up to 3 short MP3 clips to configured model")
    parser.add_argument("--windows", help="Up to 3 comma-separated clip start times in seconds")
    parser.add_argument("--write-impression", action="store_true", help="Send evidence and optional context to text model")
    parser.add_argument("--lyrics-json", type=Path)
    parser.add_argument("--context-json", type=Path, help="Optional explicitly authorized private context; never commit it")
    parser.add_argument("--env-file", type=Path, help="Explicit private model configuration file; ignored by Git")
    parser.add_argument("--replace", action="store_true", help="Explicitly replace an existing derived artifact")
    args = parser.parse_args()
    try:
        if args.env_file:
            from dotenv import load_dotenv
            if not args.env_file.is_file():
                raise ValueError("env_file_missing")
            load_dotenv(args.env_file, override=False)
        asyncio.run(analyze_track(args))
    except (RuntimeError, ValueError, OSError) as exc:
        # Exceptions from codecs/libraries can contain file names; keep diagnostics bounded.
        print(f"Analysis did not complete ({type(exc).__name__}); check configuration and dependencies. Existing output was not replaced.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
