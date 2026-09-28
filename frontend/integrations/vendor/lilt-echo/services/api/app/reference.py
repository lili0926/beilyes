"""Load operator-generated full-mix or separated-vocal reference artifacts.

The API never fetches music, decodes source audio, or accepts provider cookies.
Run the local analyzer separately on audio you are authorized to use, then
point ``REFERENCE_CONTOUR_DIRECTORY`` at its derived JSON artifacts.
"""

from __future__ import annotations

import json
import math
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .models import ReferenceFrame, TimedLyric


MAX_ARTIFACT_BYTES = 8 * 1024 * 1024
MAX_REFERENCE_FRAMES = 50_000


def _hz(midi: float) -> float:
    return round(440 * (2 ** ((midi - 69) / 12)), 1)


def _safe_song_id(value: str) -> str:
    candidate = str(value or "")
    return candidate if re.fullmatch(r"[A-Za-z0-9_-]{1,64}", candidate) else ""


def _safe_profile(value: Any) -> dict[str, Any] | None:
    if not isinstance(value, dict):
        return None
    # JSON round-tripping enforces a simple data-only object and removes any
    # custom mapping subclasses from an integration adapter.
    try:
        encoded = json.dumps(value, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
        if len(encoded.encode("utf-8")) > 160_000:
            return None
        decoded = json.loads(encoded)
    except (TypeError, ValueError):
        return None
    return decoded if isinstance(decoded, dict) else None


@dataclass(frozen=True)
class ReferenceAnalysis:
    source: str
    frames: list[ReferenceFrame]
    profile: dict[str, Any] | None = None
    duration_ms: int = 0
    evidence: dict[str, Any] | None = None
    impression: str = ""
    title: str = ""
    lyrics: list[TimedLyric] | None = None


class ReferenceContourRepository:
    """Read only derived reference JSON; source audio never enters this API."""

    def __init__(self, directory: str | Path | None = None) -> None:
        configured = directory if directory is not None else os.getenv("REFERENCE_CONTOUR_DIRECTORY")
        self._directory = Path(configured).expanduser() if configured else None
        self._demo = ReferenceAnalysis(
            source="synthetic_demo",
            duration_ms=42000,
            frames=[
                ReferenceFrame(t_ms=t, hz=_hz(60 + 4 * math.sin(t / 2000)), confidence=0.8)
                for t in range(0, 42001, 100)
                if not (4000 < t < 4600 or 10000 < t < 12000)
            ],
        )

    def _read_artifact(self, song_id: str) -> ReferenceAnalysis | None:
        if not self._directory:
            return None
        safe_id = _safe_song_id(song_id)
        if not safe_id:
            return None
        candidate = self._directory / f"{safe_id}.json"
        try:
            if not candidate.is_file() or candidate.stat().st_size > MAX_ARTIFACT_BYTES:
                return None
            raw = json.loads(candidate.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return None
        if not isinstance(raw, dict) or raw.get("song_id") != safe_id:
            return None
        source = str(raw.get("source") or "authorized_reference")[:80]
        if source not in {"authorized_local_audio_full_mix", "separated_vocal_pyin"}:
            return None
        raw_frames = raw.get("frames")
        if not isinstance(raw_frames, list) or len(raw_frames) > MAX_REFERENCE_FRAMES:
            return None
        frames: list[ReferenceFrame] = []
        for item in raw_frames[:MAX_REFERENCE_FRAMES]:
            try:
                frames.append(ReferenceFrame.model_validate(item))
            except (TypeError, ValueError):
                continue
        frames.sort(key=lambda frame: frame.t_ms)
        lyrics = []
        raw_lyrics = raw.get("lyrics") or []
        if not isinstance(raw_lyrics, list):
            return None
        for line in raw_lyrics[:2000]:
            try:
                lyrics.append(TimedLyric.model_validate(line))
            except (TypeError, ValueError):
                continue
        try:
            duration = max(0, min(86_400_000, int(raw.get("duration_ms") or 0)))
        except (ValueError, TypeError, OverflowError):
            return None
        return ReferenceAnalysis(
            source=source, frames=frames, profile=_safe_profile(raw.get("profile")),
            duration_ms=duration, evidence=_safe_profile(raw.get("evidence")),
            impression=str(raw.get("impression") or "")[:16000],
            title=str(raw.get("title") or safe_id)[:180],
            lyrics=lyrics,
        )

    async def songs(self) -> list[dict[str, Any]]:
        songs = [{"id": "demo-signal", "title": "合成演示", "duration_ms": 42000}]
        if self._directory and self._directory.is_dir():
            for path in sorted(self._directory.glob("*.json"))[:100]:
                result = self._read_artifact(path.stem)
                if result:
                    songs = [song for song in songs if song["id"] != path.stem]
                    songs.append({"id": path.stem, "title": result.title, "duration_ms": result.duration_ms})
        return songs

    async def analysis(self, song_id: str) -> ReferenceAnalysis | None:
        # Artifacts are capped at 8 MiB, so a bounded synchronous read keeps this
        # adapter simple and avoids retaining executor threads in small hosts.
        artifact = self._read_artifact(song_id)
        if artifact:
            return artifact
        return self._demo if song_id == "demo-signal" else None

    async def get(self, song_id: str) -> list[ReferenceFrame]:
        result = await self.analysis(song_id)
        return [frame.model_copy(deep=True) for frame in result.frames] if result else []

    async def profile(self, song_id: str) -> dict[str, Any] | None:
        result = await self.analysis(song_id)
        return json.loads(json.dumps(result.profile)) if result and result.profile else None
