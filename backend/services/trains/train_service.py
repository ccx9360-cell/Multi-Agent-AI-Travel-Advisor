"""
12306 火车票查询服务 — 直接调用 12306 公开查询接口。

不需要登录。查询车次、余票、票价。结果会经过缓存。
"""
import json
import logging
import re
import time
from typing import Optional

import requests

from ..cache import cached

logger = logging.getLogger(__name__)

# ── 12306 站点代码映射 ──────────────────────────────────────────
# 常用中国火车站代码（12306官方编码）
STATION_CODES = {
    "北京": "BJP", "北京南": "VNP", "北京西": "BXP", "北京北": "VAP", "北京丰台": "FTB",
    "上海": "SHH", "上海虹桥": "AOH", "上海南": "SNH", "上海西": "SXH",
    "广州": "GZQ", "广州南": "IZQ", "广州东": "GGQ", "广州北": "GBQ",
    "深圳": "SZQ", "深圳北": "IOQ", "深圳东": "BJQ", "福田": "FZQ",
    "杭州": "HZH", "杭州东": "HGH", "杭州南": "XHH", "杭州西": "EUH",
    "成都": "CDW", "成都东": "ICW", "成都南": "CNW", "成都西": "CMW",
    "武汉": "WHN", "武汉东": "LFN", "汉口": "HKN", "武昌": "WCN",
    "西安": "XAY", "西安北": "EAY",
    "南京": "NJH", "南京南": "NKH",
    "重庆": "CQW", "重庆北": "CUW", "重庆西": "CYW", "重庆南": "CRW",
    "苏州": "SZH", "苏州北": "OHH",
    "昆明": "KMM", "昆明南": "KOM",
    "厦门": "XKS", "厦门北": "XBS",
    "青岛": "QDK", "青岛北": "QHK",
    "大连": "DLT", "大连北": "DFT",
    "三亚": "SEQ", "三亚西": "SYW",
    "桂林": "GLZ", "桂林北": "GBZ", "桂林西": "GIZ",
    "丽江": "LHM",
    "长沙": "CSQ", "长沙南": "CWQ",
    "哈尔滨": "HBB", "哈尔滨西": "VAB", "哈尔滨北": "VBB",
    "南昌": "NCG", "南昌西": "NXG",
    "贵阳": "GIW", "贵阳北": "KQW", "贵阳东": "GDW",
    "兰州": "LZJ", "兰州西": "LAJ",
    "西宁": "NNO",
    "拉萨": "LSO",
    "郑州": "ZZF", "郑州东": "ZAF", "郑州西": "ZXF",
    "济南": "JNK", "济南西": "JGK", "济南东": "MDK",
    "天津": "TJP", "天津西": "TXP", "天津南": "TIP",
    "合肥": "HFH", "合肥南": "ENH",
    "福州": "FZS", "福州南": "FYS",
    "南宁": "NNZ", "南宁东": "NFZ",
    "石家庄": "SJP", "石家庄东": "SXP",
    "太原": "TYV", "太原南": "TNV",
    "沈阳": "SYT", "沈阳北": "SBT", "沈阳南": "SOT",
    "长春": "CCT", "长春西": "CRT",
    "呼和浩特": "HHC", "呼和浩特东": "NDC",
    "乌鲁木齐": "WAR", "乌鲁木齐南": "WMR",
    "香港西九龙": "XJA",
    "珠海": "ZYQ", "珠海北": "ZQZ",
    "东莞": "RTQ", "东莞南": "DOQ", "东莞东": "DMQ",
    "佛山": "FSQ", "佛山西": "FQQ",
    "惠州": "HCQ", "惠州南": "KNQ", "惠州北": "KEQ",
    "中山": "ZSQ", "中山北": "ZPQ", "中山南": "AGQ",
    "汕头": "OTK", "汕头南": "SOH",
    "湛江": "ZJZ", "湛江西": "ZWQ",
    "张家界": "DIQ", "张家界西": "JQH",
    "黄山": "HKH", "黄山北": "BZH",
    "敦煌": "DHJ",
    "大理": "DKX",
    "遵义": "ZYE", "遵义南": "ZNP", "遵义西": "ZWE",
    "桂林北": "GBZ",
    "凤凰古城": "FJD",
    "九寨沟": "JZG",  # 黄龙九寨站
    "香格里拉": "VKL",
}

# 反向索引：代码 → 中文名
CODE_TO_NAME = {v: k for k, v in STATION_CODES.items()}

# ── 列车类型前缀 ──
TRAIN_TYPES = {
    "G": "高铁", "D": "动车", "C": "城际", "K": "快速",
    "T": "特快", "Z": "直达", "L": "临客", "Y": "旅游专列",
}

# 12306 查询 API
QUERY_URL = "https://kyfw.12306.cn/otn/leftTicket/queryG"
# 备用 API
QUERY_URL_V2 = "https://kyfw.12306.cn/otn/leftTicket/query"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "Accept": "application/json",
    "Cookie": "_jc_save_fromStation=%u5317%u4EAC%2CBJP; _jc_save_toStation=%u4E0A%u6D77%2CSHH; _jc_save_fromDate=2026-05-10; _jc_save_toDate=2026-05-10; BIGipServerotn=; route=6c50acb6f0f313975a25c1bc9fb0d7cb",
}


def _get_station_code(name: str) -> Optional[str]:
    """获取 12306 站点代码。支持模糊匹配。"""
    # 精确匹配
    if name in STATION_CODES:
        return STATION_CODES[name]
    # 尝试去掉"市""站"后缀
    clean = name.replace("市", "").replace("站", "")
    if clean in STATION_CODES:
        return STATION_CODES[clean]
    # 尝试前缀匹配
    for station, code in STATION_CODES.items():
        if station.startswith(clean) or clean.startswith(station):
            return code
    return None


def _parse_ticket_info(ticket_str: str) -> dict:
    """
    解析 12306 返回的票务字符串。
    参考格式:
    预订|240000G1010G|G1010|BJP|AOH|BJP|AOH|...
    """
    fields = ticket_str.split("|")
    if len(fields) < 15:
        return {}

    result = {
        "train_number": fields[3] if len(fields) > 3 else "",
        "from_station_code": fields[4] if len(fields) > 4 else "",
        "to_station_code": fields[5] if len(fields) > 5 else "",
        "from_station": fields[6] if len(fields) > 6 else "",
        "to_station": fields[7] if len(fields) > 7 else "",
        "departure_time": fields[8] if len(fields) > 8 else "",
        "arrival_time": fields[9] if len(fields) > 9 else "",
        "duration": fields[10] if len(fields) > 10 else "",
    }

    # Parse train type
    tn = result["train_number"]
    if tn:
        prefix = tn[0]
        result["train_type"] = TRAIN_TYPES.get(prefix, f"{prefix}字头")
    else:
        result["train_type"] = ""

    # Parse seat types and remaining tickets
    seat_types = []
    # 12306 fields after index 13 are seat types
    seat_fields = [
        ("商务座", 32), ("特等座", 31), ("一等座", 30), ("二等座", 29),
        ("高级软卧", 21), ("软卧", 23), ("硬卧", 28), ("软座", 27),
        ("硬座", 26), ("无座", 25), ("动卧", 33),
    ]
    for seat_name, idx in seat_fields:
        if idx < len(fields) and fields[idx]:
            val = fields[idx]
            if val and val != "*" and val != "无":
                try:
                    remaining = int(val)
                    seat_types.append({"name": seat_name, "remaining": remaining, "has_tickets": remaining > 0})
                except ValueError:
                    if val == "有":
                        seat_types.append({"name": seat_name, "remaining": -1, "has_tickets": True})

    result["seat_types"] = seat_types
    result["has_available_tickets"] = any(s["has_tickets"] for s in seat_types)

    return result


def _get_station_name(code_or_name: str) -> str:
    """将站点代码转为中文名。"""
    if code_or_name in CODE_TO_NAME:
        return CODE_TO_NAME[code_or_name]
    return code_or_name


@cached(ttl_seconds=300)  # 缓存5分钟
def query_trains(from_station: str, to_station: str, date: str) -> dict:
    """
    查询火车票。

    Args:
        from_station: 出发站（中文名）
        to_station: 到达站（中文名）
        date: 日期（YYYY-MM-DD）

    Returns:
        {
            "from": "北京",
            "to": "上海",
            "date": "2026-05-10",
            "trains": [
                {
                    "train_number": "G101",
                    "train_type": "高铁",
                    "from_station": "北京南",
                    "to_station": "上海虹桥",
                    "departure_time": "07:00",
                    "arrival_time": "12:00",
                    "duration": "5h00m",
                    "seat_types": [
                        {"name": "二等座", "remaining": 500, "has_tickets": True},
                        {"name": "一等座", "remaining": 100, "has_tickets": True},
                    ],
                    "has_available_tickets": True
                }
            ]
        }
    """
    from_code = _get_station_code(from_station)
    to_code = _get_station_code(to_station)

    if not from_code:
        return {"error": f"无法识别出发站: {from_station}", "trains": []}
    if not to_code:
        return {"error": f"无法识别到达站: {to_station}", "trains": []}

    params = {
        "leftTicketDTO.train_date": date,
        "leftTicketDTO.from_station": from_code,
        "leftTicketDTO.to_station": to_code,
        "purpose_codes": "ADULT",
    }

    try:
        resp = requests.get(QUERY_URL, params=params, headers=HEADERS, timeout=15)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("status") and data.get("data"):
                trains_raw = data["data"].get("result", [])
                # Also get station name mapping
                station_map = data["data"].get("map", {})
                trains = []
                for ticket_str in trains_raw:
                    parsed = _parse_ticket_info(ticket_str)
                    if parsed.get("train_number"):
                        trains.append(parsed)

                return {
                    "from": from_station,
                    "to": to_station,
                    "date": date,
                    "trains": trains,
                    "total": len(trains),
                }
        # 尝试备用 API
        resp2 = requests.get(QUERY_URL_V2, params=params, headers=HEADERS, timeout=15)
        if resp2.status_code == 200:
            data = resp2.json()
            if data.get("status") and data.get("data"):
                trains_raw = data["data"].get("result", [])
                trains = []
                for ticket_str in trains_raw:
                    parsed = _parse_ticket_info(ticket_str)
                    if parsed.get("train_number"):
                        trains.append(parsed)
                return {
                    "from": from_station,
                    "to": to_station,
                    "date": date,
                    "trains": trains,
                    "total": len(trains),
                }

        return {"error": "12306 查询失败", "trains": []}
    except requests.RequestException as e:
        logger.error(f"12306 请求失败: {e}")
        return {"error": f"网络错误: {e}", "trains": []}


def get_popular_routes(city: str) -> list:
    """获取从某城市出发的热门路线推荐。"""
    popular = {
        "北京": [("北京", "上海"), ("北京", "广州"), ("北京", "杭州"), ("北京", "成都"), ("北京", "西安")],
        "上海": [("上海", "北京"), ("上海", "杭州"), ("上海", "南京"), ("上海", "广州"), ("上海", "苏州")],
        "广州": [("广州", "深圳"), ("广州", "长沙"), ("广州", "武汉"), ("广州", "北京"), ("广州", "桂林")],
        "成都": [("成都", "重庆"), ("成都", "西安"), ("成都", "昆明"), ("成都", "贵阳"), ("成都", "北京")],
        "杭州": [("杭州", "上海"), ("杭州", "南京"), ("杭州", "北京"), ("杭州", "苏州"), ("杭州", "黄山")],
        "西安": [("西安", "北京"), ("西安", "成都"), ("西安", "上海"), ("西安", "兰州"), ("西安", "郑州")],
        "武汉": [("武汉", "长沙"), ("武汉", "广州"), ("武汉", "北京"), ("武汉", "上海"), ("武汉", "成都")],
        "深圳": [("深圳", "广州"), ("深圳", "北京"), ("深圳", "上海"), ("深圳", "武汉"), ("深圳", "长沙")],
        "南京": [("南京", "上海"), ("南京", "北京"), ("南京", "杭州"), ("南京", "苏州"), ("南京", "武汉")],
        "重庆": [("重庆", "成都"), ("重庆", "西安"), ("重庆", "北京"), ("重庆", "广州"), ("重庆", "武汉")],
    }
    return popular.get(city, [])
