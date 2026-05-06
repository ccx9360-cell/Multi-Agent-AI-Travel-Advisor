"""
高德地图 API 客户端 — 替换 Google Maps Directions API
文档: https://lbs.amap.com/api/webservice/guide/api/direction
"""

import logging
from typing import List, Optional
from backend.services.base import BaseAPIClient
from backend.config.settings import settings
from backend.models.schemas import TransportRoute

logger = logging.getLogger(__name__)


class AmapMapsClient(BaseAPIClient):
    """高德地图路线规划客户端（替换原来的 GoogleMapsClient）"""

    def __init__(self):
        super().__init__(base_url="https://restapi.amap.com/v3")
        self.api_key = settings.amap_api_key

    async def get_directions(
        self,
        origin: str,
        destination: str,
        mode: str = "transit",
    ) -> List[TransportRoute]:
        """获取两地之间的路线规划。

        Args:
            mode: driving, transit, walking, bicycling
        """
        if not self.api_key:
            logger.warning("高德地图 API Key 未配置")
            return []

        # 先将城市名/地址转为经纬度坐标
        origin_coords = await self._geo_code(origin)
        dest_coords = await self._geo_code(destination)

        if not origin_coords or not dest_coords:
            logger.warning(f"高德地理编码失败: {origin} -> {destination}")
            return []

        endpoint_map = {
            "driving": "/direction/driving",
            "transit": "/direction/transit/integrated",
            "walking": "/direction/walking",
            "bicycling": "/direction/bicycling",
        }

        endpoint = endpoint_map.get(mode)
        if not endpoint:
            logger.warning(f"不支持的交通方式: {mode}")
            return []

        params: dict = {
            "key": self.api_key,
            "origin": origin_coords,
            "destination": dest_coords,
            "extensions": "all",
        }

        # 公交规划需要传入城市以优化结果
        if mode == "transit":
            params["city"] = origin
            params["cityd"] = destination
            # 策略：0=最快捷, 1=最经济, 2=最少换乘, 3=最少步行, 5=不乘地铁
            params["strategy"] = "0"

        logger.info(f"高德路线查询: {origin}({origin_coords}) -> {destination}({dest_coords}) mode={mode}")
        data = await self._get(endpoint, params=params)

        if not data or data.get("status") != "1":
            err_info = (data or {}).get("info", "无响应")
            logger.warning(f"高德路线规划失败: {err_info}")
            return []

        return self._parse_routes(data, origin, destination, mode)

    async def _geo_code(self, address: str) -> Optional[str]:
        """地理编码：地址/城市名 → 经纬度 'lng,lat'"""
        params = {
            "key": self.api_key,
            "address": address,
        }
        data = await self._get("/geocode/geo", params=params)
        if (
            data
            and data.get("status") == "1"
            and data.get("geocodes")
        ):
            location = data["geocodes"][0].get("location")
            if location:
                return location
        return None

    def _parse_routes(
        self, data: dict, origin: str, destination: str, mode: str
    ) -> List[TransportRoute]:
        """将高德 API 响应解析为统一的 TransportRoute 列表。"""
        results = []
        route = data.get("route", {})

        if mode == "transit":
            items = route.get("transits", [])
        else:
            items = route.get("paths", [])

        for item in items[:3]:
            try:
                distance_raw = item.get("distance", "0")  # 单位：米
                duration_raw = item.get("duration", "0")   # 单位：秒

                distance_km = round(int(distance_raw) / 1000, 1)
                duration_min = round(int(duration_raw) / 60, 0)
                dist_str = f"{distance_km} 公里"
                dur_str = f"{int(duration_min)} 分钟"

                steps: List[str] = []
                fare: Optional[str] = None

                if mode == "transit":
                    # 公交：由 segments 组成
                    segments = item.get("segments", [])
                    for seg in segments:
                        if "walking" in seg:
                            walk = seg["walking"]
                            dist = walk.get("distance", "0") if isinstance(walk, dict) else "0"
                            steps.append(f"步行 {dist} 米")
                        if "bus" in seg:
                            bus = seg["bus"]
                            if isinstance(bus, dict):
                                bus_name = bus.get("name", bus.get("bus_name", ""))
                                dep = bus.get("departure_stop", {}).get("name", "")
                                arr = bus.get("arrival_stop", {}).get("name", "")
                                if bus_name:
                                    steps.append(f"公交 {bus_name} ({dep} → {arr})")
                        if "metro" in seg:
                            metro = seg["metro"]
                            if isinstance(metro, dict):
                                m_name = metro.get("name", "地铁")
                                dep = metro.get("departure_stop", {}).get("name", "")
                                arr = metro.get("arrival_stop", {}).get("name", "")
                                steps.append(f"地铁 {m_name} ({dep} → {arr})")
                        if "railway" in seg:
                            rail = seg["railway"]
                            if isinstance(rail, dict):
                                steps.append(
                                    f"火车 {rail.get('departure_stop', {}).get('name', '')} "
                                    f"→ {rail.get('arrival_stop', {}).get('name', '')}"
                                )
                        if "taxi" in seg:
                            taxi = seg["taxi"]
                            if isinstance(taxi, dict):
                                steps.append(f"打车 {taxi.get('distance', '0')} 米")
                            else:
                                steps.append("打车")

                    cost = item.get("cost", {})
                    if isinstance(cost, dict) and cost.get("duration"):
                        fare = f"{cost['duration']} 元"

                else:
                    # 驾车/步行/骑行：由 steps 组成
                    for step in item.get("steps", [])[:10]:
                        instruction = step.get("instruction", "")
                        step_dist = step.get("distance", "0")
                        if instruction:
                            steps.append(f"{instruction} ({round(int(step_dist)/1000, 2)} 公里)"
                                        if int(step_dist) >= 1000
                                        else f"{instruction} ({step_dist} 米)")

                    tolls = item.get("tolls", "0")
                    if float(tolls) > 0:
                        fare = f"{tolls} 元"

                results.append(TransportRoute(
                    mode=mode,
                    origin=origin,
                    destination=destination,
                    distance=dist_str,
                    duration=dur_str,
                    steps=steps,
                    fare=fare,
                ))

            except (KeyError, ValueError, TypeError) as e:
                logger.warning(f"解析高德路线失败: {e}")
                continue

        return results
