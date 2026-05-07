"""
Task definitions for China-focused AI agents.
"""
from crewai import Task, Agent


def create_planning_task(agent: Agent, user_request: str) -> Task:
    return Task(
        description=(
            f"从用户需求中提取结构化旅行参数: {user_request}\n\n"
            f"输出格式（缺失信息填合理默认值）：\n"
            f"- Destinations: [城市列表]\n"
            f"- Origin: [出发城市]\n"
            f"- Duration: [N天]\n"
            f"- Dates: [出发日期] to [返回日期或空]\n"
            f"- Travelers: [人数]\n"
            f"- Budget: [luxury/mid-range/budget]\n"
            f"- Interests: [兴趣标签,逗号分隔]\n"
            f"- Special Requirements: [特殊要求]\n\n"
            f"只输出结构化信息。"
        ),
        expected_output=(
            "Structured breakdown: Destinations, Origin, Duration, "
            "Dates, Travelers, Budget, Interests, Special Requirements"
        ),
        agent=agent,
    )


def create_knowledge_task(agent: Agent, destination: str) -> Task:
    return Task(
        description=(
            f"提供以下目的地的中国旅行知识: {destination}\n"
            f"覆盖：必去景点、必吃美食、交通建议、\n"
            f"最佳旅行季节、住宿推荐区域、预算参考。"
        ),
        expected_output="旅行攻略：景点、美食、交通、季节、住宿、预算。",
        agent=agent,
    )


def create_compilation_task(
    agent: Agent,
    user_request: str,
    planning_output: str,
    meituan_data: str = "",
    train_data: str = "",
    weather_data: str = "",
    knowledge_output: str = "",
) -> Task:
    return Task(
        description=(
            f"基于下面的真实数据创建每日行程计划。\n"
            f"只使用提供的数据——不要编造。\n\n"
            f"## 用户需求\n{user_request}\n\n"
            f"## 行程规划\n{planning_output}\n\n"
            f"## 美团酒旅数据\n{meituan_data}\n\n"
            f"## 火车票信息\n{train_data}\n\n"
            f"## 天气预报\n{weather_data}\n\n"
            f"## 攻略知识\n{knowledge_output}\n\n"
            f"规则：\n"
            f"1. 按天输出，包含实用时间安排\n"
            f"2. 按区域分组活动，减少交通时间\n"
            f"3. 推荐美食和景点\n"
            f"4. 包括交通建议（高铁/地铁/公交/步行）\n"
            f"5. 根据天气给出穿衣建议\n"
            f"6. 最后给出总预算预估\n"
            f"7. 用中文输出，语气亲切有用\n"
            f"8. 如用户是学生党/带父母等特殊群体，给出针对性建议\n"
            f"9. 如有火车信息，推荐最佳车次"
        ),
        expected_output=(
            "完整行程：行程概览、每日计划、美食推荐、交通建议、"
            "实用贴士、预算总结。"
        ),
        agent=agent,
    )
