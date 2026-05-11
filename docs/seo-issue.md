# SEO Issue Summary

## 1. `noindex` 的来源

当前项目构建产物中的 `noindex` 已确认只出现在 404 / not-found 页面：

- [.next/server/pages/404.html](/Users/funeye/IdeaProjects/daily-trivia/.next/server/pages/404.html:1)
- [.next/server/app/_not-found.html](/Users/funeye/IdeaProjects/daily-trivia/.next/server/app/_not-found.html:1)

来源不是业务页面手写的全局 SEO 配置，而是 Next.js 在 `notFound()` 场景下的默认行为。项目内存在明确触发点：

- [src/app/[locale]/(home)/archive/[date]/page.tsx](/Users/funeye/IdeaProjects/daily-trivia/src/app/[locale]/(home)/archive/[date]/page.tsx:59)
- [src/app/[locale]/(home)/archive/[date]/page.tsx](/Users/funeye/IdeaProjects/daily-trivia/src/app/[locale]/(home)/archive/[date]/page.tsx:64)

结论：

- `noindex` 只用于 404 / `_not-found`
- 正常可访问页面未发现被统一注入 `noindex`
- 这不会导致 Google 或 Bing 不收录正常页面

## 2. sitemap 配置结论

sitemap 由：

- [src/app/sitemap.ts](/Users/funeye/IdeaProjects/daily-trivia/src/app/sitemap.ts:1)

生成逻辑要点：

- 首页 `/`
- blog 路由 `/blog` 及具体文章
- legal 路由 `/legal` 及具体页面
- archive 路由 `/archive/:date`
- URL 绝对地址由 `appConfig.baseUrl` 生成
- 多语言 URL 通过 `buildLocalizedEntries()` 统一构造

你提供的线上 sitemap 文件为：

- [docs/seo.sitemap.xml](/Users/funeye/IdeaProjects/daily-trivia/docs/seo.sitemap.xml:1)

当前结论：

- sitemap 中没有发现 404 页面
- sitemap 中列出的 URL 都是预期要索引的页面
- 本地构建产物里如果出现 `localhost:3000`，那是本地环境现象，不代表线上域名错误

## 3. robots 配置结论

robots 由：

- [src/app/robots.ts](/Users/funeye/IdeaProjects/daily-trivia/src/app/robots.ts:1)

生成。

当前规则中，对主搜索引擎有效的基础组是：

```txt
User-Agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
```

而下面这些规则：

```txt
Disallow: /user-content/
Disallow: /sign-in/
Disallow: /sign-up/
Disallow: /waitlist/
Disallow: /en/blog/
Disallow: /en/legal/
```

是在特定 UA 组下生效的，主要面向 AI/辅助抓取 UA，不是 `Googlebot` 或 `Bingbot` 主搜索爬虫。

当前结论：

- 不会直接阻止 Google Search 收录正常页面
- 不会直接阻止 Bing Search 收录正常页面
- 只会限制对应特定 UA 访问这些路径

## 4. 线上页面“可被索引”的验证规则

这里验证的是“页面当前具备被索引的技术条件”，不是“已经被 Google/Bing 收录”。

单个 URL 通过检查的规则：

1. URL 存在于目标 sitemap 中
2. 请求最终返回 `200`
3. 最终 URL 仍在 `daily-trivia.org` 域名下
4. `X-Robots-Tag` 响应头中不包含 `noindex`
5. HTML 中不存在 `meta name="robots"` 且内容包含 `noindex` / `none`
6. 页面存在 canonical
7. canonical 指向当前页面自身，或仅差一个末尾 `/`
8. `robots.txt` 对 `Googlebot` 和 `Bingbot` 均不禁止该路径

说明：

- 如果页面满足以上条件，说明它在技术层面具备被搜索引擎收录的前提
- 这不等于搜索引擎一定已经收录；最终是否收录仍取决于抓取、质量判断、重复内容、内链、权重等因素

## 5. 检查脚本

脚本文件：

- [docs/seo-index-check.sh](/Users/funeye/IdeaProjects/daily-trivia/docs/seo-index-check.sh:1)

用法：

```sh
chmod +x docs/seo-index-check.sh
./docs/seo-index-check.sh
```

可选并发参数：

```sh
SEO_CONCURRENCY=6 ./docs/seo-index-check.sh
```

可选详细日志开关：

```sh
SEO_VERBOSE=1 ./docs/seo-index-check.sh
```

脚本输出说明：

- 最终总会输出一张结果表格
- 表格字段为：
  - `URL`
  - `RESULT`
  - `REQUEST_MS`
  - `PARSE_MS`
  - `TOTAL_MS`
  - `REASON`
- 最后一行总会输出汇总结果：
  - `SUMMARY: total=... ok=... failed=... avg_request_ms=... avg_parse_ms=... avg_total_ms=...`

运行过程说明：

- 默认不打印 worker 详细阶段日志
- 当 `SEO_VERBOSE=1` 时，才会输出阶段日志到标准错误
- `request=...` 是单次 HTTP 请求耗时
- `parse=...` 是本地规则匹配和提取耗时
- `total=...` 是单个 URL 的总耗时
- 如果本地有 `rg`，脚本会优先用 `rg` 做 HTML 元数据匹配

脚本设计说明：

- 脚本内已经固化了当前站点的 URL 列表，来源就是 [docs/seo.sitemap.xml](/Users/funeye/IdeaProjects/daily-trivia/docs/seo.sitemap.xml:1)
- 脚本按 `sh` 语法编写，不依赖 `source`、zsh 特性或 shell 数组
- 脚本支持并发执行，默认并发度为 `4`
- 后续其他网站复用时，只需要修改脚本顶部 3 处配置：
  - `SEO_EXPECTED_HOST`
  - `SEO_ROBOTS_URL`
  - `URLS`

## 6. 当前结论

当前已确认的结论：

- `noindex` 来源于 Next.js 的 404 / `notFound()` 默认行为
- 当前没有证据表明正常页面被统一打上 `noindex`
- sitemap 配置方向正确，且你提供的线上 sitemap 不包含 404 页面
- robots 配置不会直接阻止 Google/Bing 收录正常页面
- 后续排查应以线上 URL 的真实响应为准，而不是只看本地构建产物
