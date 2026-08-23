#!/usr/bin/env python3
"""Assemble dist/index.html from frontend/parts/*."""
from pathlib import Path
import re

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


def strip_legacy_camera_autosnap(text: str) -> str:
    """Remove the old keyword-triggered camera shot from the assembled app.

    Camera capture must happen only through the real `take_photo` tool. The
    old code listened for phrases such as "看看我" and captured front camera
    before the LLM had a chance to issue a tool call, which caused duplicate
    shots (front first, then the model's requested back camera).
    """
    start = text.find('// 用户明确要求「看我」时：先本机拍照并塞进本轮消息')
    if start < 0:
        return text
    end_marker = '// ── MCP 工具集成：已连接 && 开了 inChat && 有工具 && 本轮无图片时走工具循环'
    end = text.find(end_marker, start)
    if end < 0:
        raise RuntimeError('found legacy camera auto-snap block, but its end marker is missing')
    return text[:start] + text[end:]


def enable_camera_by_default(text: str) -> str:
    """New installs expose the camera tool by default; users can still toggle it off."""
    return text.replace(
        'LS.get("ariesCameraOn", false) === true',
        'LS.get("ariesCameraOn", true) === true',
        1,
    )


def main():
    chunks = []
    for name in ORDER:
        p = PARTS / name
        if not p.exists():
            raise SystemExit(f"missing part: {p}")
        chunks.append(p.read_text(encoding="utf-8"))

    text = "".join(chunks)
    text = strip_legacy_camera_autosnap(text)
    text = enable_camera_by_default(text)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(text, encoding="utf-8")
    print(f"wrote {OUT} ({len(text)} bytes)")


if __name__ == "__main__":
    main()
