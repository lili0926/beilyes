"""Check candidate files, including untracked additions; print names, never secrets."""
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
FORBIDDEN_DIRS = {
    "data", "uploads", "recordings", "screenshots", "cache", "models", "separated",
    ".venv", ".demucs-venv", "node_modules", ".codex", ".claude", "__pycache__",
}
FORBIDDEN_SUFFIXES = {".pem", ".key", ".db", ".sqlite", ".sqlite3", ".wav", ".mp3",
                      ".flac", ".m4a", ".ogg", ".pt", ".pth", ".ckpt"}
MARKERS = re.compile(
    rb"BEGIN (?:RSA |EC |OPENSSH )?PRIVATE " + rb"KEY"
    + rb"|github" + rb"_pat_[A-Za-z0-9_]{20,}"
    + rb"|gh" + rb"p_[A-Za-z0-9]{20,}"
    + rb"|s" + rb"k-[A-Za-z0-9_-]{20,}"
    + rb"|/home/" + rb"ubuntu/"
    + rb"|/root/" + rb"(?:[A-Za-z0-9_.-]+)"
    + rb"|-----BEGIN " + rb"CERTIFICATE-----"
)


def main() -> int:
    result = subprocess.run(["git", "ls-files", "-z", "--cached", "--others", "--exclude-standard"],
                            cwd=ROOT, check=True, capture_output=True)
    paths = sorted(set(result.stdout.decode().split("\0")) - {""})
    failures = []
    checked = 0
    for name in paths:
        path = ROOT / name
        if not path.exists() and not path.is_symlink():  # tracked deletion
            continue
        relative = Path(name)
        env_file = relative.name.startswith(".env") and relative.name != ".env.example"
        if (path.is_symlink() or env_file or FORBIDDEN_DIRS.intersection(relative.parts)
                or path.suffix.lower() in FORBIDDEN_SUFFIXES):
            failures.append((name, "private/runtime path or symlink"))
            continue
        data = path.read_bytes()
        if b"\0" in data:
            failures.append((name, "binary requires manual review"))
        elif MARKERS.search(data):
            failures.append((name, "potential secret/private deployment marker"))
        checked += 1
    for name, reason in failures:
        print(f"REVIEW {name}: {reason}", file=sys.stderr)
    if failures:
        return 1
    print(f"Public audit passed: {checked} candidate files, including untracked additions.")
    print("This is a heuristic, not proof of de-identification or a Git-history audit.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
