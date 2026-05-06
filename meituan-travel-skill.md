# 美团旅行助手 Skill — 集成说明

> 来源: 美团开放平台 AI Hub
> 版本: V1 (2026-04-15)
> Token 已配置在 ~/.config/meituan-travel/config.json

## 能力

| 场景 | 示例 |
|------|------|
| 🏨 酒店推荐 | "推荐北京三里屯附近的五星级酒店" |
| 🏔 景点门票 | "故宫门票多少钱" |
| 🚄 火车票 | "明天去武汉的火车票" |
| 🗺 行程规划 | "昆明大理丽江3日游" |
| ✈️ 机票查询 | "北京到上海的特价机票" |

## CLI 使用

```bash
npm i -g @meituan-travel/travel-cli
mttravel [城市] "<自然语言查询>"
```

## 集成方式

项目中的中国目的地查询会自动走美团快速通道（`MeituanTravelClient`），
国际目的地继续走原有的 Booking/Airbnb/Google 多服务线路。

详见: `backend/services/meituan/mttravel_client.py`
