"""
routers/recommend.py  —  v4
FastAPI endpoints — pure processing, no DB access.
Node.js sends filtered candidates, we return scored+sorted results.

3 endpoints:
  /similar  → content-based similarity to a target room
  /wizard   → criteria-based scoring (search page)
  /for-you  → personalized scoring with user taste profile (4 components)

Weight rationale:
  /similar  → content=0.55, location=0.25, quality=0.20
  /wizard   → with GPS: content=0.35, location=0.40, quality=0.25
              no GPS:   content=0.65, quality=0.35
  /for-you  → with GPS: content=0.25, location=0.20, quality=0.15, personal=0.40
              no GPS:   content=0.30, quality=0.20, personal=0.50
"""

from fastapi import APIRouter
from schemas.recommend_schema import (
    SimilarRequest, SimilarResponse,
    WizardRequest, WizardResponse,
    ForYouRequest, ForYouResponse,
)
from services.recommend_engine import (
    build_room_vector,
    build_criteria_vector,
    build_user_profile_vector,
    compute_stats,
    score_and_rank,
)

router = APIRouter()


def _to_dict(room) -> dict:
    """Convert Pydantic RoomItem to plain dict for the engine."""
    d = room.model_dump(by_alias=True)
    if "_id" not in d and "id" in d:
        d["_id"] = d.pop("id")
    return d


# ─────────────────────────────────────────────────────────────────────────────
# API 1: POST /recommend/similar
# Phòng tương tự phòng đang xem (RoomDetailPage)
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/similar", response_model=SimilarResponse)
def similar_rooms(req: SimilarRequest):
    candidates = [_to_dict(c) for c in req.candidates]
    target     = _to_dict(req.target)

    all_rooms  = [target] + candidates
    stats      = compute_stats(all_rooms)

    target_vec = build_room_vector(target, stats)
    center     = {"lat": req.center.lat, "lng": req.center.lng} if req.center else None

    weights = {"content": 0.55, "location": 0.25, "quality": 0.20}

    results = score_and_rank(
        candidates=candidates,
        target_vec=target_vec,
        center=center,
        radius_km=req.radius_km,
        weights=weights,
        stats=stats,
        limit=req.limit,
    )

    return SimilarResponse(rooms=results)


# ─────────────────────────────────────────────────────────────────────────────
# API 2: POST /recommend/wizard
# Gợi ý theo tiêu chí tìm kiếm (SearchPage / WizardSheet)
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/wizard", response_model=WizardResponse)
def wizard_recommend(req: WizardRequest):
    candidates = [_to_dict(c) for c in req.candidates]
    criteria   = req.criteria.model_dump()

    stats        = compute_stats(candidates)
    criteria_vec = build_criteria_vector(criteria, stats)

    center    = {"lat": req.center.lat, "lng": req.center.lng} if req.center else None
    has_gps   = center is not None
    radius_km = float(criteria.get("radius", 5.0))

    weights = (
        {"content": 0.35, "location": 0.40, "quality": 0.25}
        if has_gps
        else {"content": 0.65, "location": 0.00, "quality": 0.35}
    )

    required_amenities = criteria.get("amenities") or []

    results = score_and_rank(
        candidates=candidates,
        target_vec=criteria_vec,
        center=center,
        radius_km=radius_km,
        weights=weights,
        stats=stats,
        limit=req.limit,
        required_amenities=required_amenities,
    )

    return WizardResponse(rooms=results, total=len(results))


# ─────────────────────────────────────────────────────────────────────────────
# API 3: POST /recommend/for-you
# Gợi ý cá nhân hóa dựa trên hành vi xem/lưu phòng
# 4 scoring components: content + location + quality + personal_affinity
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/for-you", response_model=ForYouResponse)
def for_you_recommend(req: ForYouRequest):
    candidates = [_to_dict(c) for c in req.candidates]
    criteria   = req.criteria.model_dump()

    stats        = compute_stats(candidates)
    criteria_vec = build_criteria_vector(criteria, stats)

    center    = {"lat": req.center.lat, "lng": req.center.lng} if req.center else None
    has_gps   = center is not None
    radius_km = float(criteria.get("radius", 5.0))

    # ── Build user profile vector from interaction history ────────────────
    history_rooms = []
    history_types = []
    for h in req.userHistory:
        history_rooms.append({
            "roomType":  h.roomType,
            "price":     h.price,
            "area":      h.area,
            "capacity":  h.capacity,
            "amenities": h.amenities,
        })
        history_types.append(h.interactionType)

    has_history = len(history_rooms) > 0
    interacted_ats = [h.interactedAt for h in req.userHistory]  # ISO strings for time decay
    user_profile_vec = build_user_profile_vector(history_rooms, history_types, stats, interacted_ats)

    # ── Weight strategy ──────────────────────────────────────────────────
    # If user has history → personal affinity is the strongest signal
    # If no history → fall back to criteria-only (like wizard)
    if has_history:
        if has_gps:
            weights = {"content": 0.25, "location": 0.20, "quality": 0.15, "personal": 0.40}
        else:
            weights = {"content": 0.30, "location": 0.00, "quality": 0.20, "personal": 0.50}
    else:
        # No history → same as wizard
        if has_gps:
            weights = {"content": 0.35, "location": 0.40, "quality": 0.25, "personal": 0.00}
        else:
            weights = {"content": 0.65, "location": 0.00, "quality": 0.35, "personal": 0.00}

    required_amenities = criteria.get("amenities") or []

    results = score_and_rank(
        candidates=candidates,
        target_vec=criteria_vec,
        center=center,
        radius_km=radius_km,
        weights=weights,
        stats=stats,
        limit=req.limit,
        required_amenities=required_amenities,
        user_profile_vec=user_profile_vec if has_history else None,
    )

    return ForYouResponse(rooms=results, total=len(results))
