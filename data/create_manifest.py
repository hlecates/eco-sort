import os, sys
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

import sys
from pathlib import Path
import pandas as pd

from training.labels import ID2CLASS, ID2BIN, MATERIAL2BIN_ID

ROOT = Path(__file__).resolve().parents[1]
RAW  = ROOT / "data" / "raw"
PROC = ROOT / "data" / "processed"

CLASS2ID = {name: i for i, name in enumerate(ID2CLASS)}  # {"glass":0, ...}

def to_material_id(v):
    s = str(v).strip()
    # try int
    try:
        i = int(s)
        if 0 <= i < len(ID2CLASS):
            return i
        raise ValueError
    except Exception:
        s = s.lower()
        if s in CLASS2ID:
            return CLASS2ID[s]
        raise ValueError(f"Unknown material label: {v!r} (expected int 0..{len(ID2CLASS)-1} or one of {list(CLASS2ID)})")

def main():
    in_path  = RAW / "zero-indexed-files.txt" 
    out_path = PROC / "manifest.csv"
    out_path.parent.mkdir(parents=True, exist_ok=True)

    df = pd.read_csv(
        in_path,
        sep=r"\s+",
        header=None,
        names=["filename", "label"],
        usecols=[0, 1],
        engine="python",
        comment="#",
        on_bad_lines="skip",
        dtype={"filename": str, "label": str},
    )

    df["material_id"] = df["label"].apply(to_material_id).astype(int)
    df["material"] = df["material_id"].apply(lambda i: ID2CLASS[i])
    df["bin_id"] = df["material_id"].apply(lambda i: MATERIAL2BIN_ID[i])
    df["bin"] = df["bin_id"].apply(lambda i: ID2BIN[i])

    def make_path(name: str) -> str:
        name = str(name)
        return name if ("/" in name or "\\" in name) else f"images/{name}"

    df["path"] = df["filename"].apply(make_path)

    df[["path", "material", "material_id", "bin", "bin_id"]].to_csv(out_path, index=False)
    print(f"Wrote {len(df)} rows to {out_path}")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"[build_manifest] ERROR: {e}", file=sys.stderr)
        sys.exit(1)
