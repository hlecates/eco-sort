import json
from pathlib import Path
import torch
import torch.nn as nn
from torchvision.models import mobilenet_v3_small

ROOT = Path(__file__).resolve().parents[1]
CKPT_PATH = ROOT / "training" / "waste_mobilenetv3.pth"
CKPT = torch.load(CKPT_PATH, map_location="cpu")

MATERIALS = CKPT["materials"]        
BINS = CKPT["bins"]               
MATERIAL_TO_BIN = CKPT["material_to_bin"]   
MEAN, STD = CKPT["norm"]["mean"], CKPT["norm"]["std"]
INPUT_SIZE = int(CKPT["input_size"])

m = mobilenet_v3_small(weights=None)
in_dim = m.classifier[-1].in_features
m.classifier[-1] = nn.Linear(in_dim, len(MATERIALS))
m.load_state_dict(CKPT["state_dict"], strict=True)
m.eval()

dummy = torch.randn(1, 3, INPUT_SIZE, INPUT_SIZE)
onnx_path = ROOT / "mobile" / "assets" / "waste_materials.onnx"
onnx_path.parent.mkdir(parents=True, exist_ok=True)

torch.onnx.export(
    m,
    dummy,
    onnx_path.as_posix(),
    input_names=["input"],
    output_names=["logits_material"],
    opset_version=17,
    do_constant_folding=True,
    dynamic_axes={"input": {0: "batch"}, "logits_material": {0: "batch"}},
)
print(f"Wrote {onnx_path}")

labels_path = ROOT / "mobile" / "assets" / "labels.json"
with open(labels_path, "w") as f:
    json.dump({
        "materials": MATERIALS,
        "bins": BINS,
        "material_to_bin": MATERIAL_TO_BIN,
        "mean": MEAN,
        "std": STD,
        "input_size": INPUT_SIZE,
    }, f)
print(f"Wrote {labels_path}")
