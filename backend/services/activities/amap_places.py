"""
高德地图 POI 搜索客户端 — 替换 Google Places / Yelp
文档: https://lbs.amap.com/api/webservice/guide/api/search
"""

import logging
from typing import List, Optional
from backend.services.base import BaseAPIClient
from backend.config.settings import settings
from backend.models.schemas import ActivityOption

logger = logging.getLogger(__name__)

# 高德 POI 类型编码
AMAP_TYPES = {
    "attraction": "060000|110000",      # 风景名胜|旅游设施
    "scenic_spot": "060100|060200",     # 公园广场|风景名胜
    "museum": "140100",                  # 博物馆
    "restaurant": "050000",              # 餐饮服务
    "shopping": "060000",                # 购物服务
    "entertainment": "070000",           # 休闲娱乐
}

CATEGORY_MAP = {
    "attraction": "景点",
    "scenic_spot": "自然风光",
    "museum": "文化场馆",
    "restaurant": "餐厅",
    "shopping": "购物",
    "entertainment": "娱乐",
}


class AmapPlacesClient(BaseAPIClient):
    """高德地图 POI 搜索客户端（替换 Google Places + Yelp）"""

    def __init__(self):
        super().__init__(base_url="https://restapi.amap.com/v3")
        self.api_key = settings.amap_api_key

    async def search_attractions(
        self, city: str, keywords: str = "", limit: int = 10
    ) -> List[ActivityOption]:
        """搜索景点/博物馆等"""
        types_str = f"{AMAP_TYPES['attraction']}|{AMAP_TYPES['museum']}"
        return await self._search_poi(
            city=city,
            types=types_str,
            keywords=keywords,
            limit=limit,
            default_category="景点",
        )

    async def search_restaurants(
        self, city: str, keywords: str = "", limit: int = 10
    ) -> List[ActivityOption]:
        """搜索餐厅"""
        return await self._search_poi(
            city=city,
            types=AMAP_TYPES["restaurant"],
            keywords=keywords,
            limit=limit,
            default_category="餐厅",
        )

    async def search_all(
        self, city: str, attr_keywords: str = "", food_keywords: str = "", limit: int = 8
    ) -> dict:
        """同时搜索景点和餐厅，返回分类结果

        Args:
            attr_keywords: 景点搜索关键词（如"历史 文化"）
            food_keywords: 餐厅搜索关键词（如"美食"）
        """
        import asyncio

        attractions, restaurants = await asyncio.gather(
            self.search_attractions(city, attr_keywords, limit),
            self.search_restaurants(city, food_keywords, limit),
        )
        return {
            "attractions": attractions,
            "restaurants": restaurants,
        }

    async def _search_poi(
        self,
        city: str,
        types: str,
        keywords: str = "",
        limit: int = 10,
        default_category: str = "",
    ) -> List[ActivityOption]:
        """高德 POI 关键字搜索"""
        if not self.api_key:
            logger.warning("高德 API Key 未配置，无法搜索 POI")
            return []

        params = {
            "key": self.api_key,
            "types": types,
            "city": city,
            "offset": min(limit, 25),
            "page": 1,
            "extensions": "all",
        }
        if keywords:
            params["keywords"] = keywords

        logger.info(f"高德POI搜索: city={city}, types={types}, keywords={keywords}")
        data = await self._get("/place/text", params=params)

        if not data or data.get("status") != "1" or not data.get("pois"):
            logger.warning(f"高德POI搜索无结果: {city}")
            return []

        return self._parse_pois(data["pois"], default_category)

    def _parse_pois(
        self, pois: list, default_category: str = ""
    ) -> List[ActivityOption]:
        """将高德 POI 结果解析为 ActivityOption"""
        results = []
        for poi in pois[:20]:
            try:
                name = poi.get("name", "")
                if not name:
                    continue

                # 类型
                poi_type = poi.get("type", "").split(";")
                category = poi_type[1] if len(poi_type) > 1 else (
                    poi_type[0] if poi_type else default_category
                )

                # 评分
                biz_ext = poi.get("biz_ext", {}) or {}
                rating_str = biz_ext.get("rating", "")
                try:
                    rating = float(rating_str) if rating_str else 4.0
                except (ValueError, TypeError):
                    rating = 4.0

                # 评价数（高德不直接提供，用 count 估算）
                review_count = 0

                # 价格（高德不直接提供餐饮人均价）
                price = None

                # 图片
                photos = poi.get("photos", [])
                image_url = photos[0].get("url") if photos else None

                # 营业时间
                opening_hours = biz_ext.get("opentime2") or biz_ext.get("open_time") or ""

                results.append(ActivityOption(
                    provider="amap",
                    name=name,
                    category=category,
                    description=poi.get("address", ""),
                    rating=rating,
                    review_count=review_count,
                    price=price,
                    address=poi.get("address", ""),
                    image_url=image_url,
                    opening_hours=opening_hours.strip() if opening_hours else None,
                ))
            except (KeyError, ValueError, TypeError) as e:
                logger.warning(f"解析高德POI失败: {e}")
                continue

        return results
