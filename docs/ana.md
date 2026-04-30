# Daily Trivia 首页取数边界分析

## 背景

当前首页 `Hero` 在服务端组件中直接调用 `src/lib/trivia.ts`：

```txt
Home / Hero
  -> getLatestAvailableDailyQuiz()
  -> getArchiveDays()
  -> Prisma
  -> FAQ SDK
  -> question provider
```

这条链路可以正常输出 SSR HTML，因此只要服务端取数在返回 HTML 前完成，新题目内容可以进入搜索引擎爬虫看到的首屏 HTML。

当前要解决的问题不是 provider 慢，也不是 provider fallback，而是首页直接耦合后端取数实现：

- 首页 route 的服务端依赖图会包含 Prisma、FAQ SDK、签名逻辑等后端细节。
- 首页渲染边界不清晰，题目主体、历史列表、provider 查询混在同一个服务端组件路径中。
- 后续如果要把新题目走 Redis、历史题分页、provider fallback，会缺少清晰的接入点。

## 核心判断

SEO 要的不是“内容永远不变”，也不是“内容必须每天变化”。核心是：

```txt
URL 稳定 + 内容有价值 + 搜索引擎能在 HTML 中看到 + 匹配搜索意图
```

动态内容和稳定内容服务的是不同搜索意图：

- 首页动态内容适合承接“today trivia”、“daily trivia”、“trivia question of the day”这类今日型搜索。
- 日期详情页、文章页等稳定 URL 适合承接具体题目、具体知识点、历史题目的长尾搜索。

因此，Daily Trivia 的 SEO 策略不应该让首页承担所有内容价值，而应拆成：

```txt
首页 /
  -> SSR 今日或最新题目
  -> 承接每日型、新鲜度搜索

日期页 /archive/{date}
  -> SSR 当天完整题目
  -> 沉淀历史题目和具体日期内容

文章页 /blog/{slug}
  -> SSR 高价值题目的扩展解释
  -> 承接更长期的知识型搜索
```

首页每天变化是有价值的，但它的价值主要在“今天的新题目”和“入口/内链”。旧题目的长期 SEO 价值应落到稳定详情页或文章页上。

拆分服务端取数边界不会破坏 SEO。

只要满足以下条件，动态题目仍然可以进入 SEO：

- 数据请求发生在 Server Component 或服务端渲染阶段。
- 页面返回 HTML 前已经拿到题目数据。
- 题目标题、题干、答案说明等 SEO 关键内容真实渲染进 HTML。
- 不把 SEO 关键内容放到客户端 `useEffect` 后再请求。

因此，首页可以从“直接 import 后端 data layer”调整为“依赖首页专用 DTO reader”。reader 内部可以继续查 Redis、DB、provider，但首页组件只关心渲染所需的数据结构。

## 快速止血方案：拆分首页数据边界

目标：先把首页和具体后端实现解耦，不改变业务数据来源。

建议新增一个首页专用读取边界，例如：

```txt
src/lib/home-trivia.ts
```

对首页暴露稳定 DTO：

```ts
type HomeTriviaData = {
  latestQuiz: DailyQuizPayload | null;
  archiveDays: ArchiveDayItem[];
};

async function getHomeTriviaData(): Promise<HomeTriviaData>;
```

首页 `Hero` 只调用：

```txt
Hero -> getHomeTriviaData()
```

`getHomeTriviaData()` 内部再调用现有 trivia 查询逻辑。这样第一步不追求彻底消除 Prisma/SDK bundle，而是先形成明确边界：

- 首页组件不再知道 Prisma、FAQ SDK、provider 的存在。
- 后续 Redis、分页、fallback 都可以在 `getHomeTriviaData()` 内部演进。
- DTO 可以稳定下来，避免 UI 组件跟着后端数据来源变化。

## 首页数据响应拆分

首页数据应拆成至少两类：

### 1. 今日或最新题目数据

这是首页 SEO 和核心体验最重要的数据，应优先服务端取回并渲染到 HTML。

建议路径：

```txt
Hero
  -> getHomeTriviaData()
  -> getLatestQuizForHome()
  -> Redis hot key
  -> DB / provider fallback
```

业务目标：

- 今日题目或最新可用题目必须优先返回。
- Redis 侧做预热，首页请求优先直接读 Redis。
- Redis value 使用首页需要的完整 DTO，避免首页再拼装多源数据。

建议 Redis key：

```txt
daily-trivia:home:latest
daily-trivia:quiz:{yyyy-mm-dd}
```

### 2. 历史题目列表

历史列表数据会越来越多，不应该长期作为首页主请求的完整阻塞项。

短期可以继续 SSR 一部分历史数据，例如最近 20 或 30 天：

```txt
getArchiveDaysForHome({ limit: 30 })
```

中期改成分页：

```txt
首页 SSR: 最近 N 天
更多历史: API 分页加载
```

这样 SEO 仍能覆盖首页近期历史内容，同时避免历史列表增长后拖慢首页。

## Redis 预热方向

如果业务方希望每天新题目都进入首页 SEO，同时 provider 正常且已有 Redis 缓存，建议把 Redis 作为首页读取的第一数据源。

推荐预热内容不是 provider 原始响应，而是首页 DTO：

```ts
type HomeLatestQuizCache = {
  date: string;
  dayNumber: number;
  questions: DailyQuizQuestion[];
  generatedAt: string;
};
```

预热触发方式可以后续确认：

- 定时任务在 UTC 日期切换前后预热。
- 发布排期时预热。
- 首次请求 miss 后回填 Redis。

当前阶段只需要在边界设计上预留：

```txt
read latest from Redis
  -> miss: read DB + provider
  -> write Redis
```

## Provider fallback 后续方案

provider 不稳定不是当前第一阶段重点，但边界拆出来后 fallback 会更容易落地。

后续 fallback 顺序建议：

```txt
Redis DTO
  -> DB snapshot / cache table
  -> provider 实时查询
  -> empty state 或旧数据
```

其中：

- `REQUEST_FAILED`、`REQUEST_TIMEOUT`、`HTTP_ERROR >= 500` 可以视为临时不可用。
- `INVALID_CONFIG`、认证错误、400 类错误不应静默吞掉。
- 首页可以对临时不可用降级，但同步任务和监控应记录错误。

## 分阶段计划

### Phase 1：边界拆分

- 新增首页专用 reader，例如 `src/lib/home-trivia.ts`。
- `Hero` 只依赖 `getHomeTriviaData()` 返回的 DTO。
- 保持当前 DB + FAQ SDK 数据来源不变。
- 今日题目仍然 SSR 输出，保证 SEO 不退化。

### Phase 2：首页响应拆分

- 把最新题目和历史列表拆成独立读取函数。
- 最新题目作为首页核心 SSR 数据。
- 历史列表先限制数量，例如最近 20 或 30 天。
- 后续补 API 分页，加载更多历史题。

### Phase 3：Redis 首页热数据

- 最新题目优先读取 Redis DTO。
- Redis miss 时再走 DB + provider。
- 写入 Redis 后返回同一份 DTO。
- 配合定时任务或发布流程预热每日新题。

### Phase 4：Provider fallback

- Redis 和本地快照优先。
- provider 临时不可用时返回旧数据或 empty state。
- 配置、认证、参数错误继续抛出。
- 增加日志和监控，区分 provider 临时故障与配置错误。

## 当前建议

当前快速止血只做 Phase 1：

```txt
Hero -> home-trivia reader -> existing trivia service
```

这一步不会解决所有性能问题，但会先把首页组件从后端实现细节里拿出来。后续无论选择 Redis、分页、快照还是 provider fallback，都可以在 reader 边界内部推进，不再反复改首页组件结构。
