"""
Activity service — combines Google Places, Viator, and Yelp results.
Separates results into attractions, tours/experiences, and dining.
"""

import asyncio
import logging
from backend.services.activities.google_places import GooglePlacesClient
from backend.services.activities.viator import ViatorClient
from backend.services.activities.yelp import YelpClient
from backend.services.activities.amap_places import AmapPlacesClient
from backend.models.schemas import ActivitySearchResult
from typing import List

logger = logging.getLogger(__name__)


class ActivityService:

    def __init__(self):
        self.google_places = GooglePlacesClient()
        self.viator = ViatorClient()
        self.yelp = YelpClient()
        self.amap = AmapPlacesClient()

    async def search(
        self,
        destination: str,
        interests: List[str],
    ) -> ActivitySearchResult:
        """Search all providers in parallel, categorize results."""
        logger.info(f"Searching activities in {destination} for interests: {interests}")

        result = ActivitySearchResult(
            destination=destination,
            interests=interests,
        )

        # Fetch from all providers in parallel
        # 高德：景点搜"必去景点"，餐厅搜美食关键词
        food_keywords = [k for k in interests if k in ("美食", "food", "dining", "restaurant")]
        attr_keywords = [k for k in interests if k in ("历史", "文化", "自然", "景点", "history", "culture", "nature")]
        food_hint = " ".join(food_keywords[:2]) if food_keywords else ""
        attr_hint = " ".join(attr_keywords[:2]) if attr_keywords else ""
        amap_task = self.amap.search_all(destination, attr_hint, food_hint)

        places_results, viator_results, yelp_results, amap_results = await asyncio.gather(
            self.google_places.search_places(destination, interests),
            self.viator.search_experiences(destination, interests),
            self.yelp.search_businesses(destination, interests),
            amap_task,
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

        # 高德 POI 结果：景点追加到 attractions，餐厅追加到 dining
        if isinstance(amap_results, dict):
            amap_attractions = amap_results.get("attractions", [])
            amap_restaurants = amap_results.get("restaurants", [])
            if amap_attractions:
                result.attractions.extend(amap_attractions)
                logger.info(f"高德POI追加 {len(amap_attractions)} 个景点")
            if amap_restaurants:
                result.dining.extend(amap_restaurants)
                logger.info(f"高德POI追加 {len(amap_restaurants)} 个餐厅")
        elif isinstance(amap_results, Exception):
            logger.error(f"高德POI failed: {amap_results}")

        return result
