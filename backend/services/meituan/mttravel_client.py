"""
美团旅行 CLI 封装 — 调用 mttravel 获取酒店/景点/票务/行程信息
支持重试、降级、缓存。
"""

import asyncio
import logging
import os
from typing import Optional

from backend.services.cache import meituan_cache

logger = logging.getLogger(__name__)

# 中国城市判断
CHINESE_CITIES = {
    "北京", "上海", "广州", "深圳", "杭州", "成都", "武汉", "西安",
    "南京", "重庆", "天津", "苏州", "长沙", "郑州", "东莞", "青岛",
    "沈阳", "宁波", "昆明", "大连", "厦门", "合肥", "佛山", "福州",
    "哈尔滨", "济南", "温州", "长春", "石家庄", "常州", "泉州", "南宁",
    "贵阳", "南昌", "太原", "烟台", "嘉兴", "南通", "金华", "珠海",
    "惠州", "徐州", "海口", "乌鲁木齐", "绍兴", "中山", "台州", "兰州",
    "三亚", "桂林", "丽江", "大理", "张家界", "黄山", "洛阳", "拉萨",
    "呼和浩特", "银川", "西宁", "秦皇岛", "承德", "威海",
    "beijing", "shanghai", "guangzhou", "shenzhen", "chengdu",
    "hangzhou", "wuhan", "xian", "nanjing", "chongqing",
    "suzhou", "kunming", "xiamen", "qingdao", "dalian",
    "sanya", "guilin", "lijiang", "dali",
}

# 英文→中文城市名映射
CITY_NAME_MAP = {
    "beijing": "北京", "shanghai": "上海", "guangzhou": "广州",
    "shenzhen": "深圳", "chengdu": "成都", "hangzhou": "杭州",
    "wuhan": "武汉", "xian": "西安", "nanjing": "南京",
    "chongqing": "重庆", "suzhou": "苏州", "kunming": "昆明",
    "xiamen": "厦门", "qingdao": "青岛", "dalian": "大连",
    "sanya": "三亚", "guilin": "桂林", "lijiang": "丽江",
    "dali": "大理", "changsha": "长沙", "zhengzhou": "郑州",
    "harbin": "哈尔滨", "shenyang": "沈阳", "macau": "澳门",
    "hong kong": "香港", "taibei": "台北", "taipei": "台北",
}


def is_chinese_destination(city: str) -> bool:
    """判断目的地是否为中国国内城市"""
    if not city:
        return False
    city_lower = city.strip().lower()
    if city_lower in CHINESE_CITIES:
        return True
    if city_lower in ("香港", "hong kong", "澳门", "macau", "台北", "taipei", "taibei"):
        return True
    return False


def to_chinese_name(city: str) -> str:
    """将城市名转为中文（用于 mttravel 调用）"""
    city_stripped = city.strip()
    if any('\u4e00' <= c <= '\u9fff' for c in city_stripped):
        return city_stripped
    return CITY_NAME_MAP.get(city_stripped.lower(), city_stripped)


class MeituanTravelClient:
    """美团旅行 CLI 客户端 — 调用 mttravel 命令，支持重试+缓存"""

    def __init__(self):
        self._check_token()

    # ------------------------------------------------------------------
    # Token 管理
    # ------------------------------------------------------------------

    def _check_token(self):
        """检查 Token 配置文件是否存在"""
        config_path = os.path.expanduser("~/.config/meituan-travel/config.json")
        if not os.path.exists(config_path):
            raise RuntimeError(
                "美团 Token 未配置。请先创建 ~/.config/meituan-travel/config.json 并填入 key 字段"
            )

    def _cache_key(self, city: str, query: str) -> str:
        return f"meituan:{city}:{query[:80]}"

    # ------------------------------------------------------------------
    # 核心查询（带重试+缓存）
    # ------------------------------------------------------------------

    async def search(self, city: str, query: str, use_cache: bool = True) -> str:
        """
        调用 mttravel CLI 查询旅行信息，带自动重试和缓存。

        Args:
            city: 城市名（中文/英文均可）
            query: 自然语言查询
            use_cache: 是否启用缓存（默认开启）

        Returns:
            CLI 输出的完整文本

        Raises:
            RuntimeError: 所有重试均失败
        """
        chinese_city = to_chinese_name(city)
        cache_key = self._cache_key(chinese_city, query)

        # ── 缓存命中 ──
        if use_cache:
            cached = meituan_cache.get(cache_key)
            if cached is not None:
                logger.info(f"美团缓存命中: {chinese_city}")
                return cached

        logger.info(f"美团查询: {chinese_city} - {query[:60]}...")

        # ── 重试循环 ──
        last_error = None
        for attempt in range(3):
            try:
                result = await self._run_cli(chinese_city, query)

                # 缓存结果
                if use_cache:
                    meituan_cache.set(cache_key, result, ttl=600)

                logger.info(f"美团查询成功 ({attempt+1}/3), {len(result)} 字符")
                return result

            except (RuntimeError, asyncio.TimeoutError) as e:
                last_error = e
                logger.warning(f"美团查询第 {attempt+1} 次失败: {e}")
                if attempt < 2:
                    wait = 2 ** attempt
                    logger.info(f"等待 {wait}s 后重试...")
                    await asyncio.sleep(wait)

        raise RuntimeError(f"美团查询失败（重试3次后）: {last_error}")

    async def _run_cli(self, chinese_city: str, query: str) -> str:
        """执行 mttravel CLI 命令"""
        try:
            proc = await asyncio.create_subprocess_exec(
                "mttravel",
                chinese_city,
                query,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            try:
                stdout, stderr = await asyncio.wait_for(
                    proc.communicate(), timeout=120  # 从 180s 降到 120s
                )
            except asyncio.TimeoutError:
                proc.kill()
                raise asyncio.TimeoutError("美团查询超时（>120s）")

            if proc.returncode != 0:
                err = stderr.decode("utf-8", errors="ignore").strip()
                raise RuntimeError(f"mttravel 退出码 {proc.returncode}: {err[:200]}")

            result = stdout.decode("utf-8", errors="ignore").strip()
            if not result:
                raise RuntimeError("美团查询返回为空")

            return result

        except FileNotFoundError:
            raise RuntimeError("mttravel 命令未找到，请执行: npm i -g @meituan-travel/travel-cli")

    # ------------------------------------------------------------------
    # 快捷查询
    # ------------------------------------------------------------------

    async def search_hotels(self, city: str, query_hint: str = "") -> str:
        query = f"推荐{city}的{query_hint}酒店" if query_hint else f"推荐{city}的酒店"
        return await self.search(city, query)

    async def search_attractions(self, city: str, query_hint: str = "") -> str:
        query = f"{city}{query_hint}景点推荐和门票" if query_hint else f"{city}必去景点推荐"
        return await self.search(city, query)

    async def search_tickets(self, origin: str, destination: str) -> str:
        query = f"{origin}到{destination}的火车票和机票"
        return await self.search(origin, query)

    async def plan_trip(self, city: str, days: int = 0, interests: str = "") -> str:
        if days and interests:
            query = f"{city}{days}日游行程规划，{interests}"
        elif days:
            query = f"{city}{days}日游详细行程规划"
        else:
            query = f"{city}旅游行程攻略"
        return await self.search(city, query)
