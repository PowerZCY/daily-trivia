# FAQ SDK 最小接入说明

本文档面向第三方业务应用，说明如何通过 `@windrun-huaiin/faq-sdk` 读取 FAQ Base 题目数据。

## 1. 安装依赖

```bash
pnpm add @windrun-huaiin/faq-sdk @windrun-huaiin/faq-contracts
```

如果项目使用 npm：

```bash
npm install @windrun-huaiin/faq-sdk @windrun-huaiin/faq-contracts
```

## 2. 配置环境变量

在 FAQ Base 后台创建 client 后，平台会给出以下配置。第三方应用需要把它们配置到服务端环境变量中：

```env
WINDRUN_HUAIIN_FAQ_BASE_URL=https://faq.example.com
WINDRUN_HUAIIN_FAQ_CLIENT_ID=client_xxxxxxxxxxxx
WINDRUN_HUAIIN_FAQ_KEY_VERSION=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
NEXT_PUBLIC_WINDRUN_HUAIIN_FAQ_PK=pk_live_xxxxxxxxxxxx
WINDRUN_HUAIIN_FAQ_SK=sk_live_xxxxxxxxxxxx
WINDRUN_HUAIIN_SDK_DEBUG=false
```

本地或测试环境可以使用 `pk_test_xxx` / `sk_test_xxx`，生产环境使用 `pk_live_xxx` / `sk_live_xxx`。

注意：

- `WINDRUN_HUAIIN_FAQ_SK` 是私钥，只能配置在服务端环境变量中。
- `WINDRUN_HUAIIN_SDK_DEBUG` 默认建议配置为 `false`，仅本地排查签名问题时临时改为 `true`。
- SDK 调用应放在服务端执行，不要在浏览器侧直接初始化 SDK。
- `NEXT_PUBLIC_WINDRUN_HUAIIN_FAQ_PK` 是平台给出的公钥配置名，第三方应用可以按平台 copy 结果原样配置。

## 3. 创建 SDK Client

建议封装一个服务端专用 client 文件。SDK 可以直接读取上面的约定环境变量：

```ts
import { createAnswersUniverseClientFromEnv } from '@windrun-huaiin/faq-sdk';

export const faqClient = createAnswersUniverseClientFromEnv();
```

如果需要自定义配置来源，也可以手动创建：

```ts
import { createAnswersUniverseClient } from '@windrun-huaiin/faq-sdk';

export const faqClient = createAnswersUniverseClient({
  baseUrl: process.env.WINDRUN_HUAIIN_FAQ_BASE_URL!,
  clientId: process.env.WINDRUN_HUAIIN_FAQ_CLIENT_ID!,
  keyVersion: process.env.WINDRUN_HUAIIN_FAQ_KEY_VERSION!,
  publicKey: process.env.NEXT_PUBLIC_WINDRUN_HUAIIN_FAQ_PK!,
  privateKey: process.env.WINDRUN_HUAIIN_FAQ_SK!,
});
```

## 4. 按 ids 批量查询题目详情

推荐使用 `questionsBase.getByIds(ids)`。

```ts
const result = await faqClient.v1.questionsBase.getByIds([
  '123',
  '456',
  '789',
]);

console.log(result.items);
```

返回类型为 `OuterQuestionBaseResult`。

每一项为 `OuterQuestionBaseItemDto`，它等价于完整题目详情 DTO，包含例如：

- `id`
- `uuid`
- `question`
- `questionImageUrl`
- `correctAnswer`
- `correctAnswerIndex`
- `incorrectAnswers`
- `explanation`
- `category`
- `subCategory`
- `difficulty`
- `asFirst`
- `tags`
- `keywords`
- `createdAt`
- `updatedAt`

SDK 内部会自动完成：

- ids 去重
- 空字符串过滤
- 签名鉴权
- POST body 请求

第三方应用不需要自行拆分 ids，也不需要配置批次、并发或超时策略。这些服务端执行策略由 FAQ Base 的 outer route 控制。

## 5. 对象参数查询

SDK 也保留了对象参数方法 `questionsBase.query(params)`，当前只支持 `ids` 字段：

```ts
const result = await faqClient.v1.questionsBase.query({
  ids: ['123', '456'],
});
```

返回类型同样是 `OuterQuestionBaseResult`。

当前建议优先使用 `getByIds(ids)`。`query(params)` 主要用于未来扩展更多查询字段时保持调用形态稳定。

## 6. 单题读取

如果只需要读取单个题目，也直接走 `getByIds`：

```ts
const result = await faqClient.v1.questionsBase.getByIds(['123']);
const item = result.items[0] ?? null;
```

返回项仍然是完整题目详情 DTO。

## 7. 类型导入

SDK 会 re-export contracts 中的外部类型。业务项目可以直接从 SDK 导入类型：

```ts
import type {
  OuterQuestionBaseResult,
  OuterQuestionBaseItemDto,
} from '@windrun-huaiin/faq-sdk';
```

也可以从 contracts 包导入：

```ts
import type {
  OuterQuestionBaseResult,
  OuterQuestionBaseItemDto,
} from '@windrun-huaiin/faq-contracts/outer/v1';
```

## 8. 调试签名问题

本地联调时，如果需要查看 SDK 签名和服务端验签日志，可以临时开启：

```env
WINDRUN_HUAIIN_SDK_DEBUG=true
```

该配置会输出请求签名、验签 payload、签名校验结果等调试信息。

不要在生产环境长期开启该变量。

## 9. 最小完整示例

```ts
import { createAnswersUniverseClientFromEnv } from '@windrun-huaiin/faq-sdk';

const client = createAnswersUniverseClientFromEnv();

export async function loadQuestions(ids: string[]) {
  const base = await client.v1.questionsBase.getByIds(ids);

  return base.items;
}
```
