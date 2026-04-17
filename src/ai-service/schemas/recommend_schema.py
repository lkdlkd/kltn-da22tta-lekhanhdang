from pydantic import BaseModel, Field
from typing import List, Optional


class LocationCoords(BaseModel):
    """GeoJSON Point coordinates [longitude, latitude]"""
    coordinates: List[float]  # [lng, lat]


class RoomItem(BaseModel):
    """Minimal room representation sent from Node.js"""
    id: str = Field(alias="_id")
    title: str = ""
    price: float = 0
    area: float = 0
    capacity: int = 1
    roomType: str = "phòng_trọ"
    amenities: List[str] = []
    location: LocationCoords
    images: List[str] = []
    slug: str = ""
    address: str = ""
    averageRating: float = 0
    reviewCount: int = 0
    viewCount: int = 0
    landlord: Optional[dict] = None
    behavior: float = Field(default=0.0, alias="_behavior")

    class Config:
        populate_by_name = True


class Center(BaseModel):
    lat: float
    lng: float


# ── Similar Rooms ─────────────────────────────────────────────────────────────

class SimilarRequest(BaseModel):
    target: RoomItem
    candidates: List[RoomItem]
    center: Optional[Center] = None
    radius_km: float = 10.0
    limit: int = 6

    class Config:
        populate_by_name = True


class SimilarResponse(BaseModel):
    rooms: List[dict]


# ── Wizard ────────────────────────────────────────────────────────────────────

class WizardCriteria(BaseModel):
    roomType: Optional[str] = None   # None = 'tất cả'
    priceMin: float = 0
    priceMax: float = 10_000_000
    areaMin: float = 10
    capacity: int = 1
    amenities: List[str] = []
    radius: float = 5.0              # km, dùng khi có GPS


class WizardRequest(BaseModel):
    criteria: WizardCriteria
    candidates: List[RoomItem]
    center: Optional[Center] = None  # GPS user — None nếu không có
    limit: int = 12

    class Config:
        populate_by_name = True


class WizardResponse(BaseModel):
    rooms: List[dict]
    total: int
