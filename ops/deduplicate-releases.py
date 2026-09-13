#!/usr/bin/env python3
"""Hardlink identical immutable dependencies; preserve every release's bytes."""
import hashlib
import os
from pathlib import Path
import re
import stat
import sys


def deduplicate(root):
    seen = {}
    saved = 0
    for release in sorted((Path(root) / "releases").iterdir()):
        if release.is_symlink() or not re.fullmatch(r"[0-9a-f]{40}", release.name):
            continue
        dependencies = release / "node_modules"
        if dependencies.is_symlink() or not dependencies.is_dir():
            continue
        for directory, folders, files in os.walk(dependencies, followlinks=False):
            folders[:] = [name for name in folders if name != ".cache"]
            for name in files:
                path = Path(directory) / name
                metadata = path.lstat()
                if (not stat.S_ISREG(metadata.st_mode)
                        or metadata.st_uid != os.geteuid()
                        or metadata.st_mode & 0o022):
                    continue
                with path.open("rb") as source:
                    digest = hashlib.file_digest(source, "sha256").digest()
                key = (metadata.st_size, metadata.st_mode, metadata.st_uid,
                       metadata.st_gid, digest)
                original = seen.get(key)
                if original is None:
                    seen[key] = path
                elif original.stat().st_ino != metadata.st_ino:
                    temporary = path.with_name(name + ".fomo-link-next")
                    # Exclusive link creation refuses unexpected existing paths.
                    os.link(original, temporary)
                    os.replace(temporary, path)
                    saved += metadata.st_size
    return saved


if __name__ == "__main__":
    print(f"Identical dependency bytes shared: {deduplicate(sys.argv[1])}")
