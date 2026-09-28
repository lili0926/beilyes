import asyncio
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import sys

import pytest

from app.reference import ReferenceContourRepository

ROOT = Path(__file__).resolve().parents[3]


def test_dense_separated_artifact_not_truncated(tmp_path):
    artifact = {"song_id": "dense", "source": "separated_vocal_pyin", "duration_ms": 192000,
                "frames": [{"t_ms": i * 32, "hz": 2300, "confidence": .9} for i in range(6000)],
                "evidence": {"short_windows": []}, "impression": "", "lyrics": []}
    (tmp_path / "dense.json").write_text(json.dumps(artifact))
    result = asyncio.run(ReferenceContourRepository(tmp_path).analysis("dense"))
    assert len(result.frames) == 6000
    assert result.source == "separated_vocal_pyin"


def test_silence_is_completed_analysis_not_missing(tmp_path):
    (tmp_path / "silent.json").write_text(json.dumps({"song_id": "silent", "source": "separated_vocal_pyin", "frames": [], "evidence": {"limitations": ["silence"]}}))
    assert asyncio.run(ReferenceContourRepository(tmp_path).analysis("silent")) is not None


@pytest.mark.parametrize("extra", [{"lyrics": 42}, {"duration_ms": float("inf")}])
def test_malformed_artifact_is_ignored(tmp_path, extra):
    raw = {"song_id": "bad", "source": "separated_vocal_pyin", "frames": [], **extra}
    (tmp_path / "bad.json").write_text(json.dumps(raw))
    assert asyncio.run(ReferenceContourRepository(tmp_path).analysis("bad")) is None


def test_cli_compacts_frames_without_mutating_input():
    spec = importlib.util.spec_from_file_location("public_cli", ROOT / "scripts/analyze_track.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    original = {"vocal_pitch": {"frames": [{"t_ms": 0, "hz": 220}]}, "windows": []}
    compact = module.compact_vocal_evidence(original)
    assert "frames" not in compact["vocal_pitch"]
    assert original["vocal_pitch"]["frames"]
    assert len(module.hearing_windows(5000, None)) == 1
    with pytest.raises(ValueError):
        module.hearing_windows(5000, "0,1,2,3")


@pytest.mark.skipif(not shutil.which("ffmpeg") or not shutil.which("node"), reason="ffmpeg and Node required")
def test_basic_cli_with_generated_tone_no_network(tmp_path):
    wav = tmp_path / "tone.wav"
    artifact = tmp_path / "tone.json"
    subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-f", "lavfi", "-i", "sine=frequency=220:duration=3", str(wav)], check=True)
    command = [sys.executable, str(ROOT / "scripts/analyze_track.py"), "--input", str(wav), "--song-id", "tone", "--output", str(artifact), "--basic"]
    subprocess.run(command, check=True, capture_output=True, timeout=45)
    raw = json.loads(artifact.read_text())
    assert raw["frames"]
    assert raw["evidence"]["short_windows"] == []
    assert raw["impression"] == ""
    assert str(tmp_path) not in artifact.read_text()
    before = artifact.read_bytes()
    assert subprocess.run(command, capture_output=True).returncode != 0
    assert artifact.read_bytes() == before
