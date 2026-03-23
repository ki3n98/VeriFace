"""
OcclusionService — runs EfficientNet-B0 occlusion classifier on a face crop.

Classes (must match training):
  0 = clear
  1 = occluded

Loads model from backend/models/occlusion_model.pth.
If the file is missing the service is disabled and all checks pass through.
"""

from pathlib import Path

import cv2
import numpy as np
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image

MODEL_PATH  = Path(__file__).parent.parent.parent / "models" / "occlusion_model.pth"
# DEBUG_DIR   = Path(__file__).parent.parent.parent / "debug_frames"
# DEBUG_DIR.mkdir(exist_ok=True)

MEAN = [0.485, 0.456, 0.406]
STD  = [0.229, 0.224, 0.225]

_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(MEAN, STD),
])


class OcclusionService:
    def __init__(self):
        self.device  = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.enabled = False
        self.model   = None

        if not MODEL_PATH.exists():
            print(
                f"[OcclusionService] Model not found at {MODEL_PATH}. "
                "Occlusion checks disabled — train and copy the model to enable."
            )
            return

        model = models.efficientnet_b0(weights=None)
        model.classifier[1] = nn.Linear(model.classifier[1].in_features, 2)
        model.load_state_dict(torch.load(MODEL_PATH, map_location=self.device))
        model.eval()
        model.to(self.device)

        self.model   = model
        self.enabled = True
        print(f"[OcclusionService] Loaded from {MODEL_PATH} on {self.device}")

    def is_occluded(
        self,
        img_bgr: np.ndarray,
        threshold: float = 0.8,
    ) -> tuple[bool, float]:
        """
        img_bgr  : full-frame BGR numpy array (from cv2.imdecode)
        threshold: confidence above which the face is considered occluded.

        Returns (is_occluded: bool, occluded_prob: float).
        If service is disabled, always returns (False, 0.0).
        """
        if not self.enabled:
            return False, 0.0

        # BGR → RGB → PIL → tensor
        pil    = Image.fromarray(cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB))
        # pil_resized = pil.resize((224, 224))  # what the model actually sees
        tensor = _transform(pil).unsqueeze(0).to(self.device)

        with torch.no_grad():
            out   = self.model(tensor)
            probs = torch.softmax(out, dim=1)
            clear_prob    = probs[0, 0].item()
            occluded_prob = probs[0, 1].item()

        # Reject unless the model is confidently clear — uncertainty counts as occluded
        is_occ = clear_prob < threshold
        label  = "OCCLUDED" if is_occ else "CLEAR"
        print(f"[OcclusionService] clear={clear_prob:.3f}  occluded={occluded_prob:.3f}  result={label}")

        # import time
        # debug_path = DEBUG_DIR / f"{int(time.time()*1000)}_{label}.jpg"
        # pil_resized.save(debug_path)

        return is_occ, occluded_prob


# Singleton — loaded once at startup
occlusion_service = OcclusionService()
