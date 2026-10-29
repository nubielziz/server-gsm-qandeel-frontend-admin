// Prints the markdown for each section of the "مسارات REST API" doc tab.
import { surfaces, groups, routes, endpointCount } from '../data/routes.mjs';

import { tables as schemaTables } from '../data/schema.mjs';
const TABLES = schemaTables.map((t) => t.n);
if (TABLES.length !== 61) throw new Error('expected 61 tables, got ' + TABLES.length);
for (const r of routes) for (const t of r.t) if (!TABLES.includes(t)) throw new Error(`unknown table ${t} in ${r.p}`);

const by = (s) => routes.filter((r) => r.s === s);
const code = (x) => '`' + x + '`';
const method = (r) => (r.m === 'CRUD' ? `${code('CRUD')} ${r.ops}` : code(r.m));
const fn = (r) => (r.a === 'عام' && r.s === 'client' ? `${r.f} (عام)` : r.f);
const table = (head, rows) =>
  [`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map((c) => `| ${c.join(' | ')} |`)].join('\n');

const out = {};
const total = routes.length;
const eps = endpointCount();
const count = (s) => {
  const list = by(s);
  const n = list.length;
  if (s === 'dhru' || s === 'supplier') return `${n} actions`;
  if (s === 'events') return `${n} أحداث`;
  const e = endpointCount(list);
  return e === n ? `${n}` : `${n} (${e} endpoint)`;
};

out.s1 = `## الأسطح والقواعد

${total} مسار على ${surfaces.length} أسطح، يعني ${eps} endpoint بعد فك صفوف CRUD. كل صف عليه رقم الـ Stage اللي بيبنيه، فالـ AI بينفذ مسارات كل مرحلة من هاد التاب.

${table(['السطح', 'Base', 'مين بيستعمله', 'المصادقة', 'المسارات'], surfaces.map((s) => [s.name, code(s.base), s.who, s.auth, count(s.id)]))}

**القواعد العامة**

${table(['الموضوع', 'القاعدة'], [
  ['Base URL', `${code('https://api.<domain>')} لكل الأسطح؛ و ${code('POST /api')} alias لـ ${code('/api/index.php')}`],
  ['الصيغة', `JSON بـ camelCase؛ الفلوس strings بأربع خانات ${code('"12.5000"')}؛ التواريخ ISO 8601 بـ UTC؛ الـ IDs أرقام`],
  ['المصادقة', `v1: ${code('Authorization: Bearer gsm_live_…')}؛ client و admin: cookie جلسة httpOnly + header ${code('X-CSRF-Token')} على أي mutation؛ admin: 2FA إجباري`],
  ['الصلاحيات', `admin: ${code('resource:action')} من ${code('roles.permissions')} على كل مسار، و ${code(':*')} = كل العمليات؛ v1: scopes على المفتاح ${code('account:read')}، ${code('services:read')}، ${code('orders:read')}، ${code('orders:write')}`],
  ['المتجر /store/v1', `بلا حساب إجباري: الضيف بيشتغل برمز جلسة أو رمز تتبع طويل ما بيتخمّن، والحساب بـ magic link؛ ${code('Turnstile')} + rate limit لكل IP على كل كتابة؛ ${code('Idempotency-Key')} على ${code('/pay')}`],
  ['صفوف CRUD', `${code('L')} list · ${code('S')} show · ${code('C')} create · ${code('U')} update بـ PATCH · ${code('D')} delete، على ${code('/resource')} و ${code('/resource/:id')}`],
  ['الترقيم', `admin: Refine simple-rest (${code('_start')}، ${code('_end')}، ${code('_sort')}، ${code('_order')}، فلاتر بأسماء الحقول، header ${code('x-total-count')})؛ v1 و client: ${code('limit')} لحد 100 + ${code('cursor')}، والرد ${code('{data, nextCursor}')}`],
  ['الأخطاء', `REST: ${code('application/problem+json')} فيه ${code('type')}، ${code('title')}، ${code('status')}، ${code('code')}، ${code('detail')}، ${code('errors[]')}؛ Dhru: ${code('{"ERROR":[{"MESSAGE":"…"}]}')} بـ HTTP 200`],
  ['Idempotency', `header ${code('Idempotency-Key')} على ${code('POST /v1/orders')}، ${code('/v1/orders/bulk')}، ${code('/client/orders')}، ${code('/client/invoices')}؛ نفس المفتاح خلال 24 ساعة = نفس الرد، وجسم مختلف = ${code('409 IDEMPOTENCY_CONFLICT')}`],
  ['Rate limit', `لكل API key (افتراضي 120 بالدقيقة من ${code('api_keys.rate_limit_per_min')}) ولكل IP على مسارات الدخول؛ headers ${code('RateLimit-Limit')}، ${code('RateLimit-Remaining')}، ${code('RateLimit-Reset')}، و ${code('429')} مع ${code('Retry-After')}`],
  ['التصدير', `أي مسار ${code('export')} أو ${code('?format=csv')} بيرجع CSV بنفس فلاتر القائمة`],
  ['النسخ', `REST على ${code('/v1')} وأي تغيير كاسر = ${code('/v2')}؛ Dhru ثابت على 6.1؛ OpenAPI بيتولّد من zod على ${code('/openapi.json')}`],
])}`;

out.s2 = `## Dhru Fusion API

كل الـ actions على ${code('POST /api/index.php')} بنفس الـ auth، والحقل ${code('action')} بيحدد العملية. الأسعار والخدمات بتطلع حسب فئة التاجر صاحب المفتاح، والصيغ بالتفصيل بقسم توافق Dhru بتاب خطة البناء.

${table(['Action', 'الوظيفة', 'الرد', 'Stage'], by('dhru').map((r) => [code(r.p), r.f, r.r.endsWith(' لكل عنصر') ? code(r.r.replace(' لكل عنصر', '')) + ' لكل عنصر' : code(r.r), String(r.st)]))}`;

out.s3 = `## REST v1

للتجار اللي بيبرمجوا ربط مباشر بدون Dhru. كل المسارات بـ ${code('Authorization: Bearer')}، ولكل مفتاح scopes و IPs مسموحة.

${table(['Method', 'Path', 'الوظيفة', 'Scope', 'Stage'], by('v1').map((r) => [method(r), code(r.p), r.f, code(r.a), String(r.st)]))}`;

const grouped = (s, head, row) =>
  groups[s]
    .map((g) => {
      const list = by(s).filter((r) => r.g === g.id);
      return `### ${g.name}\n\n${table(head, list.map(row))}`;
    })
    .join('\n\n');

out.s4 = `## بوابة التاجر /client

كل المسارات بجلسة cookie إلا اللي مكتوب جنبها (عام)، والبوابة (Next.js) بتستهلكها كلها.

${grouped('client', ['Method', 'Path', 'الوظيفة', 'Stage'], (r) => [method(r), code(r.p), fn(r), String(r.st)])}`;

out.s4b = `## المتجر العام /store/v1

لعملاء المتجر (B2C) من موقع Next.js العام. كل مسار كتابة عليه Turnstile و rate limit، والـ IMEI ما بينكتب بالـ logs بنص واضح، والأسعار شاملة الضريبة بعملة الزبون. الطلب ما بينشأ وما بينرسل للمورد قبل تأكيد webhook الدفع.

${grouped('store', ['Method', 'Path', 'الوظيفة', 'الوصول', 'Stage'], (r) => [method(r), code(r.p), r.f, r.a, String(r.st)])}`;

out.s5 = `## لوحة الإدارة /admin

كل المسارات بجلسة موظف + 2FA، والصلاحية المكتوبة بيفحصها ${code('PermissionsGuard')}؛ أي mutation بينكتب بـ ${code('audit_logs')}. Refine بيستهلكها عبر simple-rest.

${grouped('admin', ['Method', 'Path', 'الوظيفة', 'الصلاحية', 'Stage'], (r) => [method(r), code(r.p), fn(r), r.a === 'عام' || r.a === 'جلسة' ? r.a : code(r.a), String(r.st)])}`;

out.s6 = `## Webhooks والمورد والنظام

### Webhooks واردة

${table(['Method', 'Path', 'الوظيفة', 'التحقق', 'Stage'], by('hooks').map((r) => [method(r), code(r.p), r.f, r.a, String(r.st)]))}

### أحداث صادرة للتاجر

الـ Worker بيبعثها لعناوين ${code('webhook_endpoints')} مع headers ${code('X-GSM-Event')}، ${code('X-GSM-Timestamp')}، ${code('X-GSM-Signature')}، وبيعيد المحاولة بـ backoff.

${table(['الحدث', 'متى', 'Stage'], by('events').map((r) => [code(r.p), r.f, String(r.st)]))}

### API المورد — صادر

الـ Worker بيستدعيها عند كل مورد عبر ${code('DhruClient')} بحسابنا عنده، وكل طلب ورد بينسجل بـ ${code('supplier_api_logs')}.

${table(['Action', 'الوظيفة', 'Stage'], by('supplier').map((r) => [code(r.p), r.f, String(r.st)]))}

### النظام

${table(['Method', 'Path', 'الوظيفة', 'Stage'], by('system').map((r) => [method(r), code(r.p), r.f, String(r.st)]))}`;

const ts = Math.floor(Date.parse('2026-10-20T09:16:40Z') / 1000);
out.s7 = `## أمثلة الردود وأكواد الأخطاء

**الطلب** — نفس الشكل بـ ${code('GET /v1/orders/:id')} و ${code('/client/orders/:id')} وجوّا الـ webhook:

\`\`\`json
{
  "id": 1048576,
  "status": "completed",
  "service": { "id": 120, "name": "iPhone Carrier Check", "type": "imei" },
  "imei": "490154203237518",
  "quantity": 1,
  "price": "1.2500",
  "currency": "USD",
  "result": { "code": "Carrier: AT&T - Locked", "comment": null, "fileId": null },
  "verification": "none",
  "source": "rest_api",
  "createdAt": "2026-10-20T09:15:02Z",
  "completedAt": "2026-10-20T09:16:40Z"
}
\`\`\`

**الخطأ** — problem+json:

\`\`\`json
{
  "type": "https://api.example.com/errors/insufficient-balance",
  "title": "Insufficient balance",
  "status": 402,
  "code": "INSUFFICIENT_BALANCE",
  "detail": "Available 0.7500 USD, required 1.2500 USD"
}
\`\`\`

**الـ webhook** — التاجر بيحسب نفس الـ HMAC وبيرفض أي حدث عمره أكثر من 5 دقائق:

\`\`\`text
POST https://merchant.example.com/hooks/gsm
Content-Type: application/json
X-GSM-Event: order.status_changed
X-GSM-Timestamp: ${ts}
X-GSM-Signature: sha256=HMAC_SHA256(secret, timestamp + "." + body)

{"id":"evt_01J9ZK3","type":"order.status_changed","createdAt":"2026-10-20T09:16:40Z","data":{"order":{"id":1048576,"status":"completed"}}}
\`\`\`

**أكواد الأخطاء**

${table(['الكود', 'HTTP', 'متى'], [
  [code('VALIDATION_FAILED'), '422', `حقل ناقص أو غلط؛ التفاصيل بـ ${code('errors[]')}`],
  [code('INVALID_IMEI'), '422', 'IMEI مش 15 رقم أو فشل Luhn'],
  [code('INSUFFICIENT_BALANCE'), '402', 'المتاح + الحد الائتماني أقل من السعر'],
  [code('SERVICE_UNAVAILABLE'), '409', 'الخدمة معطلة أو مش متاحة لفئة التاجر'],
  [code('DUPLICATE_ORDER'), '409', 'قاعدة التكرار منعت نفس IMEI على نفس الخدمة'],
  [code('NOT_CANCELLABLE'), '409', 'الخدمة ما بتسمح بالإلغاء أو الطلب طلع من pending'],
  [code('IDEMPOTENCY_CONFLICT'), '409', 'نفس Idempotency-Key مع جسم مختلف'],
  [code('UNAUTHORIZED'), '401', 'مفتاح أو جلسة غلط أو منتهية'],
  [code('FORBIDDEN'), '403', 'ما في صلاحية أو scope'],
  [code('IP_NOT_ALLOWED'), '403', 'الطلب من IP مش بقائمة المفتاح'],
  [code('NOT_FOUND'), '404', 'غير موجود أو مش تبع هاد التاجر'],
  [code('IMEI_BLOCKED'), '422', 'IMEI بالقائمة السوداء أو مبلّغ عنه، الشراء ممنوع (المتجر)'],
  [code('CONSENT_REQUIRED'), '422', 'الشروط أو الخصوصية أو التنازل عن حق الانسحاب ما انوافق عليها (المتجر)'],
  [code('CHECKOUT_EXPIRED'), '410', 'جلسة الدفع انتهت؛ السعر المثبّت ما عاد صالح (المتجر)'],
  [code('ACCOUNT_SUSPENDED'), '403', 'الحساب موقوف: ما بيدخل وما بيفتح جلسة دفع جديدة (المتجر)'],
  [code('EMAIL_TAKEN'), '409', 'الإيميل مسجّل لعميل آخر (إنشاء أو تعديل عميل بلوحة الإدارة)'],
  [code('WEAK_PASSWORD'), '422', 'كلمة المرور أقل من 10 خانات أو سهلة التخمين (المتجر والإدارة)'],
  [code('TOKEN_INVALID'), '410', 'رابط الدعوة أو الاستعادة منتهي أو مستعمل (المتجر)'],
  [code('PAYMENT_NOT_CONFIRMED'), '409', 'الطلب ما بيتنشأ قبل تأكيد الدفع من البوابة (المتجر)'],
  [code('RISK_BLOCKED'), '403', 'قواعد المخاطر منعت العملية؛ ما بيتشرح السبب للزبون (المتجر)'],
  [code('TURNSTILE_FAILED'), '403', 'فشل التحقق من الإنسان على مسار كتابة عام (المتجر)'],
  [code('RATE_LIMITED'), '429', `تجاوز الحد؛ استنى ${code('Retry-After')}`],
])}

بـ Dhru نفس الأكواد بتطلع كـ ${code('MESSAGE')}، مع رسائل المعيار حرفياً: ${code('Authentication Failed')} لـ UNAUTHORIZED، و ${code('Not enough credits')} لـ INSUFFICIENT_BALANCE، و ${code('Invalid Action')} لأي action مش معروف.`;

const which = process.argv[2];
if (which === 'stats') {
  console.log(JSON.stringify({ total, eps, per: Object.fromEntries(surfaces.map((s) => [s.id, by(s.id).length])) }));
} else if (which) {
  console.log(out[which]);
} else {
  for (const k of Object.keys(out)) console.log(`\n===== ${k} (${out[k].length} chars)`);
}
