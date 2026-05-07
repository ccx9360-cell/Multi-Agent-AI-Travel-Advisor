# 中国旅行助手 — 功能集成提案

> 目标：去除外国内容 + 集成12306B + 高德天气 + RAG知识库

---

## 总览

当前项目**已集成**14个国际API（Amadeus/Booking/Airbnb/Google Places/Viator/Yelp等），这些对中国境内旅行完全无用。清理后专注4个核心数据源：

```
┌─────────────────────────────────────────┐
│              核心数据层                    │
│                                           │
│  ┌────────┐ ┌──────┐ ┌──────┐ ┌────────┐ │
│  │ 高德地图 │ │ 美团  │ │12306B│ │RAG知识库│ │
│  │(POI+天气)│ │ (酒旅)│ │(火车)│ │(攻略)  │ │
│  └────────┘ └──────┘ └──────┘ └────────┘ │
│                                           │
└─────────────────────────────────────────┘
```

---

## Phase 1: 🧹 清理外国内容（15分钟）

### 改动文件
| 文件 | 操作 |
|------|------|
| `backend/config/settings.py` | 删除 Amadeus/Booking/Airbnb/Google Places/Viator/Yelp/ExchangeRate/RESTCountries 等配置 |
| `backend/services/` 相关文件 | 删除或禁用 fligths/accommodation/activities 等国际服务 |
| Agent 定义中的国外工具 | 从 agent 配置中移除国际搜索工具 |

### 保留的内容
- ✅ 高德地图（AMAP）— POI、路线、天气
- ✅ 美团酒旅（Meituan）— 酒店、景点、门票
- ✅ SerpApi — 保留用作通用搜索
- ✅ LLM — 不变
- ✅ Cache/Registry — 不变

---

## Phase 2: 🚄 集成12306B（30分钟）

### 架构

```
前端请求 → 后端 orchestrator → 12306B 微服务 (localhost:8001)
                                    ↓
                              12306B Flask API
                                    ↓
                              12306.cn (官方)
```

### 步骤
1. **克隆 huey1in/12306B** → 放到 `backend/services/12306/` 目录
2. **创建启动脚本** → 在端口 8001 运行 Flask 服务
3. **创建包装服务** → `backend/services/trains/train_service.py`
   - 查询车次：`GET http://localhost:8001/trains?from=北京&to=上海&date=2026-05-10`
   - 缓存查询结果（复用 `cache.py`）
4. **集成到 Orchestrator** → 当检测到"火车""高铁"关键词时调用

### 数据流
```
用户: "北京到上海的高铁"
  ↓
Orchestrator 解析 → 检测交通需求
  ↓
调用 train_service.query(from=北京, to=上海)
  ↓
12306B 返回车次列表 → LLM 整理 → 输出结果
```

---

## Phase 3: 🌤️ 高德地图天气（10分钟，零成本）

高德 API 已经有天气接口，不需要额外申请 Key。

```
高德天气 API: GET https://restapi.amap.com/v3/weather/weatherInfo
参数: key=AMAP_KEY&city=城市编码&extensions=all
返回: 实时天气 + 3天预报（温度/天气/风向/湿度）
```

### 改动
1. 新建 `backend/services/weather/amap_weather.py`
2. 替换原有 OpenWeather 引用
3. 在行程规划时自动获取目的地天气

---

## Phase 4: 📚 RAG 知识库（60分钟）

### 架构

```
                    ┌─────────────────┐
                    │  知识采集(Cron)  │ ← 定时更新（每日凌晨）
                    │ 马蜂窝/穷游/攻略 │
                    └────────┬────────┘
                             ↓ 结构化数据
                    ┌─────────────────┐
                    │  知识库文件       │
                    │  destinations/   │
                    │  food/           │
                    │  tips/           │
                    └────────┬────────┘
                             ↓ embedding
                    ┌─────────────────┐
                    │  ChromaDB/FAISS  │ ← 向量数据库
                    └────────┬────────┘
                             ↓ 检索
                    ┌─────────────────┐
                    │  查询服务 + 缓存  │ ← cache.py 缓存
                    └────────┬────────┘
                             ↓
                    Orchestrator 增强
```

### 数据内容（预置 + 自动更新）

**预置知识** — 覆盖中国30个热门旅游城市：
```
北京/上海/成都/广州/深圳/杭州/西安/重庆/厦门/丽江
大理/昆明/三亚/长沙/武汉/南京/苏州/桂林/青岛/哈尔滨
珠海/兰州/西宁/拉萨/敦煌/黄山/张家界/凤凰/九寨沟/香格里拉
```

每个城市包含：
- 🏛️ 必去景点 & 门票参考价
- 🍜 必吃美食 & 推荐餐厅
- 🚇 交通建议（高铁/飞机/市内）
- 🏨 住宿区域推荐
- 📅 最佳旅行季节 & 天数建议
- 💰 预算参考

### 技术选型

| 组件 | 选择 | 理由 |
|------|------|------|
| 向量库 | ChromaDB | 纯本地，无需额外服务，Python 原生 |
| 嵌入模型 | sentence-transformers `paraphrase-multilingual-MiniLM-L12-v2` | 中文支持好，轻量，本地运行 |
| 缓存 | 现有 `cache.py` | 复用，TTL 30分钟 |
| 定时更新 | cron job | 每日凌晨更新知识库 |

### 缓存策略
```
知识库查询缓存:
  - 同一问题 → 30秒内直接返回缓存
  - 相似问题（embedding余弦>0.95）→ 返回缓存
  - 缓存命中时异步刷新（stale-while-revalidate）

嵌入缓存:
  - 已嵌入的文本段 → 直接从 ChromaDB 读取
  - 新的文本段 → 实时嵌入并存储
```

### 自动更新机制
```
每日凌晨3:00 (cron):
  1. 检查知识库版本
  2. 从预设数据源拉取最新内容
  3. 重新嵌入新增内容
  4. 更新向量库索引
  5. 清理过期缓存
```

---

## 项目结构变化

```
backend/
├── services/
│   ├── trains/           # [新增] 12306火车查询
│   │   └── train_service.py
│   ├── weather/          # [新增] 高德天气
│   │   └── amap_weather.py
│   ├── knowledge/        # [新增] RAG知识库
│   │   ├── knowledge_service.py
│   │   ├── embedder.py
│   │   ├── data/         # 预置知识文件
│   │   │   ├── destinations/  # 城市景点知识
│   │   │   ├── food/          # 美食知识
│   │   │   └── tips/          # 通用旅行贴士
│   │   └── scraper/
│   └── ... 清理后的服务
├── config/
│   └── settings.py       # [修改] 精简配置
├── crew/
│   └── orchestrator.py   # [修改] 集成新服务
├── agents/               # [修改] 精简agent定义
```

---

## 执行计划

```
P0（马上）: 清理外国内容 + 集成高德天气
P0（马上）: 集成 12306B 火车票
P1（今天）: 构建 RAG 知识库骨架
P1（今天）: 预置30个城市知识
P1（今天）: 缓存 + 自动更新机制
P2（优化）: 知识库内容持续丰富
```

---

**总计估计：2~3小时**（含测试验证）

你觉得这个方案怎么样？同意了我开始逐一执行。
