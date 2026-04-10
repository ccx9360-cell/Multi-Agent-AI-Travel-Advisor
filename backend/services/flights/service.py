"""
Flight service — uses Amadeus as primary, SerpApi as fallback.
"""

import logging
from typing import Optional
from backend.services.flights.amadeus import AmadeusClient
from backend.services.flights.serpapi import SerpApiFlightsClient
from backend.models.schemas import FlightSearchResult

logger = logging.getLogger(__name__)


class FlightService:

    def __init__(self):
        self.amadeus = AmadeusClient()
        self.serpapi = SerpApiFlightsClient()

    async def search(
        self,
        origin: str,
        destination: str,
        departure_date: str,
        return_date: Optional[str] = None,
        travelers: int = 1,
        cabin_class: str = "economy",
    ) -> FlightSearchResult:
        """Search flights — tries Amadeus first, falls back to SerpApi."""

        result = FlightSearchResult(
            origin=origin,
            destination=destination,
            departure_date=departure_date,
            return_date=return_date,
            travelers=travelers,
            cabin_class=cabin_class,
        )

        # Try Amadeus (primary)
        logger.info(f"Searching flights via Amadeus: {origin} -> {destination}")
        options = await self.amadeus.search_flights(
            origin=origin,
            destination=destination,
            departure_date=departure_date,
            return_date=return_date,
            travelers=travelers,
            cabin_class=cabin_class,
        )

        if options:
            result.options = options
            result.source = "amadeus"
            logger.info(f"Amadeus returned {len(options)} flight options")
            return result

        # Fallback to SerpApi
        logger.info("Amadeus returned no results, falling back to SerpApi")
        options = await self.serpapi.search_flights(
            origin=origin,
            destination=destination,
            departure_date=departure_date,
            return_date=return_date,
            travelers=travelers,
            cabin_class=cabin_class,
        )

        if options:
            result.options = options
            result.source = "serpapi"
            logger.info(f"SerpApi returned {len(options)} flight options")
        else:
            logger.warning(f"No flight results from any provider for {origin} -> {destination}")

        return result
