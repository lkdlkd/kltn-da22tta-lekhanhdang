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
    viewCount: int = 0
    isAvailable: bool = True
    landlord: Optional[dict] = None
    behavior: float = Field(default=0.0, alias="_behavior")

    class Config:
        populate_by_name = True


class Center(BaseModel):
    lat: float
    lng: float


# ── API 1: Similar Rooms ─────────────────────────────────────────────────────

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


# ── API 2: Wizard ────────────────────────────────────────────────────────────

class WizardCriteria(BaseModel):
    roomType: Optional[str] = None
    priceMin: float = 0
    priceMax: float = 10_000_000
    areaMin: float = 10
    capacity: int = 1
    amenities: List[str] = []
    radius: float = 5.0


class WizardRequest(BaseModel):
    criteria: WizardCriteria
    candidates: List[RoomItem]
    center: Optional[Center] = None
    limit: int = 12

    class Config:
        populate_by_name = True


class WizardResponse(BaseModel):
    rooms: List[dict]
    total: int


# ── API 3: For-You (personalized) ───────────────────────────────────────────

class UserInteraction(BaseModel):
    """A single interaction from user history (sent by Node.js)"""
    roomId: Optional[str] = None         # MongoDB _id (dùng để dedup nếu cần)
    roomType: str = "phòng_trọ"
    price: float = 0
    area: float = 0
    capacity: int = 1
    amenities: List[str] = []
    interactionType: str = "view"   # 'view' | 'save'
    interactedAt: Optional[str] = None  # ISO string, dùng cho time decay


class ForYouRequest(BaseModel):
    """
    For-you personalized request.
    Node.js sends:
      - candidates: pool of rooms to score
      - criteria: merged (implicit + user-provided) criteria
      - userHistory: last N rooms the user interacted with + type
      - center: GPS if available
    """
    criteria: WizardCriteria
    candidates: List[RoomItem]
    userHistory: List[UserInteraction] = []  # empty = no history
    center: Optional[Center] = None
    limit: int = 12

    class Config:
        populate_by_name = True


class ForYouResponse(BaseModel):
    rooms: List[dict]
    total: int
