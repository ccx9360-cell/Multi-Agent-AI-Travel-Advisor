"""
Service Registry — singleton service instances shared across requests.
Avoids creating new service objects for every pipeline run.

Usage:
    ServiceRegistry.flights       # -> FlightService singleton
    ServiceRegistry.meituan       # -> MeituanTravelClient singleton
"""

import logging
from typing import Optional

from backend.services.flights import FlightService
from backend.services.accommodation import AccommodationService
from backend.services.activities import ActivityService
from backend.services.logistics import LogisticsService
from backend.services.meituan.mttravel_client import MeituanTravelClient

logger = logging.getLogger(__name__)


class ServiceRegistry:
    """Lazy singleton registry for all backend services."""

    _flights: Optional[FlightService] = None
    _accommodation: Optional[AccommodationService] = None
    _activities: Optional[ActivityService] = None
    _logistics: Optional[LogisticsService] = None
    _meituan: Optional[MeituanTravelClient] = None

    @classmethod
    def get_flights(cls) -> FlightService:
        if cls._flights is None:
            cls._flights = FlightService()
            logger.info("ServiceRegistry: created FlightService")
        return cls._flights

    @classmethod
    def get_accommodation(cls) -> AccommodationService:
        if cls._accommodation is None:
            cls._accommodation = AccommodationService()
            logger.info("ServiceRegistry: created AccommodationService")
        return cls._accommodation

    @classmethod
    def get_activities(cls) -> ActivityService:
        if cls._activities is None:
            cls._activities = ActivityService()
            logger.info("ServiceRegistry: created ActivityService")
        return cls._activities

    @classmethod
    def get_logistics(cls) -> LogisticsService:
        if cls._logistics is None:
            cls._logistics = LogisticsService()
            logger.info("ServiceRegistry: created LogisticsService")
        return cls._logistics

    @classmethod
    def get_meituan(cls) -> MeituanTravelClient:
        if cls._meituan is None:
            cls._meituan = MeituanTravelClient()
            logger.info("ServiceRegistry: created MeituanTravelClient")
        return cls._meituan

    # Convenience properties
    @property
    def flights(self) -> FlightService:
        return self.get_flights()

    @property
    def accommodation(self) -> AccommodationService:
        return self.get_accommodation()

    @property
    def activities(self) -> ActivityService:
        return self.get_activities()

    @property
    def logistics(self) -> LogisticsService:
        return self.get_logistics()

    @property
    def meituan(self) -> MeituanTravelClient:
        return self.get_meituan()

    @classmethod
    def reset(cls) -> None:
        """Reset all singletons (testing / config reload)."""
        cls._flights = None
        cls._accommodation = None
        cls._activities = None
        cls._logistics = None
        cls._meituan = None
        logger.info("ServiceRegistry: reset all singletons")
