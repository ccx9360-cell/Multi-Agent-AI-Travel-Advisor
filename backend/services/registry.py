"""
Service Registry — China-focused services only.
"""
import logging
from typing import Optional

from backend.services.meituan.mttravel_client import MeituanTravelClient

logger = logging.getLogger(__name__)


class ServiceRegistry:
    """Lazy singleton registry for all backend services."""

    _meituan: Optional[MeituanTravelClient] = None

    @classmethod
    def get_meituan(cls) -> MeituanTravelClient:
        if cls._meituan is None:
            cls._meituan = MeituanTravelClient()
            logger.info("ServiceRegistry: created MeituanTravelClient")
        return cls._meituan

    # Convenience properties
    @property
    def meituan(self) -> MeituanTravelClient:
        return self.get_meituan()

    @classmethod
    def reset(cls) -> None:
        cls._meituan = None
        logger.info("ServiceRegistry: reset all singletons")
