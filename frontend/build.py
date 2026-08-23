#!/usr/bin/env python3
"""Assemble dist/index.html from frontend/parts/*. """
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PARTS = ROOT / "frontend" / "parts"
OUT = ROOT / "dist" / "index.html"

ORDER = [
    "00_prefix.html",
    "10_core_boot.js",
    "20_feature_pr.js",
    "30_core_mid.js",
    "40_feature_mc_ui.js",
    "50_core_mid2.js",
    "60_feature_pocket_mc.js",
    "70_core_rest.js",
    "99_suffix.html",
]

def main():
    chunks = []
    for name in ORDER:
        p = PARTS / name
        if not p.exists():
            raise SystemExit(f"missing part: {p}")
        chunks.append(p.read_text(encoding="utf-8"))
    text = "".join(chunks)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(text, encoding="utf-8")
    print(f"wrote {OUT} ({len(text)} bytes)")

if __name__ == "__main__":
    main()
