"""
Data models for China-focused travel services.
"""
from pydantic import BaseModel, Field
from typing import List, Optional


# ── Train Models ──────────────────────────────────────────────────

class TrainOption(BaseModel):
    train_number: str
    train_type: str  # G/D/C/K/T/Z
    departure_station: str
    arrival_station: str
    departure_time: str
    arrival_time: str
    duration: str
    seat_types: List[dict] = []  # [{type, price, remaining}]
    booking_url: Optional[str] = None


class TrainSearchResult(BaseModel):
    origin: str
    destination: str
    date: str
    options: List[TrainOption] = []


# ── Weather Models ────────────────────────────────────────────────

class WeatherInfo(BaseModel):
    city: str
    temperature: str
    weather: str
    wind_direction: str
    wind_power: str
    humidity: str
    report_time: str


class WeatherForecast(BaseModel):
    date: str
    day_weather: str
    night_weather: str
    day_temp: str
    night_temp: str
    day_wind: str
    night_wind: str


class WeatherResult(BaseModel):
    live: Optional[WeatherInfo] = None
    forecast: List[WeatherForecast] = []


# ── Knowledge Models ──────────────────────────────────────────────

class KnowledgeItem(BaseModel):
    title: str
    content: str
    category: str  # attraction, food, transport, accommodation, tip
    city: str
    tags: List[str] = []


class KnowledgeQueryResult(BaseModel):
    query: str
    items: List[KnowledgeItem] = []
    source: str = "rag"


# ── Request Models ────────────────────────────────────────────────

class TravelRequest(BaseModel):
    message: str


class TravelPlanParams(BaseModel):
    destinations: List[str]
    origin: str = ""
    departure_date: Optional[str] = None
    return_date: Optional[str] = None
    duration_days: int = 7
    travelers: int = 1
    budget_level: str = "mid-range"
    interests: List[str] = []
    needs_train: bool = False
    special_requirements: List[str] = []


# ── Response Models ───────────────────────────────────────────────

class ItineraryResponse(BaseModel):
    id: str
    request: str
    itinerary: str
    created_at: str
    status: str
