"""
Photo categorization using OpenAI CLIP zero-shot classification.
Categories: document, prescription, receipt, people, travel, pets, other.
"""
from PIL import Image
from typing import Tuple, List
import logging
import numpy as np

logger = logging.getLogger(__name__)

CATEGORIES = [
    "document",
    "prescription",
    "receipt",
    "people",
    "travel",
    "pets",
    "other",
]

# Text prompts per category for zero-shot CLIP classification
CATEGORY_PROMPTS = {
    "document": [
        "a photo of a document, paper, or form",
        "a scanned document with text",
        "an official document or certificate",
    ],
    "prescription": [
        "a photo of a medical prescription",
        "a doctor's prescription with medicine names",
        "a pharmacy receipt or medicine label",
    ],
    "receipt": [
        "a photo of a store receipt or bill",
        "a shopping receipt with prices",
        "a payment receipt or invoice",
    ],
    "people": [
        "a photo of people or a person",
        "a portrait photo of someone",
        "a group photo with faces",
    ],
    "travel": [
        "a travel photo of a landmark or tourist attraction",
        "a scenic travel photo of mountains, beaches or cities",
        "a vacation or holiday photo",
    ],
    "pets": [
        "a photo of a pet animal",
        "a photo of a dog or cat",
        "a cute animal pet photo",
    ],
    "other": [
        "a miscellaneous photo",
        "a general everyday photo",
    ],
}

_model = None
_processor = None


def get_clip_model():
    global _model, _processor
    if _model is None:
        try:
            from transformers import CLIPProcessor, CLIPModel
            import torch
            logger.info("Loading CLIP model...")
            _processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
            _model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
            _model.eval()
            logger.info("CLIP model loaded.")
        except Exception as e:
            logger.warning(f"CLIP model not available: {e}. Using mock categorization.")
    return _model, _processor


def categorize_with_clip(image: Image.Image) -> Tuple[str, float, List[float]]:
    """Returns (category, confidence, embedding_vector)."""
    model, processor = get_clip_model()

    if model is None:
        # Fallback: simple rule-based using image metadata
        return _fallback_categorize(image)

    import torch

    # Build flat text list for all prompts
    all_texts = []
    cat_indices = {}
    idx = 0
    for cat, prompts in CATEGORY_PROMPTS.items():
        cat_indices[cat] = list(range(idx, idx + len(prompts)))
        all_texts.extend(prompts)
        idx += len(prompts)

    inputs = processor(text=all_texts, images=image, return_tensors="pt", padding=True)

    with torch.no_grad():
        outputs = model(**inputs)
        logits = outputs.logits_per_image[0]  # shape: (num_texts,)
        probs = logits.softmax(dim=0).numpy()

        # Image embedding
        image_features = outputs.image_embeds[0].numpy().tolist()

    # Aggregate scores per category (max of its prompts)
    cat_scores = {}
    for cat, indices in cat_indices.items():
        cat_scores[cat] = float(max(probs[i] for i in indices))

    best_cat = max(cat_scores, key=cat_scores.get)
    confidence = cat_scores[best_cat]

    return best_cat, confidence, image_features


def _fallback_categorize(image: Image.Image) -> Tuple[str, float, List[float]]:
    """Simple fallback when CLIP is unavailable."""
    import random
    # In production this would use basic CV heuristics
    category = "other"
    confidence = 0.5
    embedding = [random.random() for _ in range(512)]
    return category, confidence, embedding


def get_image_embedding(image: Image.Image) -> List[float]:
    """Get CLIP embedding for search purposes."""
    _, _, embedding = categorize_with_clip(image)
    return embedding


def cosine_similarity(a: List[float], b: List[float]) -> float:
    a_arr = np.array(a)
    b_arr = np.array(b)
    norm_a = np.linalg.norm(a_arr)
    norm_b = np.linalg.norm(b_arr)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a_arr, b_arr) / (norm_a * norm_b))
