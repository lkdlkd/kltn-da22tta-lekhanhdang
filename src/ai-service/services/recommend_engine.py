"""
recommend_engine.py  —  v4 (personalized + for-you)
Core hybrid scoring engine — NO database access.
Node.js pre-fetches rooms and sends them as JSON.

v4 improvements vs v3:
  1. New 4th scoring component: personal_affinity_scores()
     Builds a "user preference vector" from rooms the user viewed/saved,
     then measures cosine similarity of each candidate to that profile.
  2. for-you endpoint uses 4 components:
       content + location + quality + personal_affinity
  3. Interaction weight: 'save' interactions count 2x vs 'view'
     (stronger intent signal).
  4. Quality score v4: min-floor of 0.05 so brand-new rooms aren't invisible.
"""

from typing import List, Optional
from datetime import datetime, timezone
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

# ── Constants ────────────────────────────────────────────────────────────────

AMENITY_LIST = [
    "wifi", "điều_hòa", "nóng_lạnh", "tủ_lạnh", "máy_giặt",
    "bếp", "chỗ_để_xe", "an_ninh", "camera", "thang_máy",
    "ban_công", "nội_thất", "vệ_sinh_riêng", "điện_nước_riêng",
]

TYPE_LIST = ["phòng_trọ", "chung_cư_mini", "nhà_nguyên_căn", "ký_túc_xá"]

# Feature vector dimension = 3 (continuous) + 4 (type) + 14 (amenity) = 21
VECTOR_DIM = 3 + len(TYPE_LIST) + len(AMENITY_LIST)

# Feature weights inside the content vector
_W_CONTINUOUS = 2.0
_W_TYPE       = 1.5
_W_AMENITY    = 0.7

_FEAT_WEIGHTS = np.array(
    [_W_CONTINUOUS] * 3
    + [_W_TYPE]     * len(TYPE_LIST)
    + [_W_AMENITY]  * len(AMENITY_LIST),
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
        return 0.5
    return float(np.clip((value - mn) / span, 0, 1))


# ── Vector builders ───────────────────────────────────────────────────────────

def build_room_vector(room: dict, stats: dict) -> np.ndarray:
    """Build a weighted 21-dim normalized feature vector for a single room."""
    vec = np.zeros(VECTOR_DIM, dtype=np.float32)
    vec[0] = _norm(room.get("price", 0),            stats["price_min"], stats["price_max"])
    vec[1] = _norm(room.get("area",  0),            stats["area_min"],  stats["area_max"])
    vec[2] = _norm(min(room.get("capacity", 1), 10), 1, 10)

    room_type = room.get("roomType", "")
    for i, t in enumerate(TYPE_LIST):
        vec[3 + i] = 1.0 if room_type == t else 0.0

    amenities = set(room.get("amenities", []))
    for i, a in enumerate(AMENITY_LIST):
        vec[7 + i] = 1.0 if a in amenities else 0.0

    return vec * _FEAT_WEIGHTS


def build_criteria_vector(criteria: dict, stats: dict) -> np.ndarray:
    """Build a weighted 21-dim vector from user preferences/criteria."""
    vec = np.zeros(VECTOR_DIM, dtype=np.float32)

    price_min = criteria.get("priceMin", 0)
    price_max = criteria.get("priceMax", 10_000_000)
    mid_price = (price_min + price_max) / 2
    vec[0] = _norm(mid_price,                            stats["price_min"], stats["price_max"])
    vec[1] = _norm(criteria.get("areaMin", 10),          stats["area_min"],  stats["area_max"])
    vec[2] = _norm(min(criteria.get("capacity", 1), 10), 1, 10)

    room_type = criteria.get("roomType")
    for i, t in enumerate(TYPE_LIST):
        vec[3 + i] = 0.5 if not room_type else (1.0 if room_type == t else 0.0)

    amenities = set(criteria.get("amenities", []))
    for i, a in enumerate(AMENITY_LIST):
        vec[7 + i] = 0.85 if a in amenities else 0.0

    return vec * _FEAT_WEIGHTS


# ── Score components ──────────────────────────────────────────────────────────

def content_scores_batch(target_vec: np.ndarray, matrix: np.ndarray) -> np.ndarray:
    """Cosine similarity of target vs all candidates (batch)."""
    if matrix.shape[0] == 0:
        return np.array([])
    t_norm = np.linalg.norm(target_vec)
    if t_norm < 1e-9:
        return np.zeros(matrix.shape[0], dtype=np.float32)
    sims = cosine_similarity(target_vec.reshape(1, -1), matrix)[0]
    return np.clip(sims, 0.0, 1.0)


def amenity_match_scores(candidates: list, required_amenities: list) -> np.ndarray:
    """Fraction of user-required amenities each room has. Used as content multiplier."""
    if not required_amenities:
        return np.ones(len(candidates), dtype=np.float32)
    n_req = len(required_amenities)
    scores = np.zeros(len(candidates), dtype=np.float32)
    for i, room in enumerate(candidates):
        room_amenities = set(room.get("amenities", []))
        matched = sum(1 for a in required_amenities if a in room_amenities)
        scores[i] = max(0.2, matched / n_req)
    return scores


def location_scores_batch(
    center_lat: float, center_lng: float,
    lats: np.ndarray, lngs: np.ndarray,
    radius_km: float = 5.0,
) -> np.ndarray:
    """Vectorized Haversine → location score [0, 1] with two-zone decay."""
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

    inner_radius = radius_km * 0.4
    scores = np.where(
        d_km <= inner_radius,
        1.0,
        np.clip(1.0 - (d_km - inner_radius) / (radius_km - inner_radius + 1e-9), 0.0, 1.0)
    )
    return scores.astype(np.float64)


def quality_scores_batch(candidates: list) -> np.ndarray:
    """Quality from engagement signals (_behavior normalized [0,1] by Node.js)."""
    behavior = np.array([r.get("_behavior", 0.0) for r in candidates], dtype=np.float64)
    # v4: min-floor of 0.05 so new rooms aren't completely invisible
    return np.clip(behavior, 0.05, 1.0)


def personal_affinity_scores(
    candidates: list,
    user_profile_vec: np.ndarray,
    stats: dict,
) -> np.ndarray:
    """
    v4 NEW: Measure how well each candidate matches the user's taste profile.

    user_profile_vec is a weighted average of vectors from rooms the user
    previously viewed/saved. This produces a "personal affinity" score ∈ [0, 1].

    If user_profile_vec is zero (no history) → returns 0.5 neutral for all.
    """
    n = len(candidates)
    if n == 0:
        return np.array([], dtype=np.float64)

    prof_norm = np.linalg.norm(user_profile_vec)
    if prof_norm < 1e-9:
        return np.full(n, 0.5, dtype=np.float64)

    matrix = np.vstack([build_room_vector(r, stats) for r in candidates])
    sims = cosine_similarity(user_profile_vec.reshape(1, -1), matrix)[0]
    return np.clip(sims, 0.0, 1.0).astype(np.float64)


def build_user_profile_vector(
    interacted_rooms: list,
    interaction_types: list,
    stats: dict,
    interacted_ats: Optional[list] = None,  # ISO strings, None → no decay
) -> np.ndarray:
    """
    v4 + time decay: Build a weighted-average feature vector representing user taste.

    Weights applied per interaction:
      - interactionType: 'save' × 2.0, 'view' × 1.0
      - time decay (half-life = 7 days, exponential):
          decay = 0.5 ^ (days_ago / 7)
          0 days → 1.00, 7 days → 0.50, 14 days → 0.25, 30 days → 0.09

    Combined weight = intent_weight × time_decay
    """
    if not interacted_rooms:
        return np.zeros(VECTOR_DIM, dtype=np.float32)

    intent_map = {"save": 2.0, "view": 1.0}
    now = datetime.now(timezone.utc)

    vecs    = []
    weights = []
    for idx, (room, itype) in enumerate(zip(interacted_rooms, interaction_types)):
        vec = build_room_vector(room, stats)

        # Intent weight
        w = intent_map.get(itype, 1.0)

        # Time decay  (half-life = 7 days)
        if interacted_ats and idx < len(interacted_ats) and interacted_ats[idx]:
            try:
                ts = datetime.fromisoformat(
                    interacted_ats[idx].replace("Z", "+00:00")
                )
                days_ago = max((now - ts).total_seconds() / 86400, 0)
                decay = 0.5 ** (days_ago / 7.0)  # ≈ 1.0 today, 0.5 at 7d, 0.25 at 14d
                w *= decay
            except (ValueError, TypeError):
                pass  # bad timestamp → no decay applied

        vecs.append(vec)
        weights.append(max(w, 1e-9))  # ensure positive

    vecs    = np.array(vecs,    dtype=np.float32)
    weights = np.array(weights, dtype=np.float32)
    weights /= weights.sum()  # normalize to sum = 1

    return np.average(vecs, axis=0, weights=weights)


# ── Main scorer ───────────────────────────────────────────────────────────────

def score_and_rank(
    candidates:          List[dict],
    target_vec:          np.ndarray,
    center:              Optional[dict],
    radius_km:           float,
    weights:             dict,       # content, location, quality, personal
    stats:               dict,
    limit:               int,
    required_amenities:  Optional[list] = None,
    user_profile_vec:    Optional[np.ndarray] = None,  # v4: for personal affinity
) -> List[dict]:
    """
    Score every candidate with a hybrid formula and return top-N.

    v4: Supports 4 scoring components:
      content  — cosine similarity to target/criteria vector
      location — Haversine distance decay
      quality  — global engagement (_behavior)
      personal — cosine similarity to user taste profile vector
    """
    n = len(candidates)
    if n == 0:
        return []

    # ── Feature matrix (N × VECTOR_DIM) ──────────────────────────────────
    matrix = np.vstack([build_room_vector(r, stats) for r in candidates])

    # ── Content scores ────────────────────────────────────────────────────
    c_scores = content_scores_batch(target_vec, matrix)
    if required_amenities:
        a_match = amenity_match_scores(candidates, required_amenities)
        c_scores = c_scores * a_match

    # ── Location scores ───────────────────────────────────────────────────
    w_loc = float(weights.get("location", 0.0))
    if center and w_loc > 0:
        lngs_arr = np.array([r["location"]["coordinates"][0] for r in candidates], dtype=np.float64)
        lats_arr = np.array([r["location"]["coordinates"][1] for r in candidates], dtype=np.float64)
        l_scores = location_scores_batch(center["lat"], center["lng"], lats_arr, lngs_arr, radius_km)
    else:
        l_scores = np.zeros(n, dtype=np.float64)
        w_loc    = 0.0

    # ── Quality scores ────────────────────────────────────────────────────
    q_scores = quality_scores_batch(candidates)

    # ── Personal affinity scores (v4) ─────────────────────────────────────
    w_per = float(weights.get("personal", 0.0))
    if user_profile_vec is not None and w_per > 0:
        p_scores = personal_affinity_scores(candidates, user_profile_vec, stats)
    else:
        p_scores = np.zeros(n, dtype=np.float64)
        w_per    = 0.0

    # ── Redistribute unused weights ───────────────────────────────────────
    w_c = float(weights.get("content",  0.5))
    w_q = float(weights.get("quality",  0.2))

    used_weights = {"content": w_c, "location": w_loc, "quality": w_q, "personal": w_per}
    total_active = sum(v for k, v in used_weights.items() if v > 0)
    if total_active > 1e-9:
        # Normalize to sum = 1
        factor = 1.0 / total_active
        w_c   *= factor
        w_loc *= factor
        w_q   *= factor
        w_per *= factor

    # ── Weighted sum ──────────────────────────────────────────────────────
    final = w_c * c_scores + w_loc * l_scores + w_q * q_scores + w_per * p_scores

    # ── Sort desc, take top-N ─────────────────────────────────────────────
    top_idx = np.argsort(final)[::-1][:limit]

    result = []
    for i in top_idx:
        room = dict(candidates[i])
        room["_score"] = round(float(final[i]), 4)
        result.append(room)

    return result
