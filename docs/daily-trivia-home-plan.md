# Daily Trivia 首页需求与开发计划

## 目标

将当前站点首页重构为一个每日 5 道 trivia 题目的网站首页，核心体验包括：

- 首页展示当天答题模块
- 用户完成 5 题后，在同一模块内展示答题报告
- 首页下方展示历史列表
- 点击历史卡片进入对应日期的答题页面
- 题目数据通过服务端渲染输出，保证 SEO 友好和爬虫可索引

本阶段文档只定义需求和开发方案，不涉及代码实现细节以外的 UI 稿。

## 已确认需求

### 数据与日期规则

- 日期统一按 `UTC+0` 处理
- 数据库表使用 `dailyt.daily_question_schedule`
- 表中 `show_date` 格式为 `YYYY-MM-DD`，例如 `2026-04-01`
- Day 1 固定为 `2026-04-01`
- Day N 根据日期递增计算，不单独存库
- 当天题目取 `show_date = 今日 UTC+0 日期`
- 当天共 5 道题，按 `sort_order ASC` 展示
- 历史列表按天展示，数据来源为 `as_first = 1` 的排期记录
- 历史列表卡片只展示当天首题的题干，不展示其他信息
- 历史列表当前全部展示，暂不分页

### 题目详情来源

- 先从 `dailyt.daily_question_schedule` 查询 `question_id`
- 再参考 `faq-sdk.skills.md`，从第 3 步开始接入 SDK
- 通过 `@windrun-huaiin/faq-sdk` 服务端批量获取题目详情
- 使用 `faqClient.v1.questionsBase.getByIds(ids)` 获取题目
- SDK 返回的数据需要按数据库查询出来的顺序重新组装

### 首页结构

首页保留以下模块：

- `FingerprintStatus`
- `Hero`
- `SeoContent`

首页不保留：

- `Gallery`
- 其他模板营销模块

`Hero` 作为首页主体容器，需要包住 3 个内容层次：

- 顶部介绍区
- 每日答题区
- 历史列表区

注意：

- 答题报告不作为独立展示区
- 答题报告只在用户完成当天 5 题后，替换每日答题区内容显示

### 路由

- 历史详情页路由固定为 `/daily/[date]`
- 示例：`/daily/2026-04-19`
- 点击历史卡片进入对应日期答题页

### 交互与状态

- 答题需要支持单题作答、答案反馈、下一题推进、进度显示
- 完成后展示答题报告
- 答题报告保留 `retry` 按钮
- 允许将 `correctAnswer` 和 `explanation` 下发到客户端
- 网站目标是帮助用户获得知识，不以隐藏答案为目标
- `retry` 点击后需要清掉当前日期的完成记录并重置答题流程
- 已完成后刷新页面时，不需要恢复用户当时具体选择了哪个错误选项，只需要恢复每题正误状态

### 埋点

- 埋点使用 GA
- 埋点实现采用一个很薄的浏览器端封装，内部统一调用 `window.gtag`
- 需要的事件：
  - `daily_quiz_started`
  - `daily_quiz_completed`
  - `archive_card_clicked`
  - `report_share_clicked`
  - `report_retry_clicked`
- 不需要的事件：
  - `archive_visibility_toggled`
  - `report_restart_clicked`

### 持久化

- `localStorage` 的使用方式参考 `examples/trivia-patterns/sample.js`
- 完成状态与答题报告按日期持久化
- 首页历史卡片完成态也基于本地存储判断
- key 设计应按日期隔离，避免不同日期互相覆盖
- `localStorage` 只存最小必要的作答结果，不缓存题目题干、正确答案、解释等冗余内容
- 题目、答案和 explanation 由当前页面已经拿到的服务端数据提供，不依赖本地存储恢复

### 样式与体验

- 样式统一使用 Tailwind
- UI 参考 `examples/trivia-patterns`
- 不能直接照搬示例的整页深色视觉
- 需要在玻璃拟态基础上重新设计，更贴近当前项目
- 首页整体不做整屏深色 hero
- 必须兼容移动端，优先保证移动端可读性和可点击性

### 服务端与基础设施

- Prisma 统一使用：

```ts
import { prisma } from '@windrun-huaiin/backend-core/prisma';
```

- 不需要自建 Prisma singleton
- 题目数据获取必须放在服务端执行
- 首页与日期页都应输出 SSR 内容，便于 SEO

## 页面与模块设计

### 1. 首页 Hero 容器

`src/components/hero.tsx` 将从当前模板 Hero 改造为首页主容器，负责组合以下内容：

- 页面标题、说明文案、日期信息
- 当日 trivia 答题模块
- 历史列表模块

`Hero` 本身应继续保持服务端组件属性，优先负责数据装配和页面结构输出。

### 2. 每日答题模块

每日答题模块负责展示当天 5 道题，并在客户端完成以下逻辑：

- 当前题索引
- 选项随机排序
- 正误判断
- 正确数统计
- 单题反馈
- 下一题切换
- 完成后切换为答题报告

首屏题目内容由服务端输出，保证首屏 HTML 可被索引。

### 3. 答题报告

报告在每日答题模块内部替换显示，包含：

- 成绩总结
- 题目回顾
- 正误标记
- explanation 展示
- 分享按钮
- retry 按钮

不包含：

- 独立的首页报告区

### 4. 历史列表

历史列表展示所有已有日期的卡片：

- 每张卡片只展示日期与首题题干
- 不展示额外统计、标签、耗时或主题信息
- 卡片点击后进入 `/daily/[date]`
- 完成态可由客户端根据 `localStorage` 进行轻量增强

历史列表题干内容必须由服务端直接渲染到 HTML 中。

### 5. 日期详情页

新增 `/daily/[date]` 页面：

- 页面使用与首页相同的 trivia 数据模型
- 根据 URL 中的日期读取 5 道题
- 答题模块与首页共用主要交互实现
- 页面 metadata 应基于具体日期生成

## 数据流设计

### 首页数据流

1. 计算当前 UTC+0 日期
2. 查询当天 `daily_question_schedule`
3. 取出 5 个 `question_id`
4. 用 FAQ SDK 批量获取完整题目详情
5. 按 `sort_order` 重组题目数组
6. 查询全部 `as_first = 1` 的历史记录
7. 用 FAQ SDK 批量获取历史首题详情
8. 输出首页 SSR 内容

### 日期页数据流

1. 从路由参数读取 `date`
2. 校验日期格式是否合法
3. 查询该日期的 5 条排期记录
4. 用 FAQ SDK 获取完整题目详情
5. 按 `sort_order` 重组
6. 输出日期页 SSR 内容

## 推荐的数据结构

### Daily Quiz 数据

```ts
type DailyQuizQuestion = {
  id: string;
  question: string;
  questionImageUrl?: string | null;
  correctAnswer: string;
  incorrectAnswers: string[];
  explanation?: string | null;
  category?: string | null;
  sortOrder: number;
};

type DailyQuizPayload = {
  date: string;
  dayNumber: number;
  questions: DailyQuizQuestion[];
};
```

### 历史列表数据

```ts
type ArchiveDayItem = {
  date: string;
  dayNumber: number;
  firstQuestion: string;
};
```

## localStorage 方案

建议使用按日期隔离的 key：

```ts
daily-trivia:quiz:2026-04-19
daily-trivia:completed-days
```

推荐存储结构：

```ts
type QuizCompletionRecord = {
  completed: true;
  date: string;
  correctCount: number;
  answers: Array<{
    questionId: string;
    isCorrect: boolean;
  }>;
};
```

说明：

- 首页和日期页共用同一日期 key，确保状态一致
- 历史完成态可从 `completed-days` 派生
- 不存 `selectedAnswer`
- 不存题干、正确答案、explanation
- 报告页展示所需的题目正文、答案和 explanation 直接使用当前页面已有的 SSR 题目数据
- 已完成后刷新页面时，只恢复分数和每题正误，不恢复用户当时具体选择的错误选项

## GA 事件设计

建议统一封装一个浏览器端事件上报方法，内部优先使用 `window.gtag`：

- `daily_quiz_started`
  - `date`
  - `day_number`

- `daily_quiz_completed`
  - `date`
  - `day_number`
  - `score`

- `archive_card_clicked`
  - `date`
  - `day_number`
  - `completed`

- `report_share_clicked`
  - `date`
  - `day_number`
  - `score`

- `report_retry_clicked`
  - `date`
  - `day_number`
  - `score`

## SEO 要求

- 首页首屏题目文本必须 SSR 输出
- 历史列表首题题干必须 SSR 输出
- 日期详情页题目内容必须 SSR 输出
- 页面 metadata 需要根据 trivia 主题重写，不能继续沿用模板文案
- 首页底部继续保留 `SeoContent`

注意：

- 虽然答案和 explanation 可以下发到客户端，但题目和首题 teaser 仍必须在 HTML 中可见
- 日期页建议设置更明确的标题和描述，例如包含日期与 Day 编号

## 移动端要求

必须优先保证移动端体验，具体包括：

- Hero 内容采用单列优先布局
- 答题卡片在窄屏下保持足够的内边距与点击区域
- 选项按钮在移动端优先单列展示
- 报告内容在移动端避免复杂并列结构
- 历史列表卡片在移动端保持清晰层级和稳定点击区
- 不依赖 hover 才能理解状态

## UI 设计原则

在保留玻璃拟态质感的前提下，首页视觉需要重新设计：

- 使用更明亮的页面背景，不做整屏深色 hero
- 主卡片采用轻玻璃和柔和高光
- 局部使用品牌感渐变强调进度、按钮和状态
- 历史列表层级弱于每日答题主卡
- 风格应统一到当前项目，而不是 demo clone 风格

## 开发计划

### 阶段 1：数据层

- 新增 trivia 服务端数据装配函数
- 接入 `@windrun-huaiin/backend-core/prisma`
- 接入 FAQ SDK client
- 实现当天题目查询
- 实现历史首题查询
- 实现按日期查询指定日题目
- 实现 Day Number 计算工具

### 阶段 2：首页改造

- 重写 `src/components/hero.tsx`
- 移除旧模板 Hero 内容
- 将首页改为 trivia 信息架构
- 保留 `SeoContent`
- 清理首页中残留的无用 import

### 阶段 3：答题交互

- 新增客户端答题组件
- 实现题目切换、反馈、报告
- 接入 `localStorage`
- 接入 GA 埋点
- 实现报告区 `retry` 重置逻辑
- 保证首页和日期页共用同一交互逻辑

### 阶段 4：历史列表

- 实现历史卡片服务端输出
- 接入日期路由跳转
- 按本地完成状态增强卡片显示
- 优化移动端布局

### 阶段 5：日期页

- 新增 `/daily/[date]` 页面
- 复用首页答题体验
- 增加页面级 metadata
- 处理非法日期和无数据日期

### 阶段 6：SEO 与验收

- 检查首页和日期页 SSR 输出
- 检查 metadata 是否完成重写
- 检查移动端布局
- 检查本地存储恢复
- 检查 GA 埋点触发点

## 风险与注意事项

- FAQ SDK 返回结果顺序不能直接假定正确，必须按 id 重排
- 首页与日期页必须共用日期维度的本地存储 key
- `show_date` 应严格按 `UTC+0` 计算，不使用本地时区
- 移动端不能照搬样例的双列选项布局
- 首页服务端内容与客户端 hydration 状态必须一致，避免闪动
- 当前首页源码中虽然 `Gallery` 标签已删，但 import 仍残留，后续实现时应顺手清理
