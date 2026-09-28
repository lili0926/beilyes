#!/usr/bin/env python3
"""Derive compact, non-reversible vocal evidence from temporary Demucs stems.

The output deliberately describes measurable motion instead of assigning an
emotion or claiming a vocal technique.  Source audio and stems are owned by
the caller's temporary directory and are never copied by this worker.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path
from typing import Any


SCHEMA_VERSION = "vocal-deep.v1"
VOCAL_PITCH_ANALYSIS_VERSION = 1
VOCAL_PITCH_SOURCE = "separated_vocal_pyin"
VOCAL_PITCH_MIN_PROBABILITY = 0.55
VOCAL_PITCH_MIN_SHARE = 0.18


def _r(value: float, digits: int = 3) -> float:
    return round(float(value), digits)


def _clamp(value: float) -> float:
    return max(0.0, min(1.0, float(value)))


def _percentile(values: Any, q: float, fallback: float = 0.0) -> float:
    import numpy as np

    clean = np.asarray(values, dtype=float)
    clean = clean[np.isfinite(clean)]
    return float(np.percentile(clean, q)) if clean.size else fallback


def _median(values: Any, fallback: float = 0.0) -> float:
    import numpy as np

    clean = np.asarray(values, dtype=float)
    clean = clean[np.isfinite(clean)]
    return float(np.median(clean)) if clean.size else fallback


def _semitones(hz: Any) -> Any:
    import numpy as np

    values = np.asarray(hz, dtype=float)
    return 12.0 * np.log2(np.maximum(values, 1e-6) / 440.0) + 69.0


def build_vocal_pitch(
    *,
    f0: Any,
    voiced_flag: Any,
    voiced_probability: Any,
    pitch_times: Any,
    vocal_db: Any,
    vocal_share: Any,
    frame_times: Any,
    presence_floor: float,
    duration_seconds: float,
    frame_hop_ms: float,
) -> dict[str, Any]:
    """Build the public, irreversible pYIN contour from aligned frame values.

    This helper intentionally uses only scalar frame values so its quality
    gates can be tested without loading librosa or running source separation.
    """
    pitch_count = min(
        len(f0), len(voiced_flag), len(voiced_probability), len(pitch_times)
    )
    level_count = min(len(vocal_db), len(vocal_share), len(frame_times))
    frames: list[dict[str, Any]] = []
    level_index = 0
    for index in range(pitch_count):
        try:
            at_seconds = float(pitch_times[index])
            hz = float(f0[index])
            probability = float(voiced_probability[index])
            voiced = bool(voiced_flag[index])
        except (TypeError, ValueError):
            continue
        if (
            not voiced
            or not math.isfinite(at_seconds)
            or at_seconds < 0
            or not math.isfinite(hz)
            or hz <= 0
            or not math.isfinite(probability)
            or probability < VOCAL_PITCH_MIN_PROBABILITY
            or not level_count
        ):
            continue

        while level_index + 1 < level_count:
            current_distance = abs(float(frame_times[level_index]) - at_seconds)
            next_distance = abs(float(frame_times[level_index + 1]) - at_seconds)
            if next_distance > current_distance:
                break
            level_index += 1
        try:
            level = float(vocal_db[level_index])
            share = float(vocal_share[level_index])
        except (TypeError, ValueError):
            continue
        if (
            not math.isfinite(level)
            or level < float(presence_floor)
            or not math.isfinite(share)
            or share < VOCAL_PITCH_MIN_SHARE
        ):
            continue
        frames.append({
            "t_ms": max(0, int(round(at_seconds * 1000.0))),
            "hz": _r(hz, 2),
            "confidence": _r(_clamp(probability)),
        })

    return {
        "analysis_version": VOCAL_PITCH_ANALYSIS_VERSION,
        "source": VOCAL_PITCH_SOURCE,
        "duration_ms": max(0, int(round(float(duration_seconds) * 1000.0))),
        "frame_hop_ms": _r(frame_hop_ms, 3),
        "voiced_ratio": _r(len(frames) / max(1, pitch_count)),
        "frames": frames,
        "limitations": [
            "source separation can leak accompaniment or omit vocal energy",
            "pYIN can octave-shift or fail on breathy, spoken, choral, or overlapping voices",
        ],
    }


def analyze(vocals_path: Path, accompaniment_path: Path) -> dict[str, Any]:
    import librosa
    import numpy as np

    sample_rate = 16000
    vocals, _ = librosa.load(vocals_path, sr=sample_rate, mono=True)
    accompaniment, _ = librosa.load(accompaniment_path, sr=sample_rate, mono=True)
    sample_count = min(len(vocals), len(accompaniment))
    vocals = np.nan_to_num(vocals[:sample_count], nan=0.0, posinf=0.0, neginf=0.0)
    accompaniment = np.nan_to_num(
        accompaniment[:sample_count], nan=0.0, posinf=0.0, neginf=0.0
    )
    duration = sample_count / sample_rate if sample_rate else 0.0
    if duration < 1.0:
        raise ValueError("separated audio is shorter than one second")

    hop = 512
    frame_length = 2048
    vocals_rms = librosa.feature.rms(
        y=vocals, frame_length=frame_length, hop_length=hop
    )[0]
    accompaniment_rms = librosa.feature.rms(
        y=accompaniment, frame_length=frame_length, hop_length=hop
    )[0]
    frame_count = min(len(vocals_rms), len(accompaniment_rms))
    vocals_rms = vocals_rms[:frame_count]
    accompaniment_rms = accompaniment_rms[:frame_count]
    frame_times = librosa.frames_to_time(
        np.arange(frame_count), sr=sample_rate, hop_length=hop
    )
    vocal_db = librosa.amplitude_to_db(np.maximum(vocals_rms, 1e-8), ref=1.0)
    accompaniment_db = librosa.amplitude_to_db(
        np.maximum(accompaniment_rms, 1e-8), ref=1.0
    )
    vocal_share = 1.0 / (
        1.0 + np.power(10.0, (accompaniment_db - vocal_db) / 20.0)
    )
    # A track with nearly continuous, even-level vocals has no quiet 20th
    # percentile to lift from. Cap the adaptive floor below the strong-vocal
    # region so a steady sustained phrase does not reject every pYIN frame.
    presence_floor = max(
        -58.0,
        min(
            _percentile(vocal_db, 20, -58.0) + 7.0,
            _percentile(vocal_db, 85, -52.0) - 6.0,
        ),
    )

    f0, voiced_flag, voiced_probability = librosa.pyin(
        vocals,
        fmin=librosa.note_to_hz("C2"),
        fmax=librosa.note_to_hz("C7"),
        sr=sample_rate,
        frame_length=frame_length,
        hop_length=hop,
    )
    f0 = np.asarray(f0, dtype=float)
    voiced_flag = np.asarray(voiced_flag, dtype=bool)
    voiced_probability = np.nan_to_num(
        np.asarray(voiced_probability, dtype=float), nan=0.0
    )
    pitch_times = librosa.times_like(f0, sr=sample_rate, hop_length=hop)
    vocal_pitch = build_vocal_pitch(
        f0=f0,
        voiced_flag=voiced_flag,
        voiced_probability=voiced_probability,
        pitch_times=pitch_times,
        vocal_db=vocal_db,
        vocal_share=vocal_share,
        frame_times=frame_times,
        presence_floor=presence_floor,
        duration_seconds=duration,
        frame_hop_ms=1000.0 * hop / sample_rate,
    )
    centroid = librosa.feature.spectral_centroid(
        y=vocals, sr=sample_rate, hop_length=hop
    )[0]
    bandwidth = librosa.feature.spectral_bandwidth(
        y=vocals, sr=sample_rate, hop_length=hop
    )[0]

    window_count = max(6, min(14, int(math.ceil(duration / 14.0))))
    windows: list[dict[str, Any]] = []
    for index in range(window_count):
        start = duration * index / window_count
        end = duration * (index + 1) / window_count
        mix_mask = (frame_times >= start) & (
            frame_times < end if index + 1 < window_count else frame_times <= end
        )
        pitch_mask = (pitch_times >= start) & (
            pitch_times < end if index + 1 < window_count else pitch_times <= end
        )
        mix_positions = np.flatnonzero(mix_mask)
        pitch_positions = np.flatnonzero(pitch_mask)
        if not mix_positions.size:
            continue

        local_f0 = f0[pitch_positions] if pitch_positions.size else np.asarray([])
        local_voiced = (
            voiced_flag[pitch_positions] & np.isfinite(local_f0)
            if pitch_positions.size else np.asarray([], dtype=bool)
        )
        voiced_f0 = local_f0[local_voiced]
        voiced_ratio = float(np.mean(local_voiced)) if local_voiced.size else 0.0
        median_f0 = _median(voiced_f0) if voiced_f0.size else 0.0
        pitch_range = 0.0
        ascent = 0.0
        continuity = 0.0
        if voiced_f0.size >= 4:
            midi = _semitones(voiced_f0)
            pitch_range = max(0.0, _percentile(midi, 90) - _percentile(midi, 10))
            third = max(1, len(midi) // 3)
            ascent = _median(midi[-third:]) - _median(midi[:third])
            jumps = np.abs(np.diff(midi))
            stable_step = 1.0 - _clamp(_median(jumps) / 3.0)
            continuity = _clamp(0.58 * voiced_ratio + 0.42 * stable_step)

        vocal_level = _median(vocal_db[mix_positions], -80.0)
        present = vocal_level >= presence_floor
        share = _median(vocal_share[mix_positions])
        width = _median(bandwidth[mix_positions])
        center = _median(centroid[mix_positions])
        windows.append({
            "start": _r(start),
            "end": _r(end),
            "vocal_present": bool(present),
            "vocal_share_against_accompaniment": _r(share),
            "vocal_level_db": _r(vocal_level, 1),
            "voiced_ratio": _r(voiced_ratio),
            "median_pitch_hz": _r(median_f0, 1) if median_f0 > 0 else None,
            "pitch_span_semitones": _r(pitch_range, 2),
            "pitch_direction_semitones": _r(ascent, 2),
            "pitch_continuity": _r(continuity),
            "vocal_brightness_hz": _r(center, 1),
            "vocal_spectral_width_hz": _r(width, 1),
        })

    present_windows = [item for item in windows if item["vocal_present"]]
    pitch_values = [
        float(item["median_pitch_hz"])
        for item in present_windows
        if item.get("median_pitch_hz")
    ]
    high_cutoff = _percentile(pitch_values, 78) if pitch_values else 0.0

    rises = sorted(
        [
            {
                "start": item["start"],
                "end": item["end"],
                "rise_semitones": item["pitch_direction_semitones"],
                "pitch_continuity": item["pitch_continuity"],
                "voiced_ratio": item["voiced_ratio"],
            }
            for item in present_windows
            if float(item["pitch_direction_semitones"]) >= 2.3
            and float(item["voiced_ratio"]) >= 0.22
        ],
        key=lambda item: (
            float(item["rise_semitones"]) * (0.5 + float(item["pitch_continuity"]))
        ),
        reverse=True,
    )[:5]
    high_register = sorted(
        [
            {
                "start": item["start"],
                "end": item["end"],
                "median_pitch_hz": item["median_pitch_hz"],
                "pitch_span_semitones": item["pitch_span_semitones"],
                "pitch_continuity": item["pitch_continuity"],
            }
            for item in present_windows
            if high_cutoff and float(item.get("median_pitch_hz") or 0) >= high_cutoff
        ],
        key=lambda item: float(item["median_pitch_hz"]),
        reverse=True,
    )[:4]

    entrances: list[dict[str, Any]] = []
    for previous, current in zip(windows, windows[1:]):
        delta = float(current["vocal_share_against_accompaniment"]) - float(
            previous["vocal_share_against_accompaniment"]
        )
        if (not previous["vocal_present"] and current["vocal_present"]) or delta >= 0.24:
            entrances.append({
                "at": current["start"],
                "kind": "voice_enters_or_moves_forward",
                "share_change": _r(delta),
            })
        elif (previous["vocal_present"] and not current["vocal_present"]) or delta <= -0.24:
            entrances.append({
                "at": current["start"],
                "kind": "voice_recedes_or_drops_out",
                "share_change": _r(delta),
            })

    layering = sorted(
        [
            {
                "start": item["start"],
                "end": item["end"],
                "spectral_width_hz": item["vocal_spectral_width_hz"],
                "vocal_share": item["vocal_share_against_accompaniment"],
                "voiced_ratio": item["voiced_ratio"],
                "meaning": "possible widened or layered vocal texture; requires an audible witness",
            }
            for item in present_windows
            if float(item["vocal_spectral_width_hz"]) >= _percentile(
                [row["vocal_spectral_width_hz"] for row in present_windows], 78
            )
            and float(item["vocal_share_against_accompaniment"]) >= 0.28
        ],
        key=lambda item: float(item["spectral_width_hz"]),
        reverse=True,
    )[:4]

    candidates: list[dict[str, Any]] = []
    for kind, rows in (
        ("continuous_pitch_rise", rises),
        ("high_register", high_register),
        ("possible_vocal_layering", layering),
    ):
        for row in rows:
            candidates.append({
                "kind": kind,
                "center": _r((float(row["start"]) + float(row["end"])) / 2.0),
                "strength": _r(
                    abs(float(row.get("rise_semitones") or 0)) / 12.0
                    + float(row.get("pitch_continuity") or 0)
                    + float(row.get("vocal_share") or 0)
                ),
            })
    candidates.sort(key=lambda item: float(item["strength"]), reverse=True)
    selected: list[dict[str, Any]] = []
    for candidate in candidates:
        if any(abs(float(candidate["center"]) - float(item["center"])) < 18 for item in selected):
            continue
        selected.append(candidate)
        if len(selected) >= 3:
            break

    return {
        "schema_version": SCHEMA_VERSION,
        "analysis_basis": "local_demucs_stems_and_local_pitch_motion_not_named_emotion",
        "duration_seconds": _r(duration),
        "vocal_pitch": vocal_pitch,
        "windows": windows,
        "continuous_pitch_rise_candidates": rises,
        "high_register_candidates": high_register,
        "vocal_entry_or_recession_candidates": entrances[:8],
        "possible_layered_vocal_candidates": layering,
        "audible_witness_candidates": selected,
        "uncertainty": {
            "confidence": "medium",
            "limitations": [
                "source separation can leak accompaniment into the vocal stem",
                "pitch tracking can fail on breathy, spoken, choral, or overlapping voices",
                "spectral width is only a cue to inspect and does not prove harmony or multiple singers",
                "these dimensions do not determine emotion, intent, or vocal technique",
            ],
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--vocals", required=True, type=Path)
    parser.add_argument("--accompaniment", required=True, type=Path)
    args = parser.parse_args()
    result = analyze(args.vocals, args.accompaniment)
    json.dump(result, sys.stdout, ensure_ascii=False, separators=(",", ":"))
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
