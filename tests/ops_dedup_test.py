"""Verify release deduplication never changes bytes or mutable dependencies."""
import importlib.util
from pathlib import Path
import tempfile

spec = importlib.util.spec_from_file_location("dedup", "ops/deduplicate-releases.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
with tempfile.TemporaryDirectory() as root:
    first = Path(root) / "releases" / ("a" * 40) / "node_modules"
    second = Path(root) / "releases" / ("b" * 40) / "node_modules"
    for folder in [first, second]:
        folder.mkdir(parents=True)
        (folder / "same").write_text("identical")
        (folder / "same").chmod(0o644)
        (folder / "writable").write_text("identical")
        (folder / "writable").chmod(0o666)
        (folder / ".cache").mkdir()
        (folder / ".cache" / "cached").write_text("identical")
    (first / "different").write_text("a")
    (second / "different").write_text("b")
    (second / "link").symlink_to("same")
    assert module.deduplicate(root) == 9
    assert (first / "same").stat().st_ino == (second / "same").stat().st_ino
    assert (first / "writable").stat().st_ino != (second / "writable").stat().st_ino
    assert (first / ".cache" / "cached").stat().st_ino != (second / ".cache" / "cached").stat().st_ino
    assert (first / "different").read_text() == "a"
    assert (second / "different").read_text() == "b"
    assert (second / "link").is_symlink()
    assert module.deduplicate(root) == 0
print("PASS: identical immutable dependencies share storage; changed files, writable files, caches and symlinks are preserved; repeated runs are idempotent.")
