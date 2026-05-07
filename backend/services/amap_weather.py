"""
高德地图天气查询服务 — 使用 AMAP API Key，零成本。
"""
import logging
from typing import Optional

import requests

from .cache import cached

logger = logging.getLogger(__name__)

# 高德天气 API
WEATHER_URL = "https://restapi.amap.com/v3/weather/weatherInfo"
GEOCODE_URL = "https://restapi.amap.com/v3/geocode/geo"

# AMAP API Key — lazy load to avoid circular import
_amap_key: Optional[str] = None


def _get_amap_key() -> str:
    """Lazy load AMAP API key from settings."""
    global _amap_key
    if _amap_key is None:
        from backend.config.settings import settings
        _amap_key = settings.amap_api_key
    return _amap_key


def _get_city_code(city_name: str) -> Optional[str]:
    """
    通过高德地理编码获取城市代码（adcode）。
    如果失败则返回城市名称本身（高德也支持城市名查询）。
    """
    key = _get_amap_key()
    if not key:
        return None
    try:
        resp = requests.get(GEOCODE_URL, params={
            "key": key,
            "address": city_name,
            "city": city_name,
        }, timeout=5)
        data = resp.json()
        if data.get("status") == "1" and data.get("geocodes"):
            return data["geocodes"][0].get("adcode", city_name)
    except Exception as e:
        logger.warning(f"获取城市编码失败: {e}")
    return city_name


@cached(ttl_seconds=300)  # 实时天气缓存5分钟
def _query_live_weather(city_code: str) -> dict:
    """查询实时天气。"""
    key = _get_amap_key()
    if not key:
        return {"error": "AMAP_API_KEY 未配置"}
    try:
        resp = requests.get(WEATHER_URL, params={
            "key": key,
            "city": city_code,
            "extensions": "base",
        }, timeout=10)
        data = resp.json()
        if data.get("status") == "1" and data.get("lives"):
            live = data["lives"][0]
            return {
                "city": live.get("city", ""),
                "temperature": live.get("temperature", ""),
                "weather": live.get("weather", ""),
                "wind_direction": live.get("winddirection", ""),
                "wind_power": live.get("windpower", ""),
                "humidity": live.get("humidity", ""),
                "report_time": live.get("reporttime", ""),
            }
        return {"error": data.get("info", "查询失败")}
    except requests.RequestException as e:
        return {"error": str(e)}


@cached(ttl_seconds=1800)  # 预报缓存30分钟
def _query_forecast(city_code: str) -> list:
    """查询未来4天天气预报。"""
    key = _get_amap_key()
    if not key:
        return []
    try:
        resp = requests.get(WEATHER_URL, params={
            "key": key,
            "city": city_code,
            "extensions": "all",
        }, timeout=10)
        data = resp.json()
        if data.get("status") == "1" and data.get("forecasts"):
            forecasts = data["forecasts"][0].get("casts", [])
            result = []
            for cast in forecasts:
                result.append({
                    "date": cast.get("date", ""),
                    "day_weather": cast.get("dayweather", ""),
                    "night_weather": cast.get("nightweather", ""),
                    "day_temp": cast.get("daytemp", ""),
                    "night_temp": cast.get("nighttemp", ""),
                    "day_wind": cast.get("daywind", ""),
                    "night_wind": cast.get("nightwind", ""),
                })
            return result
        return []
    except requests.RequestException as e:
        logger.warning(f"天气预报查询失败: {e}")
        return []


def amap_weather(city_name: str) -> dict:
    """
    查询城市天气。返回实时天气 + 4天预报。

    Args:
        city_name: 城市中文名，如"北京"、"上海"

    Returns:
        {
            "city": "北京",
            "live": {实时天气},
            "forecast": [{预报1}, {预报2}, ...]
        }
    """
    city_code = _get_city_code(city_name) or city_name

    live = _query_live_weather(city_code)
    forecast = _query_forecast(city_code)

    result = {
        "city": city_name,
        "live": live if "error" not in live else None,
        "forecast": forecast,
    }

    if "error" in live:
        logger.warning(f"天气查询失败 ({city_name}): {live['error']}")

    return result
