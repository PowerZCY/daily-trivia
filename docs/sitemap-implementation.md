# Sitemap 实现方案

## 目标

本次改造的目标有三个：

1. `src/app/sitemap.ts` 不再依赖第三方 `createSitemapHandler`
2. `sitemap.xml` 需要包含 `/archive/[date]` 的每日归档页面
3. `src/mdx` 下的页面在 sitemap 中的 `lastModified` 不能再统一使用“当前时间”，而要使用每篇文章 frontmatter 里的实际 `date`
4. sitemap 需要遵守 `src/mdx/*/meta.json` 中的显式排除规则，例如 `!ioc`

## 当前问题

原来的 `src/app/sitemap.ts` 只做了一层转发：

```ts
import { resolveMdxSourceDir } from "@/lib/mdx-source";

export default createSitemapHandler(
  appConfig.baseUrl,
  appConfig.i18n.locales as string[],
  resolveMdxSourceDir('blog'),
);
```

第三方 helper 有两个限制：

1. 它只扫描传入的单个 MDX 目录，这里实际只覆盖了 `blog`
2. 它给 MDX 页面写的 `lastModified` 是 `new Date()`，不是文章自己的日期

另外，第三方 helper 内部还设置了 `dynamic = 'force-static'`，这意味着 sitemap 是构建时静态生成，不适合你这里“每天新增一个 archive URL”的场景。

## 新实现思路

新的 `src/app/sitemap.ts` 直接返回 `MetadataRoute.Sitemap`，并添加：

```ts
export const revalidate = 86400;
```

这样 sitemap 会按 ISR 的方式缓存一天，不需要每次请求都实时查库，也不需要等下次完整 build 才更新。

需要注意的是，`revalidate = 86400` 不是“每天定时自动生成一次”。生产环境中，sitemap 缓存过期后，需要下一次访问 `/sitemap.xml` 才会触发重新生成。通常情况下，过期后的第一次请求可能先拿到旧缓存，Next.js 在后台生成新版本；新版本生成成功后，后续请求才会拿到更新后的 sitemap。

当前仍保留 `revalidate = 86400`，因为 sitemap 依赖两个按 UTC 日期变化的值：

* 首页 `/` 的 `lastModified` 使用 UTC 今天
* archive URL 列表生成到 UTC 昨天

### 1. 固定公开路由

固定公开路由目前显式写入 sitemap：

* `/`

首页的 `lastModified` 使用 UTC 今天，原因是首页会展示当天 trivia 内容和归档入口，属于每日变化页面。这里使用天级日期，不使用每次请求的精确时间戳，避免向搜索引擎传递过度频繁更新的信号。

如果后续还有新的公开页面，可以继续在这里追加。

### 2. MDX 路由

MDX 页面分两类：

* `src/mdx/blog`
* `src/mdx/legal`

实现时直接读取目录下的 `.mdx` 文件，并解析文件开头 frontmatter 的 `date` 字段，例如：

```md
---
title: Which Vitamin Is Not Found in Eggs?
description: ...
date: 2026-04-22
---
```

路由映射规则：

* `index.mdx` => `/blog` 或 `/legal`
* `foo.mdx` => `/blog/foo` 或 `/legal/foo`

同时会读取同目录下的 `meta.json`，并应用其中 `pages` 数组里的显式排除规则：

```json
{
  "pages": [
    "index",
    "...",
    "!ioc"
  ]
}
```

上面的 `!ioc` 表示 `ioc.mdx` 不进入 sitemap，避免 sitemap 收录内容源已经明确隐藏或排除的页面。

写入 sitemap 时：

* `url` 使用 locale-aware 路径
* `lastModified` 使用 frontmatter 的 `date`
* 不再使用“当前时间”作为统一更新时间

这样生成出来的 sitemap 才能反映每篇文章真实的发布日期/更新时间语义。

### 3. Archive 日期页

归档页现在按固定日期区间生成，不再查询数据库。

日期区间：

* 起始日期：`2026-04-01`
* 结束日期：UTC 昨天

生成结果示例：

* `/archive/2026-04-01`
* `/archive/2026-04-02`
* ...
* `/archive/{UTC yesterday}`

这么做的原因是：

1. 业务上从 `2026-04-01` 开始每天都会有 archive 内容
2. sitemap 不需要为了生成 URL 查询 `dailyQuestionSchedule`
3. sitemap 不读取题目详情、答案、解析等内容
4. sitemap 不再依赖数据库或 FAQ SDK 的可用性，生成链路更稳定
5. 只生成到 UTC 昨天，避免把当天尚未进入 archive 语义的页面提前放进 sitemap

archive 页面的 `lastModified` 使用对应日期本身，`changeFrequency` 固定为 `never`。因为归档页代表某一天的历史 trivia，进入归档后内容语义上不应再每日变化。

### 4. 多语言 URL

项目本身启用了 locale 路由，因此 sitemap 中每条路由都会对所有 locale 生成一份 URL。

路径拼接继续复用：

```ts
getAsNeededLocalizedUrl(locale, route, localePrefixAsNeeded, defaultLocale)
```

这样可以保持与现有站点路由规则完全一致。

## 为什么不用 `force-dynamic`

理论上 `app/sitemap.ts` 可以做成完全运行时生成，也就是爬虫每次访问 `sitemap.xml` 时都实时查数据。

但这个项目没必要这样做，原因很直接：

1. archive 只会按天新增
2. blog/legal 的内容更新频率不高
3. 每次请求都重新扫文件和计算日期区间没有必要

所以更合适的策略是：

* 不用 `force-static`
* 也不用 `force-dynamic`
* 使用 `revalidate = 86400`

这能在“可自动更新”和“运行成本”之间取得比较稳妥的平衡。

这个策略的代价是 sitemap 不是访问时强一致的：如果缓存刚过期，第一次请求仍可能拿到上一版 sitemap。如果需要保证搜索引擎每次访问都拿到最新结果，可以改用 `export const dynamic = "force-dynamic"`，但这会让每次 sitemap 请求都重新扫文件和计算日期区间。

## 结果

改造后，sitemap 具备这些特性：

* archive URL 从 `2026-04-01` 生成到 UTC 昨天，不再查询数据库
* 能覆盖 `blog` 和 `legal` 两类 MDX 页面
* 能遵守 MDX 目录 `meta.json` 中的 `!slug` 排除规则
* MDX 页面的 `lastModified` 来自 frontmatter `date`
* 首页 `/` 的 `lastModified` 使用 UTC 今天
* sitemap 使用 24 小时 ISR 缓存，缓存过期后的下一次请求会触发重新生成
* 不再受第三方 helper 的静态化和统一时间戳限制
* archive URL 生成不依赖排期表、数据库或 FAQ 题目详情接口

## 后续维护建议

1. 新增公开页面时，记得把固定路由加入 `src/app/sitemap.ts`
2. 新增 MDX 文章时，必须保持 frontmatter 里有合法的 `date: YYYY-MM-DD`
3. 如果某篇 MDX 不应该进入 sitemap，在对应目录的 `meta.json` 里加入 `!slug`
4. 如果后续 archive 不再保证每天都有内容，再重新评估是否从日期区间生成改回基于真实数据生成
