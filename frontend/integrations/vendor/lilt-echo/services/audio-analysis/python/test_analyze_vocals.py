import importlib.util
import json
import math
from pathlib import Path
import unittest


MODULE_PATH = Path(__file__).with_name("analyze_vocals.py")
SPEC = importlib.util.spec_from_file_location("analyze_vocals", MODULE_PATH)
analyze_vocals = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(analyze_vocals)


class VocalPitchContractTests(unittest.TestCase):
    def build(self, **overrides):
        values = {
            "f0": [220.0, 221.0, 222.0, 223.0],
            "voiced_flag": [True, True, True, True],
            "voiced_probability": [0.91, 0.92, 0.93, 0.94],
            "pitch_times": [0.0, 0.032, 0.064, 0.096],
            "vocal_db": [-24.0, -23.0, -22.0, -21.0],
            "vocal_share": [0.7, 0.72, 0.74, 0.76],
            "frame_times": [0.0, 0.032, 0.064, 0.096],
            "presence_floor": -40.0,
            "duration_seconds": 1.0,
            "frame_hop_ms": 32.0,
        }
        values.update(overrides)
        return analyze_vocals.build_vocal_pitch(**values)

    def test_dense_contract_preserves_32ms_cadence(self):
        pitch = self.build()

        self.assertEqual(pitch["analysis_version"], 1)
        self.assertEqual(pitch["source"], "separated_vocal_pyin")
        self.assertEqual(pitch["frame_hop_ms"], 32.0)
        self.assertEqual(
            [right["t_ms"] - left["t_ms"] for left, right in zip(pitch["frames"], pitch["frames"][1:])],
            [32, 32, 32],
        )

    def test_unvoiced_low_probability_and_non_finite_f0_are_excluded(self):
        pitch = self.build(
            f0=[220.0, math.nan, math.inf, 223.0],
            voiced_flag=[False, True, True, True],
            voiced_probability=[0.99, 0.99, 0.99, 0.54],
        )

        self.assertEqual(pitch["frames"], [])
        self.assertEqual(pitch["voiced_ratio"], 0.0)

    def test_presence_and_vocal_share_gates_reject_likely_leakage(self):
        pitch = self.build(
            vocal_db=[-55.0, -24.0, -24.0, -24.0],
            vocal_share=[0.8, 0.17, 0.18, 0.7],
        )

        self.assertEqual([frame["t_ms"] for frame in pitch["frames"]], [64, 96])

    def test_public_contract_contains_no_paths_urls_or_audio(self):
        pitch = self.build()
        encoded = json.dumps(pitch, sort_keys=True)

        self.assertNotIn("/tmp/", encoded)
        self.assertNotIn("http://", encoded)
        self.assertNotIn("https://", encoded)
        self.assertNotIn("audio_bytes", encoded)
        self.assertEqual(
            set(pitch),
            {
                "analysis_version",
                "source",
                "duration_ms",
                "frame_hop_ms",
                "voiced_ratio",
                "frames",
                "limitations",
            },
        )


if __name__ == "__main__":
    unittest.main()
