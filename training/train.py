import os
from pathlib import Path
import json
import pandas as pd
import numpy as np
from PIL import Image

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from torchvision import models, transforms

from config import IMAGENET_MEAN as MEAN, IMAGENET_STD as STD, INPUT_SIZE
from labels import (NUM_MATERIALS, ID2CLASS, ID2BIN, MATERIAL2BIN_ID)

ROOT = Path(__file__).resolve().parents[1]
PROC = ROOT / "data" / "processed"


class WasteDataset(Dataset):
    def __init__(self, df: pd.DataFrame, root: Path, mode: str = "train", transforms_: transforms.Compose | None = None):
        assert mode in {"train","val","test"}
        self.df = df.reset_index(drop=True).copy()
        self.root = Path(root)
        self.mode = mode

        tf_train = transforms.Compose([
            transforms.Resize((int(INPUT_SIZE), int(INPUT_SIZE))),
            transforms.ColorJitter(0.2,0.2,0.2,0.1),
            transforms.RandomApply([transforms.GaussianBlur(3)], p=0.3),
            transforms.ToTensor(),
            transforms.Normalize(MEAN, STD),
        ])
        tf_val = transforms.Compose([
            transforms.Resize((int(INPUT_SIZE), int(INPUT_SIZE))),
            transforms.ToTensor(),
            transforms.Normalize(MEAN, STD),
        ])
        self.tf = transforms_ or (tf_train if mode == "train" else tf_val)

    def __len__(self): return len(self.df)

    def __getitem__(self, i): 
        r = self.df.iloc[i]
        rel = str(r["path"])
        p = self.root / rel
        if not p.is_file():
            # fallback if manifest has bare filenames
            p = self.root / "images" / rel
        img = Image.open(p).convert("RGB")
        label = int(r["material_id"])
        return self.tf(img), label
    

def stratified_split(df: pd.DataFrame, val_frac: float = 0.1, test_frac: float = 0.0, seed: int = 42, label_col: str = "material_id"):
    assert 0 <= val_frac < 1 and 0 <= test_frac < 1 and (val_frac + test_frac) < 1
    rng = np.random.RandomState(seed)
    train_idx, val_idx, test_idx = [], [], []

    for _, g in df.groupby(label_col, sort=False):
        idx = g.index.to_numpy()
        rng.shuffle(idx)
        n_val  = int(round(len(idx) * val_frac))
        n_test = int(round(len(idx) * test_frac))
        val_idx.extend(idx[:n_val])
        test_idx.extend(idx[n_val:n_val+n_test])
        train_idx.extend(idx[n_val+n_test:])

    train_df = df.loc[train_idx].sample(frac=1.0, random_state=seed+1).reset_index(drop=True)
    val_df   = df.loc[val_idx]  .sample(frac=1.0, random_state=seed+2).reset_index(drop=True)
    test_df  = df.loc[test_idx] .sample(frac=1.0, random_state=seed+3).reset_index(drop=True)
    return train_df, val_df, test_df


def build_model():
    m = models.mobilenet_v3_small(weights="IMAGENET1K_V1")
    in_dim = m.classifier[-1].in_features
    m.classifier[-1] = nn.Linear(in_dim, NUM_MATERIALS)
    return m


def _bin_metrics_from_logits(logits: torch.Tensor, y_material: torch.Tensor):
    m2b = torch.tensor(MATERIAL2BIN_ID, device=logits.device)
    y_pred_mat = logits.argmax(1)
    y_pred_bin = m2b[y_pred_mat]
    y_true_bin = m2b[y_material]
    mat_acc = (y_pred_mat == y_material).float().mean().item()
    bin_acc = (y_pred_bin == y_true_bin).float().mean().item()
    return mat_acc, bin_acc


def train_epoch(model, dl, opt, loss_fn, device):
    model.train()
    # init counters to 0
    total_samples = 0
    correct_preds = 0
    loss_sum = 0

    for x, y in dl:
        x, y = x.to(device), y.to(device)
        opt.zero_grad()
        # Forward pass
        logits = model(x)
        loss = loss_fn(logits, y)
        # Compute gradients and update weights
        loss.backward()
        opt.step()
        # Bookkeep the counters
        loss_sum += loss.item()*x.size(0)
        correct_preds += (logits.argmax(1) == y).sum().item()
        total_samples += x.size(0)

    # Return the average loss and accuracy
    return loss_sum/total_samples, correct_preds/total_samples


@torch.no_grad()
def eval_epoch(model, dl, loss_fn, device):
    model.train()
    # init counters to 0
    total_samples = 0
    correct_preds = 0
    loss_sum = 0

    for x, y in dl:
        x, y = x.to(device), y.to(device)
        # Forward pass
        logits = model(x)
        loss = loss_fn(logits, y)
        # Bookkeep the counters
        loss_sum += loss.item()*x.size(0)
        correct_preds += (logits.argmax(1) == y).sum().item()
        total_samples += x.size(0)

    # Return the average loss and accuracy
    return loss_sum/total_samples, correct_preds/total_samples


def main():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    df = pd.read_csv(PROC / "manifest.csv")  # expects at least: path, material_id

    train_df, val_df, _ = stratified_split(df, val_frac=0.10, test_frac=0.0, seed=42, label_col="material_id")
    train_ds = WasteDataset(train_df, PROC, mode="train")
    val_ds   = WasteDataset(val_df,   PROC, mode="val")

    train_dl = DataLoader(train_ds, batch_size=64, shuffle=True,  num_workers=4, pin_memory=True)
    val_dl   = DataLoader(val_ds,   batch_size=64, shuffle=False, num_workers=4, pin_memory=True)

    model = build_model().to(device)
    loss_fn = nn.CrossEntropyLoss()
    opt = torch.optim.AdamW(model.parameters(), lr=3e-4)

    best = 0.0
    for epoch in range(15):
        tr_loss, tr_acc = train_epoch(model, train_dl, opt, loss_fn, device)
        va_loss, va_acc = eval_epoch(model, val_dl, loss_fn, device)

        va_bin_acc = 0.0
        with torch.no_grad():
            model.eval()
            tot, corr_bin = 0, 0
            m2b = torch.tensor(MATERIAL2BIN_ID, device=device)
            for x, y in val_dl:
                x, y = x.to(device), y.to(device)
                y_pred_mat = model(x).argmax(1)
                corr_bin += (m2b[y_pred_mat] == m2b[y]).sum().item()
                tot += x.size(0)
            va_bin_acc = corr_bin / max(1, tot)

        print(f"epoch {epoch:02d} | train acc {tr_acc:.3f} | val acc {va_acc:.3f} | val bin acc {va_bin_acc:.3f}")

        if va_acc > best:
            best = va_acc
            torch.save({
                "state_dict": model.state_dict(),
                "materials": ID2CLASS,              # ["glass",...]
                "bins": ID2BIN,                     # ["compost","recycle","landfill"]
                "material_to_bin": MATERIAL2BIN_ID, # [1,1,1,1,1,2]
                "norm": {"mean": MEAN, "std": STD},
                "input_size": INPUT_SIZE,
            }, ROOT / "training" / "waste_mobilenetv3.pth")

    print("Best val acc:", best)

    (ROOT / "mobile" / "assets").mkdir(parents=True, exist_ok=True)
    with open(ROOT / "mobile" / "assets" / "labels.json", "w") as f:
        json.dump({
            "materials": ID2CLASS,
            "bins": ID2BIN,
            "material_to_bin": MATERIAL2BIN_ID,
            "mean": MEAN, "std": STD, "input_size": INPUT_SIZE
        }, f)
    print("Wrote mobile/assets/labels.json")

if __name__ == "__main__":
    main()