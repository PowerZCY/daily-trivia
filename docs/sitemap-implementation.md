# Sitemap 实现方案

## 目标

本次改造的目标有三个：

1. `src/app/sitemap.ts` 不再依赖第三方 `createSitemapHandler`
2. `sitemap.xml` 需要包含 `/archive/[date]` 的每日归档页面
3. `src/mdx` 下的页面在 sitemap 中的 `lastModified` 不能再统一使用“当前时间”，而要使用每篇文章 frontmatter 里的实际 `date`

## 当前问题

原来的 `src/app/sitemap.ts` 只做了一层转发：

```ts
export default createSitemapHandler(
  appConfig.baseUrl,
  appConfig.i18n.locales as string[],
  appConfig.mdxSourceDir.blog
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

### 1. 固定公开路由

固定公开路由目前显式写入 sitemap：

* `/`

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

写入 sitemap 时：

* `url` 使用 locale-aware 路径
* `lastModified` 使用 frontmatter 的 `date`
* 不再使用“当前时间”作为统一更新时间

这样生成出来的 sitemap 才能反映每篇文章真实的发布日期/更新时间语义。

### 3. Archive 日期页

归档页不是按 `DAY_ONE -> today` 盲目枚举，而是按“真实存在 quiz 的日期”生成。

数据来源：

* `getPublishedQuizDates()`：已发布 quiz 的日期列表

这个函数只读取 `dailyQuestionSchedule` 中满足以下条件的记录：

* `asFirst = 1`
* `showDate < today`

然后提取去重后的日期列表，得到 sitemap 中应包含的 archive URL：

* `/archive/2026-04-01`
* `/archive/2026-04-02`
* ...
* `/archive/2026-04-24`

这么做的原因是：

1. 归档路由会校验日期是否合法
2. 某些日期即使处于 `DAY_ONE` 和今天之间，也可能没有实际 quiz 数据
3. sitemap 不应该收录会返回 `404` 的路径
4. sitemap 只关心 URL 是否存在，不需要读取题目详情、答案、解析等内容
5. sitemap 不再依赖 FAQ SDK 的鉴权配置，构建链路更稳定

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
3. 每次请求都查库和扫文件，没有必要

所以更合适的策略是：

* 不用 `force-static`
* 也不用 `force-dynamic`
* 使用 `revalidate = 86400`

这能在“可自动更新”和“运行成本”之间取得比较稳妥的平衡。

这个策略的代价是 sitemap 不是访问时强一致的：如果缓存刚过期，第一次请求仍可能拿到上一版 sitemap。如果需要保证搜索引擎每次访问都拿到最新结果，可以改用 `export const dynamic = "force-dynamic"`，但这会让每次 sitemap 请求都实时查库和扫文件，也会让数据库短暂故障直接影响 sitemap 响应。

## 结果

改造后，sitemap 具备这些特性：

* 能包含真实存在的 archive 日期页
* 能覆盖 `blog` 和 `legal` 两类 MDX 页面
* MDX 页面的 `lastModified` 来自 frontmatter `date`
* sitemap 使用 24 小时 ISR 缓存，缓存过期后的下一次请求会触发重新生成
* 不再受第三方 helper 的静态化和统一时间戳限制
* archive URL 生成只依赖排期表，不依赖 FAQ 题目详情接口

## 后续维护建议

1. 新增公开页面时，记得把固定路由加入 `src/app/sitemap.ts`
2. 新增 MDX 文章时，必须保持 frontmatter 里有合法的 `date: YYYY-MM-DD`
3. 如果后续 archive 规则变化，优先继续基于真实 quiz 数据生成，不要退回到纯日期区间枚举
