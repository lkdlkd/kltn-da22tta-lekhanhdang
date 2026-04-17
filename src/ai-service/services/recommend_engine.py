"""
recommend_engine.py  —  v2 (fixed & improved)
Core hybrid scoring engine — NO database access.
Node.js pre-fetches rooms and sends them as JSON.

Fixes vs v1:
  1. Remove double-normalization of _behavior (it's already 0-1 from Node.js).
  2. Add feature weights to balance continuous vs amenity dims in content vector.
  3. Handle zero-vector edge case for cosine similarity (returns 0.0 instead of nan).
  4. Incorporate averageRating into a composite "quality" score alongside behavior.
  5. Clean up weight renormalization — explicit redistribution when location=0.
"""

from typing import List, Optional
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

# ── Constants ────────────────────────────────────────────────────────────────

AMENITY_LIST = [
    "wifi", "điều_hòa", "nóng_lạnh", "tủ_lạnh", "máy_giặt",
    "bếp", "chỗ_để_xe", "an_ninh", "camera", "thang_máy",
    "ban_công", "nội_thất", "vệ_sinh_riêng", "điện_nước_riêng",
]

TYPE_LIST = ["phòng_trọ", "chung_cư_mini", "nhà_nguyên_căn", "ký_túc_xá"]

# Feature vector dimension = 3 + 4 + 14 = 21
VECTOR_DIM = 3 + len(TYPE_LIST) + len(AMENITY_LIST)

# ── Feature weights inside the content vector ────────────────────────────────
# Applied BEFORE cosine similarity to balance dimension importance.
# Without weights, 14 amenity dims (67%) would dominate over 3 continuous dims.
_W_CONTINUOUS   = 2.0   # price, area, capacity — scale up
_W_TYPE         = 1.5   # room type one-hot
_W_AMENITY      = 0.7   # each amenity dim (dampened to reduce dominance)

# Pre-compute weight vector once (shape: VECTOR_DIM)
_FEAT_WEIGHTS = np.array(
    [_W_CONTINUOUS] * 3
    + [_W_TYPE]      * len(TYPE_LIST)
    + [_W_AMENITY]   * len(AMENITY_LIST),
    dtype=np.float32,
)


# ── Stats helpers ─────────────────────────────────────────────────────────────

def compute_stats(rooms: list) -> dict:
    """Compute min/max for normalization from candidate pool."""
    if not rooms:
        return {"price_min": 0, "price_max": 1, "area_min": 0, "area_max": 1}
    prices = [r.get("price", 0) for r in rooms]
    areas  = [r.get("area",  0) for r in rooms]
    return {
        "price_min": min(prices), "price_max": max(prices),
        "area_min":  min(areas),  "area_max":  max(areas),
    }


def _norm(value: float, mn: float, mx: float) -> float:
    span = mx - mn
    if span < 1e-9:
        return 0.5  # All same → neutral 0.5 rather than 0 (avoids penalizing)
    return float(np.clip((value - mn) / span, 0, 1))


# ── Vector builders ───────────────────────────────────────────────────────────

def build_room_vector(room: dict, stats: dict) -> np.ndarray:
    """
    Build a weighted 21-dim normalized feature vector for a single room.
    Applies _FEAT_WEIGHTS so that continuous features are not overwhelmed
    by the 14 binary amenity dimensions.

    Dim layout:
        [0]   price     (min-max normalized)
        [1]   area      (min-max normalized)
        [2]   capacity  (min-max, clip 1–10)
        [3–6] roomType  (one-hot)
        [7–20] amenities (multi-hot)
    """
    vec = np.zeros(VECTOR_DIM, dtype=np.float32)
    vec[0] = _norm(room.get("price", 0),     stats["price_min"], stats["price_max"])
    vec[1] = _norm(room.get("area",  0),     stats["area_min"],  stats["area_max"])
    vec[2] = _norm(min(room.get("capacity", 1), 10), 1, 10)

    room_type = room.get("roomType", "")
    for i, t in enumerate(TYPE_LIST):
        vec[3 + i] = 1.0 if room_type == t else 0.0

    amenities = set(room.get("amenities", []))
    for i, a in enumerate(AMENITY_LIST):
        vec[7 + i] = 1.0 if a in amenities else 0.0

    return vec * _FEAT_WEIGHTS   # apply feature scaling


def build_criteria_vector(criteria: dict, stats: dict) -> np.ndarray:
    """
    Build a weighted 21-dim vector from wizard criteria (user preferences).
    - Mid-point of [priceMin, priceMax] used for continuous price dim.
    - Type gets 0.5 weight if 'all types' selected (neutral).
    - Only amenities explicitly selected by user get 1.0.
    """
    vec = np.zeros(VECTOR_DIM, dtype=np.float32)

    price_min = criteria.get("priceMin", 0)
    price_max = criteria.get("priceMax", 10_000_000)
    mid_price = (price_min + price_max) / 2
    vec[0] = _norm(mid_price,                           stats["price_min"], stats["price_max"])
    vec[1] = _norm(criteria.get("areaMin", 10),         stats["area_min"],  stats["area_max"])
    vec[2] = _norm(min(criteria.get("capacity", 1), 10), 1, 10)

    room_type = criteria.get("roomType")  # None → 'all types'
    for i, t in enumerate(TYPE_LIST):
        vec[3 + i] = 0.5 if not room_type else (1.0 if room_type == t else 0.0)

    amenities = set(criteria.get("amenities", []))
    for i, a in enumerate(AMENITY_LIST):
        vec[7 + i] = 1.0 if a in amenities else 0.0

    return vec * _FEAT_WEIGHTS   # apply same feature scaling


# ── Score components ──────────────────────────────────────────────────────────

def content_scores_batch(target_vec: np.ndarray, matrix: np.ndarray) -> np.ndarray:
    """
    Cosine similarity of target vs all candidates (batch).
    Handles zero-vector gracefully — returns 0.0 instead of nan.
    Returns shape (N,).
    """
    if matrix.shape[0] == 0:
        return np.array([])

    t_norm = np.linalg.norm(target_vec)
    if t_norm < 1e-9:
        # Target is zero vector (no features) → neutral 0 for all
        return np.zeros(matrix.shape[0], dtype=np.float32)

    sims = cosine_similarity(target_vec.reshape(1, -1), matrix)[0]  # (N,)
    # Clamp to [0, 1] — cosine_similarity can very rarely give tiny negatives due to float precision
    return np.clip(sims, 0.0, 1.0)


def location_scores_batch(
    center_lat: float,
    center_lng: float,
    lats: np.ndarray,
    lngs: np.ndarray,
    radius_km: float = 5.0,
) -> np.ndarray:
    """
    Vectorized Haversine distance → location score [0, 1].
    Score = 1 at center, linearly decays to 0 at radius_km.
    Rooms beyond radius get 0.
    """
    R = 6371.0
    dlat = np.radians(lats - center_lat)
    dlng = np.radians(lngs - center_lng)
    a = (
        np.sin(dlat / 2) ** 2
        + np.cos(np.radians(center_lat))
        * np.cos(np.radians(lats))
        * np.sin(dlng / 2) ** 2
    )
    d_km = 2 * R * np.arcsin(np.sqrt(np.clip(a, 0, 1)))
    return np.clip(1.0 - d_km / radius_km, 0.0, 1.0)


def quality_scores_batch(candidates: list) -> np.ndarray:
    """
    Quality score from engagement signals pre-computed by Node.js.
    _behavior is already in [0, 1] — computed as:
        0.4 * (viewCount / maxView) + 0.6 * (favCount / maxFav)
    (averageRating removed — review feature not in scope)
    Just sanitize and use directly — do NOT re-normalize.
    """
    behavior = np.array([r.get("_behavior", 0.0) for r in candidates], dtype=np.float64)
    return np.clip(behavior, 0.0, 1.0)



# ── Main scorer ───────────────────────────────────────────────────────────────

def score_and_rank(
    candidates: List[dict],
    target_vec: np.ndarray,
    center: Optional[dict],   # {"lat": float, "lng": float} | None
    radius_km: float,
    weights: dict,            # {"content": float, "location": float, "quality": float}
    stats: dict,
    limit: int,
) -> List[dict]:
    """
    Score every candidate with a 3-component hybrid formula and return top-N.

    Components:
      content  — Cosine similarity (feature vector match)
      location — Haversine proximity   (0 when GPS unavailable)
      quality  — Rating + behavior     (social proof & engagement)

    Weight redistribution when GPS is unavailable:
      location weight is split proportionally between content and quality.
    """
    n = len(candidates)
    if n == 0:
        return []

    # ── Build feature matrix (N × VECTOR_DIM) ────────────────────────────
    matrix = np.vstack([build_room_vector(r, stats) for r in candidates])  # (N, 21)

    # ── Content scores ────────────────────────────────────────────────────
    c_scores = content_scores_batch(target_vec, matrix)  # (N,)

    # ── Location scores ───────────────────────────────────────────────────
    w_loc = float(weights.get("location", 0.0))
    if center and w_loc > 0:
        lngs_arr = np.array([r["location"]["coordinates"][0] for r in candidates], dtype=np.float64)
        lats_arr = np.array([r["location"]["coordinates"][1] for r in candidates], dtype=np.float64)
        l_scores = location_scores_batch(center["lat"], center["lng"], lats_arr, lngs_arr, radius_km)
    else:
        l_scores = np.zeros(n, dtype=np.float64)
        w_loc    = 0.0  # disable

    # ── Quality scores (rating + behavior) ───────────────────────────────
    q_scores = quality_scores_batch(candidates)  # (N,)

    # ── Redistribute location weight if GPS disabled ──────────────────────
    w_c = float(weights.get("content", 0.5))
    w_q = float(weights.get("quality", 0.5))

    if w_loc == 0.0:
        total = w_c + w_q
        if total > 1e-9:
            w_c = w_c / total
            w_q = w_q / total
        else:
            w_c, w_q = 0.6, 0.4  # safe fallback

    # ── Weighted sum ──────────────────────────────────────────────────────
    final = w_c * c_scores + w_loc * l_scores + w_q * q_scores

    # ── Sort desc, take top-N ─────────────────────────────────────────────
    top_idx = np.argsort(final)[::-1][:limit]

    result = []
    for i in top_idx:
        room = dict(candidates[i])
        room["_score"] = round(float(final[i]), 4)
        result.append(room)

    return result
