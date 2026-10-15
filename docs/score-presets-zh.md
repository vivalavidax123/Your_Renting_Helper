# 评分优先级预设（PR #7）开发日志

## 1. 需求

原来所有人共用一套固定权重（交通 28、超市 22、医疗 15……）。但学生、家庭、通勤族看重的东西不一样，同一个地址对他们的"好坏"也不一样。目标是让用户选一个预设，总分按他的优先级重新计算。

## 2. 关键设计决定

| 决定                                                      | 理由                                                                                | 代价               |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------ |
| 做 4 个固定预设，不做自由滑块                             | 预设可以用固定数字写测试；滑块要处理权重合计不等于 100 的情况，界面和测试都复杂得多 | 用户不能精确微调   |
| 预设只改"每类占多少"，不改类别自己的分数                  | 和"有车/无车"（管距离敏感度）互相独立，2 × 4 种组合不用写 8 套配置                  | 无                 |
| 预设放在 URL（`?preset=`），不存账号                      | 和现有 `?profile=` 同一套机制；未登录也能用；不改数据库；链接可复现                 | 新打开网站要重新选 |
| Balanced 不写进链接                                       | 旧链接保持原样                                                                      | 无                 |
| 浏览器遇到未知预设退回 Balanced；API 遇到未知预设返回 400 | 页面不会因为坏链接整页不可用；API 对调用方要严格                                    | 写错的链接没有提示 |

## 3. 数据流

```
URL ?profile=carFree&preset=family
  └─ ExploreProvider.tsx          读取并校验 preset，提供 changePreset 和 scoringParams
       ├─ useLocationSearch.ts    浏览器里用 scorePlaceGroups(groups, profile, preset) 现算
       ├─ 各页面链接               用 scoringParams 保住当前选择
       ├─ ComparePanel.tsx  ──>  GET /api/compare?preset=…        ─> searchStore.getComparisonSide
       └─ AnalystChat       ──>  POST …/chat { preset }           ─> locationAnalysis（AI 看到同样的分数）
```

关键点：数据库里存的是**原始地点数据**，分数每次现算。所以加预设不需要重新请求 Google，也不需要清缓存。

## 4. 改了哪些文件

| 文件                                                                                                          | 作用                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `app/lib/categories.ts`                                                                                       | `WeightPreset` 类型、`weightPresets` 四套权重、`isWeightPreset` / `isWeightProfile` 校验、`scoringQuery` 生成链接参数 |
| `app/lib/scoring.ts`                                                                                          | `scorePlaceGroups` 加第三个参数 `preset`，默认 `balanced`                                                             |
| `app/components/PresetPicker.tsx`（新）                                                                       | 四个按钮，照抄 `MobilityProfile.tsx` 的样式和交互                                                                     |
| `ExploreProvider.tsx`、`useLocationSearch.ts`                                                                 | 读写 URL，把 preset 交给打分                                                                                          |
| `ScoreBreakdown.tsx`、`CategoryDetails.tsx`、`LocationHeader.tsx`、`ExploreWorkspace.tsx`、`compare/page.tsx` | 链接带上 preset；放置按钮                                                                                             |
| `ComparePanel.tsx`、`/api/compare`、`searchStore.ts`                                                          | 比较页用同一个 preset                                                                                                 |
| `ConversationProvider.tsx`、`AnalystChat.tsx`、`LocationAnalyst.tsx`、两个 chat 路由、`locationAnalysis.ts`   | AI 分析用同一个 preset，并把它放进 `preferences.weightPreset`                                                         |

## 5. 测试证明了什么

- 每个预设合计 100，燃油都是 0，每个类别都有权重。
- 不传预设时结果和 `balanced` 完全相同，即旧行为没变。
- 换预设只改总分，类别分数不变；"交通近、医疗远"的地址 Commuter 分数高于 Family。
- `isWeightPreset("toString")` 为 false，防止原型链上的名字被当成预设。
- 比较接口和两个 AI 接口把 preset 原样传给打分；未知预设返回 400。

全部 111 个测试、lint、类型检查、生产构建通过；Vercel 预览确认效果后合并。

## 6. 已知局限和可能的下一步

- 权重数字是人工设定的，没有用户数据校准。
- AI 回答上只标注了有车/无车，没有标注当时的预设。
- 以后可以加"登录用户的默认预设"：先看 URL，没有再用账号里的值，不用推翻现有做法。
