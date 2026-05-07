"""
SQLite 持久化存储 — 行程记录保存与快速检索。
替代原有的内存 itinerary_store。
"""
import json
import sqlite3
import logging
import os
import uuid
import threading
from datetime import datetime, date
from typing import Optional, List, Dict

logger = logging.getLogger(__name__)

DB_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data")
DB_PATH = os.path.join(DB_DIR, "itineraries.db")
os.makedirs(DB_DIR, exist_ok=True)

_local = threading.local()


def _get_conn() -> sqlite3.Connection:
    """获取线程安全的数据库连接。"""
    if not hasattr(_local, "conn") or _local.conn is None:
        _local.conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        _local.conn.row_factory = sqlite3.Row
        _local.conn.execute("PRAGMA journal_mode=WAL")
        _local.conn.execute("PRAGMA busy_timeout=5000")
    return _local.conn


def init_db():
    """初始化数据库表结构。"""
    conn = _get_conn()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS itineraries (
            id          TEXT PRIMARY KEY,
            request     TEXT NOT NULL,
            scenario    TEXT DEFAULT 'free',
            itinerary   TEXT DEFAULT '',
            created_at  TEXT NOT NULL,
            status      TEXT DEFAULT 'processing',
            city        TEXT DEFAULT '',
            travelers   INTEGER DEFAULT 0,
            days        INTEGER DEFAULT 0,
            budget      TEXT DEFAULT ''
        );
        CREATE INDEX IF NOT EXISTS idx_itineraries_created
            ON itineraries(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_itineraries_city
            ON itineraries(city);
        CREATE INDEX IF NOT EXISTS idx_itineraries_status
            ON itineraries(status);

        CREATE TABLE IF NOT EXISTS knowledge_chat (
            id          TEXT PRIMARY KEY,
            question    TEXT NOT NULL,
            answer      TEXT NOT NULL,
            created_at  TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_knowledge_chat_created
            ON knowledge_chat(created_at DESC);
    """)
    conn.commit()
    logger.info(f"数据库就绪: {DB_PATH}")


# ── 行程 CRUD ──────────────────────────────────────────────


def save_itinerary(
    request: str,
    scenario: str = "free",
    itinerary: str = "",
    status: str = "processing",
    itinerary_id: Optional[str] = None,
    city: str = "",
    travelers: int = 0,
    days: int = 0,
    budget: str = "",
) -> str:
    """保存或更新行程记录。返回行程ID。"""
    conn = _get_conn()
    item_id = itinerary_id or uuid.uuid4().hex[:12]
    now = datetime.now().isoformat()

    conn.execute(
        """INSERT OR REPLACE INTO itineraries
           (id, request, scenario, itinerary, created_at, status, city, travelers, days, budget)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (item_id, request, scenario, itinerary, now, status, city, travelers, days, budget),
    )
    conn.commit()
    return item_id


def update_itinerary(itinerary_id: str, itinerary: str, status: str = "completed"):
    """更新行程结果。"""
    conn = _get_conn()
    conn.execute(
        "UPDATE itineraries SET itinerary = ?, status = ? WHERE id = ?",
        (itinerary, status, itinerary_id),
    )
    conn.commit()


def get_itinerary(itinerary_id: str) -> Optional[dict]:
    """获取单条行程。"""
    conn = _get_conn()
    row = conn.execute("SELECT * FROM itineraries WHERE id = ?", (itinerary_id,)).fetchone()
    if row:
        return dict(row)
    return None


def list_itineraries(limit: int = 50, offset: int = 0) -> List[dict]:
    """列出所有行程，按时间倒序。"""
    conn = _get_conn()
    rows = conn.execute(
        "SELECT * FROM itineraries ORDER BY created_at DESC LIMIT ? OFFSET ?",
        (limit, offset),
    ).fetchall()
    return [dict(r) for r in rows]


def search_itineraries(query: str, limit: int = 20) -> List[dict]:
    """全文搜索行程（按城市/请求内容）。"""
    conn = _get_conn()
    term = f"%{query}%"
    rows = conn.execute(
        """SELECT * FROM itineraries
           WHERE request LIKE ? OR city LIKE ? OR itinerary LIKE ?
           ORDER BY created_at DESC LIMIT ?""",
        (term, term, term, limit),
    ).fetchall()
    return [dict(r) for r in rows]


def delete_itinerary(itinerary_id: str) -> bool:
    """删除行程。"""
    conn = _get_conn()
    cur = conn.execute("DELETE FROM itineraries WHERE id = ?", (itinerary_id,))
    conn.commit()
    return cur.rowcount > 0


def get_stats() -> dict:
    """获取行程统计信息。"""
    conn = _get_conn()
    total = conn.execute("SELECT COUNT(*) FROM itineraries").fetchone()[0]
    cities_row = conn.execute(
        "SELECT city, COUNT(*) as cnt FROM itineraries WHERE city != '' GROUP BY city ORDER BY cnt DESC LIMIT 10"
    ).fetchall()
    recent = conn.execute(
        "SELECT created_at FROM itineraries ORDER BY created_at DESC LIMIT 1"
    ).fetchone()
    return {
        "total": total,
        "top_cities": [{"city": r[0], "count": r[1]} for r in cities_row],
        "last_activity": recent[0] if recent else None,
    }


# ── 知识库聊天历史 ─────────────────────────────────────


def save_knowledge_chat(question: str, answer: str) -> str:
    """保存知识库聊天记录。"""
    conn = _get_conn()
    chat_id = uuid.uuid4().hex[:12]
    conn.execute(
        "INSERT INTO knowledge_chat (id, question, answer, created_at) VALUES (?, ?, ?, ?)",
        (chat_id, question, answer, datetime.now().isoformat()),
    )
    conn.commit()
    return chat_id


def list_knowledge_chats(limit: int = 50) -> List[dict]:
    """列出知识库聊天记录。"""
    conn = _get_conn()
    rows = conn.execute(
        "SELECT * FROM knowledge_chat ORDER BY created_at DESC LIMIT ?", (limit,)
    ).fetchall()
    return [dict(r) for r in rows]


# ── 快捷函数 ────────────────────────────────────────────


def get_top_cities(limit: int = 5) -> List[str]:
    """获取最常查询的城市。"""
    conn = _get_conn()
    rows = conn.execute(
        "SELECT city, COUNT(*) as cnt FROM itineraries WHERE city != '' GROUP BY city ORDER BY cnt DESC LIMIT ?",
        (limit,),
    ).fetchall()
    return [r[0] for r in rows]


def generate_sample_data():
    """生成几条示例数据（仅在首次启动时）。"""
    conn = _get_conn()
    count = conn.execute("SELECT COUNT(*) FROM itineraries").fetchone()[0]
    if count > 0:
        return

    samples = [
        ("北京三日经典游，故宫、长城、天坛", "itinerary", "**Day 1: 天安门→故宫→景山公园**\n上午逛天安门广场（免费，需预约），9点进入故宫（门票60元），建议租讲解器。下午登景山看故宫全景。\n\n**Day 2: 八达岭长城**\n德胜门坐877路直达（12元/人），建议早7点出发避开人流。\n\n**Day 3: 天坛→颐和园**\n天坛联票34元，上午逛完。下午颐和园（30元），傍晚看十七孔桥日落。", "北京", 2, 3, "经济型"),
        ("成都重庆双城六日游，尽享美食", "itinerary", "**Day 1-3: 成都**\n宽窄巷子、锦里、大熊猫基地（55元）、都江堰。美食：火锅、串串、钵钵鸡。\n\n**Day 4-6: 重庆**\n洪崖洞（免费）、解放碑、磁器口、长江索道（20元）。美食：小面、酸辣粉、烤鱼。\n\n交通：成都→重庆高铁（1.5h，154元）", "成都", 2, 6, "舒适型"),
        ("广州周末美食之旅", "food", "**广州必吃美食：**\n1. 点都德 — 虾饺、红米肠\n2. 陈添记鱼皮 — 爽脆鱼皮\n3. 银记肠粉 — 鲜虾肠粉\n4. 南信双皮奶 — 甜品\n5. 炳胜 — 粤菜正餐\n\n推荐路线：上下九→北京路→沙面，一路吃过去～", "广州", 2, 2, "经济型"),
    ]

    for request, scenario, itinerary, city, travelers, days, budget in samples:
        save_itinerary(
            request=request,
            scenario=scenario,
            itinerary=itinerary,
            status="completed",
            city=city,
            travelers=travelers,
            days=days,
            budget=budget,
        )
    logger.info(f"已生成 {len(samples)} 条示例行程数据")
