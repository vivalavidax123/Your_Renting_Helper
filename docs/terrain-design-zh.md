# 地形起伏功能（PR #6）设计说明

## 1. 需求怎么变成设计

你的原话：车动力小，上下坡多会难受。我把它拆成三个问题：

1. **数据从哪来？** 需要"某个经纬度的海拔"。项目已经有 Google key，所以选 Google Elevation API：不用新账号，一次请求最多 512 个点。
2. **"起伏"怎么量化？** 单个点的海拔没意义（墨尔本东边整体高，不代表难开）。真正影响开车的是**坡度** = 高度差 ÷ 水平距离。
3. **结果放哪里、要不要进总分？** 先作为独立证据显示，不改分数（原因见第 5 节）。

## 2. 改了哪些文件，各自负责什么

请求从浏览器到 Google 再回来的路径：

```
详情页 LocationDetails.tsx
  └─ TerrainCard.tsx          (浏览器) 发 GET /api/terrain?lat=..&lng=..
       └─ app/api/terrain/route.ts       (服务器) 校验经纬度，统一错误格式
            └─ app/lib/services/terrain.ts   (服务器) 拼请求、调 Google、检查返回
                 ├─ app/lib/terrain.ts       (纯计算) 生成 81 个采样点
                 └─ app/lib/terrain.ts       (纯计算) 81 个海拔 → 坡度统计
```

| 文件                                                  | 新增/修改 | 作用                                                                         |
| ----------------------------------------------------- | --------- | ---------------------------------------------------------------------------- |
| `app/lib/types.ts`                                    | 修改      | 加 `TerrainLevel`、`TerrainSummary` 两个类型，前后端共用同一份"合同"         |
| `app/lib/terrain.ts`                                  | 新增      | 纯函数：`buildTerrainSamplePoints` 算采样点，`summariseTerrain` 算坡度和等级 |
| `app/lib/services/terrain.ts`                         | 新增      | 唯一和 Google 打交道的地方：把点拼成 URL、读 key、处理 Google 的错误格式     |
| `app/api/terrain/route.ts`                            | 新增      | HTTP 入口：校验参数，成功返回 `{ ok: true, terrain }`，失败返回 400/502      |
| `app/components/TerrainCard.tsx`                      | 新增      | 卡片 UI：加载中 / 出错 / 成功三种状态，校验返回数据再显示                    |
| `app/components/LocationDetails.tsx`                  | 修改      | 把卡片放进详情页（4 行）                                                     |
| `app/lib/terrain.test.ts`、`services/terrain.test.ts` | 新增      | 9 个测试，详见第 6 节                                                        |
| `dev_notes.md`、`README.md`                           | 修改      | 按 AGENTS.md 要求同步文档                                                    |

**为什么 API key 要放服务器：** Elevation 调用在 `route.ts` → `services/terrain.ts` 里用 `GOOGLE_MAPS_API_KEY`（服务器端变量）。浏览器只调用你自己的 `/api/terrain`，看不到 key。所以需要在 `GOOGLE_MAPS_API_KEY` 所在的 Google Cloud 项目里启用 Elevation API。

## 3. 算法细节

**采样：** 以地址为中心，朝 8 个方向（每 45°）各画一条 1.5 km 直线，每 150 m 一个点：1 + 8 × 10 = 81 个点，一个请求发完。

经纬度换算：纬度 1° ≈ 111,320 m；经度 1° 的长度随纬度变短，要乘 `cos(纬度)`。墨尔本约 -37.8°，经度 1° ≈ 88 km。

**坡度：** 每条线上相邻两点算一次 `|Δ高度| / 150 × 100%`，共 80 段。取绝对值，上坡下坡都算。

**输出四个数：**

- 平均坡度：决定等级。< 1.5% 平坦，< 3% 轻微起伏，< 5% 多坡，≥ 5% 陡峭
- 最陡一段：防止"平均很平但有一个大陡坡"被平均数掩盖
- ≥ 5% 段落占比：大概是小排量车开始吃力的坡度
- 高差：最高点减最低点

**为什么是 1.5 km、150 m：** 1.5 km 大约是日常出门的头几分钟车程；150 m 足够捕捉一般坡道，同时点数（81）远低于 Google 512 点上限，一个请求就够。这些是第一版的经验值，以后可以用真实地址校准。

## 4. 用到的设计思路 / 模式

没有用到复杂的 GoF 设计模式，主要是这几个思路，都沿用了项目现有的结构：

1. **分层（Layered architecture）**：路由层只管 HTTP，服务层只管外部 API，纯计算层只管数学。哪一层出问题就看哪个文件。这和 dev_notes 里 "Route handlers / Service modules / Pure modules" 的边界一致。
2. **函数式核心、命令式外壳（Functional core, imperative shell）**：`terrain.ts` 里没有网络、没有环境变量，输入一样输出就一样，所以测试不用 mock。有副作用的部分（fetch、读 key）全部压在 `services/terrain.ts` 这层薄壳里。`scoring.ts` 也是同一个思路。
3. **适配器（Adapter）思想**：Google 返回的格式（`status`、`results[].elevation`、HTTP 200 也可能是错误）只在 service 里出现。出了这个文件，大家只看到自己定义的 `TerrainSummary`。以后换数据源（比如 Open-Elevation），只改 service 一个文件。
4. **边界处运行时校验**：TypeScript 类型只在编译时存在。`TerrainCard` 里的 `isTerrainPayload` 在运行时检查服务器返回的 JSON 真的长这样，再放进 state。项目里的 `readApiResult` 统一负责这件事。
5. **按需加载（Lazy loading）**：只有打开详情页才请求地形，首页搜索不会多花一次 Google 调用。和 CBD 通勤卡片一样。
6. **复制现有模式，而不是抽象**：`TerrainCard` 和 `CbdTravelCard` 结构几乎一样（加载、AbortController、三种状态）。只有两处重复，我没有抽一个通用 hook，因为 AGENTS.md 要求避免为假想需求做抽象。如果以后出现第三个类似卡片，再抽 `useLocationFetch` 才划算。

**AbortController 是什么：** 用户快速换地址时，旧请求还没回来。`useEffect` 的清理函数调用 `controller.abort()` 取消旧请求，避免旧结果覆盖新结果。

## 5. 为什么不进总分（可以讨论）

- 总分衡量的是"周边设施"，并且已经存在 `ScoreSnapshot` 里。改评分公式就要让所有已存分数失效重算。
- 坡对不同人影响差别很大：小排量车、电动车、骑车、走路各不一样。硬塞进一个总分反而难解释。
- 先展示原始证据，你用一段时间觉得数字准了，再决定要不要（比如只在 car-owner 模式下）加权。

## 6. 测试证明了什么

- `terrain.test.ts`（纯计算）：采样点从中心出发、每条线确实到 1.5 km；平地 = flat；每段稳定 4% = hilly；下坡同样计入；一个单独的陡坡会体现在"最陡一段"而不被平均数掩盖；点数不对会报错。
- `services/terrain.test.ts`（用假 fetch）：81 个点只发一个请求、URL 和 key 正确；Google 返回 `REQUEST_DENIED` 时会报错；没配 key 时不发请求。

## 7. 已知局限和可能的下一步

- 直线不沿马路，反映的是周边地势，不是某条路的精确坡度。更准的做法是沿真实驾车路线（例如到最近超市、到 CBD）取路线折线，再用 Elevation 的 `path` 参数采样。但每条路线要多一次路由请求。
- 每次打开详情页都会调用 Google，结果没有缓存。地形不会变，以后用量大了可以存进数据库。
- AI 分析助手目前看不到地形数据，可以加进它的上下文。
