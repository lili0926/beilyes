#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import math
import statistics
import struct
import sys
import wave
from pathlib import Path
from typing import Any

SCHEMA_VERSION = "music-analysis.v1"
PITCH_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
EXPRESSIVE_AXES = [
    "activation",
    "brightness",
    "texture_density",
    "harmonic_restlessness",
    "pulse_clarity",
]


def _r(value: float, digits: int = 3) -> float:
    return round(float(value), digits)


def _clamp(value: float) -> float:
    return max(0.0, min(1.0, float(value)))


def _base_result(backend: str, duration: float) -> dict[str, Any]:
    return {
        "schema_version": SCHEMA_VERSION,
        "analysis_backend": backend,
        "duration": _r(duration),
        "beat": {"tempo_bpm": None, "confidence": 0.0, "beat_times": []},
        "onset_density": {"per_second": 0.0, "window_seconds": 4.0, "windows": []},
        "chroma": {"global": {name: 0.0 for name in PITCH_NAMES}, "windows": []},
        "sections": [],
        "repetitions": {"section_pairs": [], "motif_candidates": []},
        "climax_candidates": [],
        "expressive_motion": {
            "basis": "local_acoustic_dimensions_not_named_emotion",
            "scale": "within_song_relative_0_to_1",
            "axes": EXPRESSIVE_AXES,
            "global": {},
            "windows": [],
            "transitions": [],
            "confidence": 0.0,
            "limitations": [
                "acoustic dimensions do not determine one emotion or listener response"
            ],
        },
        "uncertainty": {"overall_confidence": 0.0, "limitations": []},
    }


def _expressive_motion_librosa(
    *,
    np: Any,
    librosa: Any,
    duration: float,
    sr: int,
    hop: int,
    rms: Any,
    onset: Any,
    chroma: Any,
    centroid: Any,
    bandwidth: Any,
    flatness: Any,
    beat_times: Any,
    beat_confidence: float,
    tempo_bpm: float,
    onset_per_second: float,
) -> dict[str, Any]:
    """Describe a song's changing acoustic posture without naming its emotion."""

    def relative(values: Any) -> Any:
        curve = np.nan_to_num(np.asarray(values, dtype=float), nan=0.0, posinf=0.0, neginf=0.0)
        if not curve.size:
            return curve
        low = float(np.percentile(curve, 10))
        high = float(np.percentile(curve, 90))
        if high - low < 1e-8:
            return np.full(curve.shape, 0.5, dtype=float)
        return np.clip((curve - low) / (high - low), 0.0, 1.0)

    n = min(
        len(rms),
        len(onset),
        len(centroid),
        len(bandwidth),
        len(flatness),
        chroma.shape[1],
    )
    if n < 4 or duration <= 0:
        return {
            "basis": "local_acoustic_dimensions_not_named_emotion",
            "scale": "within_song_relative_0_to_1",
            "axes": EXPRESSIVE_AXES,
            "global": {},
            "windows": [],
            "transitions": [],
            "confidence": 0.12,
            "limitations": [
                "too few acoustic frames for an expressive trajectory",
                "acoustic dimensions do not determine one emotion or listener response",
            ],
        }

    safe_rms = np.maximum(np.asarray(rms[:n], dtype=float), 1e-8)
    rms_db = librosa.amplitude_to_db(safe_rms, ref=np.max)
    onset_curve = np.asarray(onset[:n], dtype=float)
    centroid_curve = np.asarray(centroid[:n], dtype=float)
    bandwidth_curve = np.asarray(bandwidth[:n], dtype=float)
    flatness_curve = np.asarray(flatness[:n], dtype=float)
    chroma_curve = np.asarray(chroma[:, :n], dtype=float)
    chroma_flux = np.zeros(n, dtype=float)
    if n > 1:
        chroma_flux[1:] = np.sum(np.abs(np.diff(chroma_curve, axis=1)), axis=0) / 2.0

    energy_relative = relative(rms_db)
    onset_relative = relative(onset_curve)
    brightness_relative = relative(centroid_curve)
    bandwidth_relative = relative(bandwidth_curve)
    flatness_relative = relative(flatness_curve)
    harmonic_relative = relative(chroma_flux)
    activation = np.clip(0.58 * energy_relative + 0.42 * onset_relative, 0.0, 1.0)
    texture_density = np.clip(
        0.45 * onset_relative + 0.35 * bandwidth_relative + 0.20 * flatness_relative,
        0.0,
        1.0,
    )

    frame_times = librosa.frames_to_time(np.arange(n), sr=sr, hop_length=hop)
    window_count = max(4, min(12, int(math.ceil(duration / 12.0))))
    windows: list[dict[str, Any]] = []
    for index in range(window_count):
        start = duration * index / window_count
        end = duration * (index + 1) / window_count
        mask = (frame_times >= start) & (frame_times < end if index + 1 < window_count else frame_times <= end)
        positions = np.flatnonzero(mask)
        if not positions.size:
            continue
        a, b = int(positions[0]), int(positions[-1]) + 1
        local_beats = np.asarray(beat_times, dtype=float)
        local_beats = local_beats[(local_beats >= start) & (local_beats <= end)]
        intervals = np.diff(local_beats)
        local_pulse = (
            _clamp(1.0 - float(np.std(intervals)) / (float(np.mean(intervals)) + 1e-8))
            if len(intervals) >= 2
            else _clamp(beat_confidence * 0.7)
        )
        windows.append({
            "start": _r(start),
            "end": _r(end),
            "axes": {
                "activation": _r(float(np.mean(activation[a:b]))),
                "brightness": _r(float(np.mean(brightness_relative[a:b]))),
                "texture_density": _r(float(np.mean(texture_density[a:b]))),
                "harmonic_restlessness": _r(float(np.mean(harmonic_relative[a:b]))),
                "pulse_clarity": _r(local_pulse),
            },
        })

    transitions: list[dict[str, Any]] = []
    for previous, current in zip(windows, windows[1:]):
        deltas = {
            axis: _r(float(current["axes"][axis]) - float(previous["axes"][axis]))
            for axis in EXPRESSIVE_AXES
        }
        salient = {
            axis: value for axis, value in deltas.items() if abs(float(value)) >= 0.18
        }
        if salient:
            transitions.append({
                "at": current["start"],
                "changes": salient,
                "strength": _r(max(abs(float(value)) for value in salient.values())),
            })
    transitions.sort(key=lambda item: float(item["strength"]), reverse=True)
    transitions = sorted(transitions[:8], key=lambda item: float(item["at"]))

    peak_index = int(np.argmax(activation))
    dynamic_range_db = float(np.percentile(rms_db, 90) - np.percentile(rms_db, 10))
    global_axes = {
        "pulse_clarity": _r(beat_confidence),
        "tempo_bpm": _r(tempo_bpm, 2) if tempo_bpm > 0 else None,
        "event_density_per_second": _r(onset_per_second),
        "dynamic_range_db": _r(dynamic_range_db),
        "brightness_center_hz": _r(float(np.median(centroid_curve)), 1),
        "spectral_spread_hz": _r(float(np.median(bandwidth_curve)), 1),
        "harmonic_change_mean": _r(float(np.mean(chroma_flux))),
        "peak_activation_at": _r(float(frame_times[min(peak_index, len(frame_times) - 1)])),
    }
    return {
        "basis": "local_acoustic_dimensions_not_named_emotion",
        "scale": "within_song_relative_0_to_1",
        "axes": EXPRESSIVE_AXES,
        "global": global_axes,
        "windows": windows,
        "transitions": transitions,
        "confidence": _r(0.72 if duration >= 30 else 0.58),
        "limitations": [
            "brightness and density come from the full mix, not isolated instruments or voice",
            "acoustic dimensions can support several conflicting feelings",
            "lyrics, culture, memory, and the listener decide emotional meaning",
        ],
    }


def _analyze_librosa_audio(y: Any, sr: int) -> dict[str, Any]:
    import numpy as np
    import librosa

    duration = librosa.get_duration(y=y, sr=sr)
    result = _base_result("librosa", duration)
    if len(y) < sr:
        result["uncertainty"] = {"overall_confidence": 0.15, "limitations": ["audio is shorter than one second"]}
        return result

    hop = 512
    frame_times = librosa.frames_to_time(np.arange(1 + len(y) // hop), sr=sr, hop_length=hop)
    rms = librosa.feature.rms(y=y, hop_length=hop)[0]
    onset = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop)
    tempo, beat_frames = librosa.beat.beat_track(onset_envelope=onset, sr=sr, hop_length=hop)
    tempo_value = float(np.asarray(tempo).reshape(-1)[0])
    beat_times = librosa.frames_to_time(beat_frames, sr=sr, hop_length=hop)
    intervals = np.diff(beat_times)
    beat_conf = 0.0 if len(intervals) < 3 else _clamp(1.0 - np.std(intervals) / (np.mean(intervals) + 1e-8))
    result["beat"] = {
        "tempo_bpm": _r(tempo_value, 2) if tempo_value > 0 else None,
        "confidence": _r(beat_conf),
        "beat_times": [_r(t) for t in beat_times[:256]],
    }

    onset_frames = librosa.onset.onset_detect(onset_envelope=onset, sr=sr, hop_length=hop, backtrack=False)
    onset_times = librosa.frames_to_time(onset_frames, sr=sr, hop_length=hop)
    win = 4.0
    density_windows = []
    for start in np.arange(0.0, duration, win):
        count = int(np.sum((onset_times >= start) & (onset_times < start + win)))
        density_windows.append({"start": _r(start), "end": _r(min(duration, start + win)), "per_second": _r(count / max(0.1, min(win, duration - start)))})
    result["onset_density"] = {"per_second": _r(len(onset_times) / duration), "window_seconds": win, "windows": density_windows}

    chroma = librosa.feature.chroma_cqt(y=y, sr=sr, hop_length=hop)
    global_chroma = np.mean(chroma, axis=1)
    global_chroma /= np.sum(global_chroma) + 1e-8
    chroma_windows = []
    feature_win = 8.0
    for start in np.arange(0.0, duration, feature_win):
        a = int(start * sr / hop)
        b = max(a + 1, int(min(duration, start + feature_win) * sr / hop))
        profile = np.mean(chroma[:, a:b], axis=1)
        profile /= np.sum(profile) + 1e-8
        chroma_windows.append({"start": _r(start), "end": _r(min(duration, start + feature_win)), "profile": {PITCH_NAMES[i]: _r(v, 4) for i, v in enumerate(profile)}})
    result["chroma"] = {"global": {PITCH_NAMES[i]: _r(v, 4) for i, v in enumerate(global_chroma)}, "windows": chroma_windows}

    centroid = librosa.feature.spectral_centroid(y=y, sr=sr, hop_length=hop)[0]
    bandwidth = librosa.feature.spectral_bandwidth(y=y, sr=sr, hop_length=hop)[0]
    flatness = librosa.feature.spectral_flatness(y=y, hop_length=hop)[0]
    result["expressive_motion"] = _expressive_motion_librosa(
        np=np,
        librosa=librosa,
        duration=duration,
        sr=sr,
        hop=hop,
        rms=rms,
        onset=onset,
        chroma=chroma,
        centroid=centroid,
        bandwidth=bandwidth,
        flatness=flatness,
        beat_times=beat_times,
        beat_confidence=beat_conf,
        tempo_bpm=tempo_value,
        onset_per_second=len(onset_times) / duration,
    )

    # Recurrence runs on ~1 Hz pooled features: a three-minute song produces an
    # approximately 180x180 matrix instead of a multi-thousand-frame dense one.
    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13, hop_length=hop)
    pool_frames = max(1, int(sr / hop))
    pooled_boundaries = np.arange(0, mfcc.shape[1] + pool_frames, pool_frames)
    pooled_boundaries[-1] = min(pooled_boundaries[-1], mfcc.shape[1])
    pooled_boundaries = np.unique(pooled_boundaries)
    mfcc_pooled = librosa.util.sync(mfcc, pooled_boundaries, aggregate=np.mean)
    recurrence = librosa.segment.recurrence_matrix(mfcc_pooled, mode="affinity", sym=True)
    novelty = np.mean(np.abs(np.diff(recurrence, axis=0)), axis=1)
    min_gap = 8
    candidates = np.argsort(novelty)[::-1]
    boundaries_pooled = [0, mfcc_pooled.shape[1] - 1]
    for candidate in candidates:
        if all(abs(int(candidate) - current) >= min_gap for current in boundaries_pooled):
            boundaries_pooled.append(int(candidate))
        if len(boundaries_pooled) >= min(14, max(3, int(duration / 12) + 1)):
            break
    boundaries_pooled.sort()
    boundaries = [min(mfcc.shape[1] - 1, value * pool_frames) for value in boundaries_pooled]

    raw_section_vectors = []
    sections = []
    for index, (a, b) in enumerate(zip(boundaries, boundaries[1:])):
        safe_b = max(a + 1, b)
        rms_slice = rms[a:min(safe_b, len(rms))]
        onset_slice = onset[a:min(safe_b, len(onset))]
        mfcc_slice = mfcc[1:, a:safe_b]
        vector = np.concatenate([
            np.mean(chroma[:, a:safe_b], axis=1),
            np.std(chroma[:, a:safe_b], axis=1),
            np.mean(mfcc_slice, axis=1),
            np.std(mfcc_slice, axis=1),
            [np.mean(rms_slice), np.std(rms_slice), np.mean(onset_slice), np.std(onset_slice)],
        ])
        raw_section_vectors.append(vector)
        pooled_a = boundaries_pooled[index]
        sections.append({"label": "", "start": _r(frame_times[min(a, len(frame_times)-1)]), "end": _r(min(duration, frame_times[min(b, len(frame_times)-1)])), "confidence": _r(0.55 + min(0.3, novelty[min(pooled_a, len(novelty)-1)] if len(novelty) else 0.0))})

    # Positive chroma vectors naturally have very high cosine similarity.  A
    # cross-section z-score makes similarity mean "distinctive in the same
    # way within this song" rather than merely "uses the same twelve notes".
    raw_matrix = np.asarray(raw_section_vectors)
    if len(raw_matrix) > 1:
        scaled = (raw_matrix - np.mean(raw_matrix, axis=0)) / (np.std(raw_matrix, axis=0) + 1e-6)
    else:
        scaled = raw_matrix
    section_vectors = [row / (np.linalg.norm(row) + 1e-8) for row in scaled]
    labels: list[str] = []
    for index, vector in enumerate(section_vectors):
        label = None
        for previous, previous_vector in enumerate(section_vectors[:index]):
            if float(np.dot(vector, previous_vector)) >= 0.62:
                label = labels[previous]
                break
        if label is None:
            label = chr(65 + min(25, len(set(labels))))
        labels.append(label)
        sections[index]["label"] = label
    result["sections"] = sections

    pairs = []
    for i in range(len(section_vectors)):
        for j in range(i + 1, len(section_vectors)):
            similarity = float(np.dot(section_vectors[i], section_vectors[j]))
            if similarity >= 0.62:
                pairs.append({"first_section": i, "second_section": j, "similarity": _r(similarity), "first_start": sections[i]["start"], "second_start": sections[j]["start"]})
    pairs.sort(key=lambda item: item["similarity"], reverse=True)
    result["repetitions"] = {"section_pairs": pairs[:12], "motif_candidates": pairs[:6]}

    # Salience combines loudness, onset activity, and spectral brightness.
    n = min(len(rms), len(onset), len(centroid))
    def norm(v: Any) -> Any:
        v = np.asarray(v[:n])
        return (v - np.percentile(v, 10)) / (np.percentile(v, 95) - np.percentile(v, 10) + 1e-8)
    salience = 0.55 * norm(rms) + 0.30 * norm(onset) + 0.15 * norm(centroid)
    peak_frames = librosa.util.peak_pick(salience, pre_max=40, post_max=40, pre_avg=80, post_avg=80, delta=0.08, wait=max(1, int(12 * sr / hop)))
    ranked = sorted(peak_frames, key=lambda idx: float(salience[idx]), reverse=True)[:5]
    result["climax_candidates"] = [{"time": _r(librosa.frames_to_time(frame, sr=sr, hop_length=hop)), "salience": _r(_clamp(salience[frame] / 1.4)), "evidence": ["energy", "onset_activity", "spectral_brightness"]} for frame in ranked]
    confidence = 0.72 if duration >= 30 else 0.52
    limitations = ["section labels indicate acoustic similarity, not verse/chorus meaning", "climax candidates are salience estimates, not listener judgments"]
    result["uncertainty"] = {"overall_confidence": confidence, "limitations": limitations}
    return result


def _analyze_librosa(path: Path) -> dict[str, Any]:
    import librosa

    y, sr = librosa.load(str(path), sr=22050, mono=True)
    return _analyze_librosa_audio(y, sr)


def analyze_f32le_stream(stream: Any, sample_rate: int) -> dict[str, Any]:
    """Analyze bounded mono PCM supplied by ffmpeg without persisting audio."""
    import numpy as np

    raw = stream.read()
    if not raw or len(raw) % 4:
        raise ValueError("stdin must contain non-empty float32 little-endian PCM")
    samples = np.frombuffer(raw, dtype="<f4")
    max_samples = sample_rate * 12 * 60
    if samples.size > max_samples:
        raise ValueError("stdin audio exceeds twelve-minute limit")
    return _analyze_librosa_audio(samples, sample_rate)


def _read_pcm_wav(path: Path) -> tuple[list[float], int]:
    with wave.open(str(path), "rb") as stream:
        channels, width, rate, frames = stream.getnchannels(), stream.getsampwidth(), stream.getframerate(), stream.getnframes()
        if width != 2:
            raise ValueError("fallback supports 16-bit PCM WAV only")
        raw = stream.readframes(frames)
    values = struct.unpack("<" + "h" * (len(raw) // 2), raw)
    mono = [sum(values[i:i + channels]) / (32768.0 * channels) for i in range(0, len(values), channels)]
    return mono, rate


def _analyze_fallback(path: Path, reason: str) -> dict[str, Any]:
    samples, rate = _read_pcm_wav(path)
    duration = len(samples) / rate
    result = _base_result("stdlib-wav-fallback", duration)
    frame_seconds = 0.1
    frame_size = max(1, int(rate * frame_seconds))
    energies = [math.sqrt(sum(x*x for x in samples[i:i+frame_size]) / max(1, len(samples[i:i+frame_size]))) for i in range(0, len(samples), frame_size)]
    diffs = [max(0.0, energies[i] - energies[i-1]) for i in range(1, len(energies))]
    threshold = (statistics.mean(diffs) + statistics.pstdev(diffs)) if diffs else 1.0
    onset_indices = [i + 1 for i, value in enumerate(diffs) if value > threshold and (not i or diffs[i-1] <= threshold)]
    onset_times = [index * frame_seconds for index in onset_indices]
    intervals = [b-a for a, b in zip(onset_times, onset_times[1:]) if 0.25 <= b-a <= 1.5]
    tempo = 60.0 / statistics.median(intervals) if intervals else None
    tempo_conf = _clamp(len(intervals) / 16) * (0.45 if intervals else 0.0)
    result["beat"] = {"tempo_bpm": _r(tempo, 2) if tempo else None, "confidence": _r(tempo_conf), "beat_times": [_r(t) for t in onset_times[:256]]}
    win = 4.0
    windows = []
    cursor = 0.0
    while cursor < duration:
        count = sum(cursor <= t < cursor + win for t in onset_times)
        windows.append({"start": _r(cursor), "end": _r(min(duration, cursor+win)), "per_second": _r(count/max(0.1,min(win,duration-cursor)))})
        cursor += win
    result["onset_density"] = {"per_second": _r(len(onset_times)/max(duration, 0.001)), "window_seconds": win, "windows": windows}

    section_length = 12.0
    section_energies = []
    for start in range(0, len(samples), int(section_length*rate)):
        chunk = samples[start:start+int(section_length*rate)]
        section_energies.append(math.sqrt(sum(x*x for x in chunk)/max(1,len(chunk))))
    max_energy = max(section_energies, default=1.0) or 1.0
    labels = []
    sections = []
    for i, energy in enumerate(section_energies):
        band = round(energy/max_energy, 1)
        label = chr(65 + list(dict.fromkeys(round(v/max_energy, 1) for v in section_energies)).index(band))
        labels.append(label)
        sections.append({"label": label, "start": _r(i*section_length), "end": _r(min(duration,(i+1)*section_length)), "confidence": 0.3})
    result["sections"] = sections
    pairs = [{"first_section": i, "second_section": j, "similarity": 0.7, "first_start": sections[i]["start"], "second_start": sections[j]["start"]} for i in range(len(labels)) for j in range(i+1,len(labels)) if labels[i] == labels[j]][:12]
    result["repetitions"] = {"section_pairs": pairs, "motif_candidates": pairs[:6]}
    ranked = sorted(range(len(section_energies)), key=lambda i: section_energies[i], reverse=True)[:3]
    result["climax_candidates"] = [{"time": _r(min(duration, (i+0.5)*section_length)), "salience": _r(section_energies[i]/max_energy), "evidence": ["energy_only"]} for i in ranked]
    energy_low = min(section_energies, default=0.0)
    energy_span = max(1e-8, max_energy - energy_low)
    expressive_windows = [
        {
            "start": section["start"],
            "end": section["end"],
            "axes": {"activation": _r((energy - energy_low) / energy_span)},
        }
        for section, energy in zip(sections, section_energies)
    ]
    expressive_transitions = []
    for previous, current in zip(expressive_windows, expressive_windows[1:]):
        delta = _r(current["axes"]["activation"] - previous["axes"]["activation"])
        if abs(delta) >= 0.18:
            expressive_transitions.append({
                "at": current["start"],
                "changes": {"activation": delta},
                "strength": _r(abs(delta)),
            })
    result["expressive_motion"] = {
        "basis": "fallback_energy_only_not_named_emotion",
        "scale": "within_song_relative_0_to_1",
        "axes": ["activation"],
        "global": {"event_density_per_second": _r(len(onset_times) / max(duration, 0.001))},
        "windows": expressive_windows,
        "transitions": expressive_transitions[:8],
        "confidence": 0.18,
        "limitations": [
            reason,
            "fallback knows only coarse energy movement",
            "energy alone cannot determine emotion or listener response",
        ],
    }
    result["uncertainty"] = {"overall_confidence": 0.28, "limitations": [reason, "fallback has no chroma or robust beat tracking", "structure and repetitions use coarse energy bands"]}
    return result


def analyze(path: Path, force_fallback: bool = False) -> dict[str, Any]:
    if not path.is_file():
        raise FileNotFoundError(path)
    if force_fallback:
        return _analyze_fallback(path, "fallback explicitly requested")
    try:
        return _analyze_librosa(path)
    except ImportError as exc:
        if path.suffix.lower() != ".wav":
            raise RuntimeError("librosa is required for non-WAV input; install requirements.txt") from exc
        return _analyze_fallback(path, f"librosa unavailable: {exc.name or 'dependency missing'}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Extract local musical evidence as JSON")
    parser.add_argument("audio", type=Path, nargs="?")
    parser.add_argument("--pretty", action="store_true")
    parser.add_argument("--fallback", action="store_true", help="force standard-library WAV analysis")
    parser.add_argument("--stdin-f32le", action="store_true", help="read mono float32 PCM from stdin")
    parser.add_argument("--sample-rate", type=int, default=22050)
    args = parser.parse_args()
    try:
        if args.stdin_f32le:
            if not 8000 <= args.sample_rate <= 48000:
                raise ValueError("sample rate must be between 8000 and 48000")
            result = analyze_f32le_stream(sys.stdin.buffer, args.sample_rate)
        elif args.audio:
            result = analyze(args.audio, args.fallback)
        else:
            parser.error("audio path or --stdin-f32le is required")
    except Exception as exc:
        print(json.dumps({"error": type(exc).__name__, "message": str(exc)}, ensure_ascii=False), file=sys.stderr)
        return 2
    print(json.dumps(result, ensure_ascii=False, indent=2 if args.pretty else None, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
