"""
知识库初始化与定时更新工具。

用法:
    python -m backend.services.knowledge.update_knowledge
    
    支持定时自动更新知识库（重新索引所有数据）。
"""
import logging
import sys
from datetime import datetime

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")
logger = logging.getLogger("knowledge-updater")


def rebuild_knowledge():
    """重建知识库索引。"""
    try:
        from backend.services.knowledge.rag_service import RAGService
        rag = RAGService()
        count = rag.reload()
        logger.info(f"✅ 知识库重建完成，共 {count} 条记录")
        return count
    except Exception as e:
        logger.error(f"❌ 知识库重建失败: {e}")
        return 0


def check_knowledge_status():
    """检查知识库状态。"""
    try:
        from backend.services.knowledge.rag_service import RAGService
        rag = RAGService()
        count = rag.count
        logger.info(f"📊 知识库状态: {count} 条记录")
        return count
    except Exception as e:
        logger.error(f"❌ 知识库检查失败: {e}")
        return 0


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--rebuild":
        rebuild_knowledge()
    elif len(sys.argv) > 1 and sys.argv[1] == "--status":
        check_knowledge_status()
    else:
        count = check_knowledge_status()
        if count == 0:
            logger.info("知识库为空，正在重建...")
            rebuild_knowledge()
