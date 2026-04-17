"""
routers/recommend.py  —  v2
FastAPI endpoints — pure processing, no DB access.
Node.js sends filtered candidates, we return scored+sorted results.

Weight rationale:
  /similar  → content is king (same type/features), behavior as tie-breaker
  /wizard   → with GPS: location highly important; without GPS: content + quality
"""

from fastapi import APIRouter
from schemas.recommend_schema import (
    SimilarRequest, SimilarResponse,
    WizardRequest, WizardResponse,
)
from services.recommend_engine import (
    build_room_vector,
    build_criteria_vector,
    compute_stats,
    score_and_rank,
)

router = APIRouter()


def _to_dict(room) -> dict:
    """Convert Pydantic RoomItem to plain dict that Node.js and the engine can consume."""
    d = room.model_dump(by_alias=True)
    # Ensure _id field is present (Pydantic field 'id' has alias '_id')
    if "_id" not in d and "id" in d:
        d["_id"] = d.pop("id")
    return d


# ─────────────────────────────────────────────────────────────────────────────
# POST /recommend/similar
# Called by Node.js when user opens a room detail page.
#
# Weight design (similar rooms):
#   content  = 0.55  — feature match is most important
#   location = 0.25  — nearby rooms are more relevant
#   quality  = 0.20  — rating + engagement as tie-breaker
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/similar", response_model=SimilarResponse)
def similar_rooms(req: SimilarRequest):
    candidates = [_to_dict(c) for c in req.candidates]
    target     = _to_dict(req.target)

    # Include target in stats pool so normalization covers its price/area too
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
# POST /recommend/wizard
# Called by Node.js after user completes the 5-step Room Finder Wizard.
#
# Weight design (wizard):
#   With GPS:    content=0.30  location=0.45  quality=0.25
#     → location is most important when user shares position
#   Without GPS: content=0.60  location=0.00  quality=0.40
#     → rely on feature match + social proof
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/wizard", response_model=WizardResponse)
def wizard_recommend(req: WizardRequest):
    candidates   = [_to_dict(c) for c in req.candidates]
    criteria     = req.criteria.model_dump()

    stats        = compute_stats(candidates)
    criteria_vec = build_criteria_vector(criteria, stats)

    center    = {"lat": req.center.lat, "lng": req.center.lng} if req.center else None
    has_gps   = center is not None
    radius_km = float(criteria.get("radius", 5.0))

    weights = (
        {"content": 0.30, "location": 0.45, "quality": 0.25}
        if has_gps
        else {"content": 0.60, "location": 0.00, "quality": 0.40}
    )

    results = score_and_rank(
        candidates=candidates,
        target_vec=criteria_vec,
        center=center,
        radius_km=radius_km,
        weights=weights,
        stats=stats,
        limit=req.limit,
    )

    return WizardResponse(rooms=results, total=len(results))
