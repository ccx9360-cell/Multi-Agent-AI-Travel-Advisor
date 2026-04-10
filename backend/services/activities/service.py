"""
Activity service — combines Google Places, Viator, and Yelp results.
Separates results into attractions, tours/experiences, and dining.
"""

import asyncio
import logging
from backend.services.activities.google_places import GooglePlacesClient
from backend.services.activities.viator import ViatorClient
from backend.services.activities.yelp import YelpClient
from backend.models.schemas import ActivitySearchResult

logger = logging.getLogger(__name__)


class ActivityService:

    def __init__(self):
        self.google_places = GooglePlacesClient()
        self.viator = ViatorClient()
        self.yelp = YelpClient()

    async def search(
        self,
        destination: str,
        interests: list[str],
    ) -> ActivitySearchResult:
        """Search all providers in parallel, categorize results."""
        logger.info(f"Searching activities in {destination} for interests: {interests}")

        result = ActivitySearchResult(
            destination=destination,
            interests=interests,
        )

        # Fetch from all three providers in parallel
        places_results, viator_results, yelp_results = await asyncio.gather(
            self.google_places.search_places(destination, interests),
            self.viator.search_experiences(destination, interests),
            self.yelp.search_businesses(destination, interests),
            return_exceptions=True,
        )

        if isinstance(places_results, list):
            result.attractions = places_results
            logger.info(f"Google Places returned {len(places_results)} attractions")
        elif isinstance(places_results, Exception):
            logger.error(f"Google Places failed: {places_results}")

        if isinstance(viator_results, list):
            result.tours = viator_results
            logger.info(f"Viator returned {len(viator_results)} tours")
        elif isinstance(viator_results, Exception):
            logger.error(f"Viator failed: {viator_results}")

        if isinstance(yelp_results, list):
            result.dining = yelp_results
            logger.info(f"Yelp returned {len(yelp_results)} dining options")
        elif isinstance(yelp_results, Exception):
            logger.error(f"Yelp failed: {yelp_results}")

        return result
