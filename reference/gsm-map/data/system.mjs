// Actors, relationships, order scenarios and the money model shown on the page.
// B2B (merchants: wallet + API) and B2C (storefront customers: pay per order) share one order engine, one supplier layer and one ledger.

export const actors = [
  {
    id: 'merchant', name: 'أصحاب المحلات', sub: 'التجار · B2B', icon: 'store',
    desc: 'تاجر كبير يشحن رصيداً ويطلب خدمات IMEI و Server و Remote و File، من سيرفر Dhru الخاص به أو من البوابة أو عبر REST.',
    does: ['يشحن رصيده عبر فاتورة', 'يرسل طلبات فردية وبالجملة', 'يستلم النتائج بالاستعلام أو عبر webhook', 'يدير مفاتيح API و IPs المسموحة'],
    sees: ['أسعاره حسب فئته وأسعاره الخاصة', 'الرصيد المتاح والمحجوز والحد الائتماني', 'كشف الحساب والفواتير والعمولات'],
    surfaces: ['dhru', 'v1', 'client', 'events'],
    tables: ['clients', 'api_keys', 'orders', 'invoices', 'ledger_accounts', 'webhook_endpoints'],
  },
  {
    id: 'system', name: 'سيرفر GSM', sub: 'API و Worker', icon: 'server',
    desc: 'مصدر الحقيقة: يحسب السعر، ويحجز رصيد التاجر أو يقبض دفع عميل المتجر، ويوجّه الطلب للمورد أو للموظف أو للمخزون، ويسجل كل حركة مال بقيد مزدوج. محرك طلبات واحد وطبقة موردين واحدة ودفتر واحد للقناتين.',
    does: ['يتحقق من المفتاح والحقول و IMEI', 'يحسب سعر كل تاجر لحظة الطلب', 'يحجز الرصيد ثم يحوّله إيراداً أو يعيده', 'ينشئ طلب المتجر B2C بعد تأكيد الدفع فقط', 'يرسل للموردين ويسحب النتائج عبر الـ Worker'],
    sees: ['61 جدولاً في PostgreSQL', 'الـ queues والكاش في Redis', 'الملفات في S3'],
    surfaces: ['dhru', 'v1', 'client', 'store', 'admin', 'hooks', 'events', 'supplier', 'system'],
    tables: ['orders', 'order_events', 'ledger_entries', 'outbox_events', 'services', 'checkout_sessions'],
  },
  {
    id: 'supplier', name: 'الموردون', sub: 'مزودو الخدمة', icon: 'box',
    desc: 'مزودون أعلى منك تشتري منهم الخدمة بسعر التكلفة. يتصل بهم النظام كعميل Dhru بحسابك عندهم.',
    does: ['يستقبل الطلب ويرجع رقماً مرجعياً', 'يرجع الحالة والنتيجة عند الاستعلام', 'ينشر خدماته وتكلفتها', 'ينفّذ فحوص IMEI عند الطلب'],
    sees: ['طلبات من حسابك فقط، ولا يعرف تجارك ولا عملاءك'],
    surfaces: ['supplier'],
    tables: ['suppliers', 'supplier_services', 'service_supplier_links', 'supplier_api_logs'],
  },
  {
    id: 'admin', name: 'الإدارة', sub: 'الأدمن والموظفون', icon: 'shield',
    desc: 'تدير الكتالوج والأسعار والموردين والمتجر، وتعالج الطلبات اليدوية والعالقة، وتعتمد الدفعات والتوثيق والعمولات، وترد على الدعم وتقرر المرتجعات وتراجع المخاطر، من لوحة Refine بصلاحيات وسجل تدقيق.',
    does: ['تضبط الخدمات والفئات والأسعار وصفحات المتجر', 'تربط الموردين وتستورد خدماتهم', 'تعالج الطلبات اليدوية والعالقة', 'تعتمد الدفعات والتوثيق والعمولات', 'ترد على التذاكر وتقرر المرتجعات', 'تنشئ حسابات العملاء وتعدّل بياناتهم وتعيّن كلمة المرور وتوقف الحساب'],
    sees: ['المبيعات والربح موزّعة بين B2B و B2C', 'أرصدة الموردين والتنبيهات والطوابير', 'سجل التدقيق والتقارير'],
    surfaces: ['admin'],
    tables: ['staff_users', 'roles', 'ip_rules', 'services', 'pricing_rules', 'payments', 'audit_logs', 'support_tickets', 'customers'],
  },
  {
    id: 'gateway', name: 'بوابات الدفع', sub: 'بنك و CliQ وأونلاين', icon: 'card',
    desc: 'تستقبل دفع التاجر لفاتورة الشحن ودفع عميل المتجر لطلبه، وتؤكده بـ webhook موقّع أو بإيصال يراجعه الموظف، وتنفّذ المرتجعات وترسل إشعارات النزاعات.',
    does: ['تستلم قيمة الفاتورة أو الطلب (بطاقة 3DS أو كريبتو أو محلي)', 'ترسل تأكيداً موقّعاً للنظام', 'تنفّذ المرتجعات', 'ترسل النزاعات chargeback وتستلم الأدلة'],
    sees: ['الفاتورة أو جلسة الدفع والمبلغ فقط'],
    surfaces: ['hooks'],
    tables: ['payment_gateways', 'invoices', 'payments', 'refunds', 'disputes'],
  },
  {
    id: 'notify', name: 'الإشعارات', sub: 'البريد و Telegram', icon: 'bell',
    desc: 'قنوات التنبيه: نتائج الطلبات وانخفاض الرصيد للتاجر، وتنبيهات التشغيل للإدارة، وإيميلات الطلب والاسترداد والدعم لعميل المتجر.',
    does: ['ترسل حسب القوالب لكل جمهور: موظف وتاجر وعميل', 'تحترم تفضيلات كل مستلم'],
    sees: ['الحدث وبيانات القالب'],
    surfaces: ['hooks'],
    tables: ['notification_templates', 'notifications', 'outbox_events'],
  },
  {
    id: 'customer', name: 'عملاء المتجر', sub: 'مشترون · B2C', icon: 'user',
    desc: 'مشتري فرد يدخل المتجر العام بلا حساب (ضيف بالإيميل) أو بحساب يدخله بكلمة مرور أو رابط دخول، يفحص الـ IMEI ويدفع الطلب بنفسه ثم يتابعه برابط خاص. قد ينشئ الموظف حسابه أو يوقفه.',
    does: ['يتصفح الخدمات ويفحص IMEI قبل الشراء', 'يوافق على الشروط والخصوصية ثم يدفع: بطاقة 3DS أو كريبتو أو محلي', 'يتابع طلبه برمز التتبع أو من حسابه', 'يدخل حسابه بكلمة مرور أو رابط، ويغيّر كلمته أو يستعيدها', 'يفتح تذكرة دعم'],
    sees: ['السعر شاملاً الضريبة بعملته', 'صفحة تتبع الطلب برمز لا يُخمَّن', 'الإيصال والفاتورة الضريبية'],
    surfaces: ['store'],
    tables: ['customers', 'customer_credentials', 'auth_tokens', 'checkout_sessions', 'consent_records', 'orders', 'support_tickets'],
  },
  {
    id: 'risk', name: 'المخاطر والامتثال', sub: 'فحص وحظر وخصوصية', icon: 'radar',
    desc: 'طبقة حماية على قناة B2C: تقيّم كل جلسة دفع، وتفحص الـ IMEI قبل البيع، وتدير الحظر، وتلتزم بطلبات تصدير البيانات وحذفها.',
    does: ['تعطي كل جلسة score وقرار allow أو review أو block', 'تفحص IMEI: قائمة سوداء وقفل قبل الدفع', 'تطبّق قوائم الحظر والقواعد السريعة', 'تنفّذ طلبات التصدير والحذف وتُخفي IMEI بعد مدة الاحتفاظ'],
    sees: ['إشارات الجلسة: IP وبلد وبصمة جهاز وتكرار', 'نتائج فحص IMEI المخزّنة مؤقتاً', 'أدلة الموافقات للنزاعات'],
    surfaces: ['store', 'admin'],
    tables: ['risk_assessments', 'imei_checks', 'blocklist_entries', 'data_requests', 'consent_records'],
  },
];

// kind: data (solid) | money (dashed) | control (dotted). dir: ab | both
export const links = [
  {
    id: 'm-s', a: 'merchant', b: 'system', kind: 'data', dir: 'both', title: 'طلبات ونتائج',
    ab: ['placeimeiorder أو POST /v1/orders أو البوابة', 'استعلام الحالة getimeiorder'],
    ba: ['REFERENCEID فوراً', 'STATUS و CODE', 'قائمة الأسعار حسب الفئة', 'webhook عند تغيّر الحالة'],
    tables: ['orders', 'order_events', 'services', 'api_keys'], surfaces: ['dhru', 'v1', 'client', 'events'],
  },
  {
    id: 'm-g', a: 'merchant', b: 'gateway', kind: 'money', dir: 'ab', title: 'دفع قيمة الشحن',
    ab: ['يدفع فاتورة الشحن: تحويل بنكي أو CliQ أو بطاقة'],
    tables: ['invoices'], surfaces: ['client'],
  },
  {
    id: 'g-s', a: 'gateway', b: 'system', kind: 'money', dir: 'ab', title: 'تأكيد الدفع',
    ab: ['webhook موقّع على /webhooks/payments/:gateway', 'أو إيصال يراجعه الموظف', 'قيد الشحن: gateway_clearing إلى client_wallet', 'دفع طلب B2C: الجلسة المدفوعة تُنتج الطلب، وقيد gateway_clearing إلى customer_funds و vat_payable', 'refund.succeeded و dispute.created بنفس القناة'],
    tables: ['payments', 'invoices', 'ledger_entries', 'checkout_sessions', 'refunds', 'disputes'], surfaces: ['hooks'],
  },
  {
    id: 's-p', a: 'system', b: 'supplier', kind: 'data', dir: 'both', title: 'تنفيذ الطلبات',
    ab: ['placeimeiorder بحسابك', 'getimeiorder للحالة', 'imeiservicelist للمزامنة', 'accountinfo للرصيد', 'فحص IMEI قبل البيع'],
    ba: ['supplier_ref', 'STATUS و CODE', 'الخدمات والتكلفة', 'رصيدك عنده'],
    tables: ['supplier_services', 'service_supplier_links', 'supplier_api_logs', 'orders'], surfaces: ['supplier'],
  },
  {
    id: 'a-s', a: 'admin', b: 'system', kind: 'control', dir: 'both', title: 'إدارة وتشغيل',
    ab: ['الخدمات والأسعار والفئات', 'ربط الموردين واستيراد الخدمات', 'معالجة الطلبات اليدوية والعالقة', 'اعتماد الدفعات والتوثيق والعمولات', 'إنشاء حسابات عملاء المتجر وتعديلها وكلمة المرور وإيقافها'],
    ba: ['لوحة المؤشرات والطوابير', 'التقارير وكشوف الحساب', 'سجل التدقيق'],
    tables: ['services', 'pricing_rules', 'orders', 'payments', 'customers', 'customer_credentials', 'audit_logs'], surfaces: ['admin'],
  },
  {
    id: 'a-p', a: 'admin', b: 'supplier', kind: 'money', dir: 'ab', title: 'شحن رصيدك عند المورد',
    ab: ['تحويل خارج النظام لشراء رصيد', 'يُسجَّل قيداً: bank إلى supplier_prepaid'],
    tables: ['suppliers', 'ledger_entries'], surfaces: ['admin'],
  },
  {
    id: 's-n', a: 'system', b: 'notify', kind: 'control', dir: 'ab', title: 'أحداث',
    ab: ['outbox ثم notifications.send', 'حسب القوالب وتفضيلات المستلم', 'إيميلات العميل: استلام ودفع واكتمال وفشل واسترداد'],
    tables: ['outbox_events', 'notifications', 'notification_templates'], surfaces: [],
  },
  {
    id: 'n-m', a: 'notify', b: 'merchant', kind: 'control', dir: 'ab', title: 'نتائج وتنبيهات رصيد',
    ab: ['اكتمال طلب أو رفضه', 'رصيد منخفض', 'فاتورة مدفوعة'],
    tables: ['notifications'], surfaces: [],
  },
  {
    id: 'n-a', a: 'notify', b: 'admin', kind: 'control', dir: 'ab', title: 'تنبيهات تشغيل',
    ab: ['رصيد مورد منخفض', 'طلبات needs_attention', 'إيداعات كبيرة وفرق مطابقة'],
    tables: ['notifications'], surfaces: [],
  },
  {
    id: 'c-s', a: 'customer', b: 'system', kind: 'data', dir: 'both', title: 'تصفح وطلب وتتبع',
    ab: ['GET /store/v1/services وفحص IMEI المجاني', 'POST /store/v1/checkout-sessions بالإيميل والـ IMEI والموافقات', 'الدخول بكلمة المرور أو رابط الدخول، واستعادة الكلمة وتغييرها', 'فتح التذاكر'],
    ba: ['السعر شاملاً الضريبة بعملة العميل مع سعر صرف مثبّت', 'رابط الدفع من البوابة', 'صفحة التتبع برمز public_token', 'إيصال PDF وإيميلات الحالة'],
    tables: ['customers', 'customer_credentials', 'auth_tokens', 'sessions', 'checkout_sessions', 'orders', 'imei_checks', 'consent_records', 'support_tickets'], surfaces: ['store'],
  },
  {
    id: 'c-g', a: 'customer', b: 'gateway', kind: 'money', dir: 'ab', title: 'دفع الطلب مقدّماً',
    ab: ['يدفع في صفحة البوابة المستضافة: بطاقة مع 3DS أو كريبتو أو بوابة محلية', 'لا يُنشأ طلب ولا يُرسل شيء للمورد قبل تأكيد الدفع'],
    tables: ['checkout_sessions', 'payments'], surfaces: ['store'],
  },
  {
    id: 'r-s', a: 'system', b: 'risk', kind: 'control', dir: 'both', title: 'فحص ومخاطر',
    ab: ['جلسة الدفع لتقييم المخاطر قبل فتح الدفع', 'IMEI للفحص قبل الطلب', 'طلبات تصدير البيانات وحذفها'],
    ba: ['قرار allow أو review أو block مع score', 'نتيجة الفحص: clean أو blacklisted أو locked', 'قوائم الحظر الفعالة'],
    tables: ['risk_assessments', 'imei_checks', 'blocklist_entries', 'data_requests'], surfaces: ['store', 'admin'],
  },
];

export const pairs = [
  { a: 'merchant', b: 'admin', title: 'التاجر والإدارة', text: 'علاقة تجارية تمر عبر النظام: الإدارة تحدد فئة التاجر وأسعاره الخاصة وحده الائتماني، وتعتمد دفعاته وتوثيقه.' },
  { a: 'merchant', b: 'supplier', title: 'التاجر والمورد', text: 'لا علاقة مباشرة: التاجر يرى خدمتك بسعرك، والمورد يرى طلباً من حسابك فقط.' },
  { a: 'admin', b: 'supplier', title: 'الإدارة والمورد', text: 'الإدارة تربط حساب المورد بالـ API، وتشحن رصيدك عنده، وتراقب التكلفة ونسبة الرفض.' },
  { a: 'customer', b: 'admin', title: 'العميل والإدارة', text: 'علاقة خدمة تمر عبر النظام: العميل يفتح تذكرة من صفحة التتبع، والإدارة ترد وتقرر المرتجع وتراجع الطلبات المشبوهة قبل التنفيذ، وتدير حسابه: إنشاء وتعديل وكلمة مرور وإيقاف. العميل لا يرى لوحة الإدارة.' },
  { a: 'customer', b: 'merchant', none: true, title: 'العميل والتاجر', text: 'قناتان منفصلتان على محرك واحد: التاجر بفئته ومحفظته وسعره، والعميل بسعر Retail يدفعه لكل طلب. لا يرى أحدهما الآخر.' },
  { a: 'customer', b: 'supplier', none: true, title: 'العميل والمورد', text: 'لا يعرف المورد العميل: يرى طلباً من حسابك فقط، ولا يصله من بيانات العميل إلا الـ IMEI اللازم للتنفيذ.' },
];

// Catalogue of sequence-diagram lanes; each scenario lists the lane ids it uses (in order).
export const lanes = [
  { id: 'merchant', name: 'التاجر' },
  { id: 'customer', name: 'العميل' },
  { id: 'api', name: 'API' },
  { id: 'gateway', name: 'البوابة' },
  { id: 'db', name: 'البيانات' },
  { id: 'worker', name: 'Worker' },
  { id: 'supplier', name: 'المورد' },
  { id: 'admin', name: 'الإدارة' },
  { id: 'staff', name: 'الموظف' },
];

export const statuses = [
  { id: 'pending', code: 0 },
  { id: 'processing', code: 1 },
  { id: 'completed', code: 4 },
  { id: 'rejected', code: 3 },
];

const S = (from, to, label, text, tables = [], extra = {}) => ({ from, to, label, text, tables, ...extra });

// A track is one status line shown under the step panel: steps set it through the step field named by `key`.
const ORDER_TRACK = (chain, empty = 'لم يُنشأ الطلب بعد') => ({ key: 'status', title: 'حالة الطلب الآن', chain, empty });

const B2B_LANES = ['merchant', 'api', 'db', 'worker', 'supplier', 'admin'];
const B2C_LANES = ['customer', 'api', 'gateway', 'db', 'worker', 'supplier'];

const place = [
  S('merchant', 'api', 'placeimeiorder', 'سيرفر Dhru لدى التاجر يرسل IMEI ورقم الخدمة مع اسم المستخدم والمفتاح.', ['api_keys']),
  S('api', 'api', 'تحقق', 'المفتاح و IP المسموح وحد الطلبات، ثم الحقول المطلوبة و Luhn للـ IMEI وقاعدة التكرار.', ['api_keys', 'services', 'service_fields']),
  S('api', 'db', 'سعر وحجز وطلب', 'PriceResolver يحسب سعر هذا التاجر، ثم في transaction واحدة: طلب جديد وحدث وقيد حجز ومهمة outbox.', ['orders', 'order_events', 'ledger_entries', 'outbox_events'], { ledger: 'client_wallet إلى client_hold · 5$', status: 'pending' }),
  S('api', 'merchant', 'REFERENCEID', 'الرد فوراً برقم الطلب، والحالة pending أي STATUS 0.', ['orders']),
];

const dispatch = [
  S('db', 'worker', 'orders.dispatch', 'outbox.relay ينقل الحدث إلى queue الإرسال.', ['outbox_events']),
  S('worker', 'supplier', 'placeimeiorder', 'الإرسال بحسابك عند المورد الأساسي، مع حد السرعة وتسجيل الطلب والرد.', ['service_supplier_links', 'supplier_api_logs']),
  S('supplier', 'worker', 'REFERENCEID', 'رقم الطلب عند المورد يُحفظ في supplier_ref، والحالة processing أي STATUS 1.', ['orders'], { status: 'processing' }),
  S('worker', 'supplier', 'getimeiorder', 'استعلام دوري: كل دقيقة في الساعة الأولى، ثم كل 5 دقائق، ثم كل 30.', ['supplier_api_logs']),
];

export const scenarios = [
  {
    id: 'success', name: 'نجاح عبر المورد', group: 'b2b', lanes: B2B_LANES, tracks: [ORDER_TRACK(['pending', 'processing', 'completed'])],
    steps: [
      ...place, ...dispatch,
      S('supplier', 'worker', 'STATUS 4 + CODE', 'النتيجة جاهزة عند المورد.', ['supplier_api_logs']),
      S('worker', 'db', 'completed وقيود', 'الحجز يتحول إيراداً بسعر البيع، وتُسجَّل التكلفة من رصيدك عند المورد.', ['orders', 'order_events', 'ledger_entries'], { ledger: 'client_hold إلى revenue · 5$ ، supplier_prepaid إلى cogs · 3$', status: 'completed' }),
      S('worker', 'merchant', 'webhook', 'order.status_changed موقّع بـ HMAC، وإشعار Telegram أو بريد حسب التفضيلات.', ['webhook_deliveries', 'notifications']),
      S('merchant', 'api', 'getimeiorder', 'سيرفر التاجر يسحب النتيجة STATUS 4 و CODE ويسلمها لزبونه.', ['orders']),
    ],
  },
  {
    id: 'reject', name: 'رفض المورد', group: 'b2b', lanes: B2B_LANES, tracks: [ORDER_TRACK(['pending', 'processing', 'rejected'])],
    steps: [
      ...place, ...dispatch,
      S('supplier', 'worker', 'STATUS 3', 'المورد رفض الطلب: IMEI غير مدعوم أو الخدمة متوقفة.', ['supplier_api_logs']),
      S('worker', 'db', 'rejected واسترجاع', 'الحجز يعود للمحفظة كاملاً، بلا أي تكلفة.', ['orders', 'order_events', 'ledger_entries'], { ledger: 'client_hold إلى client_wallet · 5$', status: 'rejected' }),
      S('worker', 'merchant', 'webhook', 'order.status_changed مع سبب الرفض.', ['webhook_deliveries']),
      S('merchant', 'api', 'getimeiorder', 'سيرفر التاجر يقرأ STATUS 3 ويعيد المبلغ لزبونه.', ['orders']),
    ],
  },
  {
    id: 'manual', name: 'تنفيذ يدوي', group: 'b2b', lanes: B2B_LANES, tracks: [ORDER_TRACK(['pending', 'processing', 'completed'])],
    steps: [
      ...place,
      S('db', 'admin', 'طابور يدوي', 'الخدمة تُنفَّذ يدوياً، فيظهر الطلب في طابور الموظفين بحالة dispatch_state = manual.', ['orders']),
      S('admin', 'api', 'accept', 'POST /admin/orders/:id/accept ينقل الطلب إلى processing.', ['orders', 'order_events'], { status: 'processing' }),
      S('admin', 'api', 'reply + CODE', 'POST /admin/orders/:id/reply بالنتيجة بعد تنفيذها.', ['orders']),
      S('api', 'db', 'completed وقيود', 'الحجز يتحول إيراداً، وكل إجراء للموظف يُسجَّل في audit_logs.', ['orders', 'ledger_entries', 'audit_logs'], { ledger: 'client_hold إلى revenue · 5$', status: 'completed' }),
      S('worker', 'merchant', 'webhook', 'الـ Worker يلتقط حدث outbox ويرسل order.status_changed.', ['webhook_deliveries']),
      S('merchant', 'api', 'getimeiorder', 'STATUS 4 و CODE.', ['orders']),
    ],
  },
  {
    id: 'timeout', name: 'انقطاع المورد', group: 'b2b', lanes: B2B_LANES, tracks: [ORDER_TRACK(['pending', 'processing', 'completed'])],
    steps: [
      ...place,
      dispatch[0],
      S('worker', 'supplier', 'placeimeiorder', 'الإرسال إلى المورد.', ['supplier_api_logs']),
      S('supplier', 'worker', 'timeout', 'لم يصل رد خلال timeout_ms، وقد يكون الطلب نُفِّذ عند المورد فعلاً.', ['supplier_api_logs'], { lost: true }),
      S('worker', 'db', 'needs_attention', 'لا إعادة إرسال تلقائية: الطلب يتوقف في طابور needs_attention والرصيد يبقى محجوزاً.', ['orders', 'order_events'], { dispatch: 'needs_attention' }),
      S('worker', 'admin', 'تنبيه Telegram', 'تنبيه فوري للإدارة بالطلب العالق.', ['notifications']),
      S('admin', 'api', 'fetch أو dispatch', 'الموظف يتحقق عند المورد: fetch إن وُجد مرجع، أو dispatch يدوي بعد التأكد.', ['orders', 'supplier_api_logs']),
    ],
  },

  // ── B2C: example amounts = net 12.49$ + 20% VAT 2.50$ = 14.99$ gross, supplier cost 7.20$, gateway fee 0.73$ ──
  {
    id: 'b2c-paid', name: 'طلب متجر مدفوع', group: 'b2c', lanes: B2C_LANES,
    tracks: [
      { key: 'session', title: 'جلسة الدفع', chain: ['open', 'paid'], empty: 'لم تُفتح جلسة دفع بعد' },
      ORDER_TRACK(['pending', 'processing', 'completed'], 'لم يُنشأ الطلب بعد: لا يُنشأ إلا بعد تأكيد الدفع'),
    ],
    steps: [
      S('customer', 'api', 'فحص IMEI', 'فحص مجاني قبل الشراء: أول 8 أرقام (TAC) من tac_catalog تحدد الموديل، والفحص يكشف القائمة السوداء أو القفل. الـ IMEI المحظور يُمنع طلبه، والمقفل يُحذَّر منه.', ['tac_catalog', 'imei_checks']),
      S('customer', 'api', 'POST /store/v1/checkout-sessions', 'العميل يدخل الإيميل والـ IMEI، ويوافق على الشروط والخصوصية وتنازل الانسحاب لبدء الخدمة فوراً. لا حساب مطلوب: يُنشأ customers كضيف بالإيميل.', ['customers', 'checkout_sessions', 'consent_records']),
      S('api', 'api', 'سعر وضريبة وخطر', 'السعر من فئة Retail شاملاً الضريبة حسب بلد العميل، وسعر الصرف يُثبَّت على الجلسة. ثم يقيّم risk_assessments الجلسة، وقد يمنعها أو يطلب مراجعة قبل فتح الدفع.', ['service_group_prices', 'tax_rates', 'currencies', 'risk_assessments', 'checkout_sessions'], { session: 'open' }),
      S('api', 'gateway', 'جلسة دفع مستضافة', 'إنشاء جلسة دفع لدى البوابة بمبلغ الجلسة ومفتاح idempotency، مع 3DS للبطاقة أو عنوان للكريبتو.', ['checkout_sessions', 'payments', 'payment_gateways']),
      S('customer', 'gateway', 'يدفع الطلب', 'العميل يدفع في صفحة البوابة نفسها. لم يُنشأ أي طلب بعد، ولا يُرسل شيء للمورد.', ['payments']),
      S('gateway', 'api', 'webhook payment.succeeded', 'تأكيد موقّع يُتحقق من توقيعه ويُعالج مرة واحدة فقط. هذه اللحظة الوحيدة التي يُسمح فيها بالتنفيذ؛ وفي الكريبتو بعد عدد التأكيدات المطلوب.', ['payments', 'outbox_events']),
      S('api', 'db', 'التقاط الدفع وإنشاء الطلب', 'في transaction واحدة: الدفعة captured والجلسة paid، وطلب جديد بـ customer_id و public_token بدل client_id، وقيد القبض، ومهمة outbox للإرسال.', ['payments', 'checkout_sessions', 'orders', 'order_events', 'ledger_entries', 'outbox_events'], { ledger: 'gateway_clearing إلى customer_funds · 12.49$ ، gateway_clearing إلى vat_payable · 2.50$', session: 'paid', status: 'pending' }),
      S('db', 'db', 'رسوم البوابة', 'رسوم المعالجة تُسجَّل مصروفاً على البوابة.', ['payments', 'ledger_entries'], { ledger: 'gateway_clearing إلى gateway_fees · 0.73$' }),
      S('api', 'customer', 'رابط التتبع', 'إيميل الاستلام برابط تتبع فيه public_token، وصفحة التتبع تعمل بلا حساب. الحالة pending.', ['orders', 'notifications']),
      ...dispatch,
      S('supplier', 'worker', 'STATUS 4 + CODE', 'النتيجة جاهزة عند المورد.', ['supplier_api_logs']),
      S('worker', 'db', 'completed وقيود', 'عند التسليم تتحول أموال العميل إلى إيراد بسعر البيع بلا الضريبة، وتُسجَّل تكلفة المورد. الضريبة تبقى في vat_payable.', ['orders', 'order_events', 'ledger_entries'], { ledger: 'customer_funds إلى revenue · 12.49$ ، supplier_prepaid إلى cogs · 7.20$', status: 'completed' }),
      S('worker', 'customer', 'النتيجة والإيصال', 'إيميل الاكتمال بالنتيجة، وإيصال ضريبي PDF.', ['notifications', 'invoices']),
    ],
  },
  {
    id: 'b2c-refund', name: 'استرداد قبل التسليم', group: 'b2c', lanes: ['customer', 'api', 'admin', 'db', 'worker', 'gateway'],
    tracks: [
      { key: 'refund', title: 'حالة الاسترداد', chain: ['requested', 'approved', 'processing', 'completed'], empty: 'لم يُطلب استرداد بعد' },
      ORDER_TRACK(['pending', 'rejected']),
    ],
    steps: [
      S('customer', 'api', 'POST /store/v1/tickets', 'العميل اكتشف أن الـ IMEI خطأ بعد الدفع، فيفتح تذكرة من صفحة التتبع بفئة wrong_imei أو refund. الطلب ما زال pending ولم يُرسل للمورد.', ['support_tickets', 'ticket_messages', 'orders'], { status: 'pending' }),
      S('api', 'admin', 'تذكرة في الطابور', 'تظهر في طابور الدعم مع موعد SLA، ويصل الموظف تنبيه.', ['support_tickets', 'notifications']),
      S('admin', 'api', 'قرار الاسترداد', 'الموظف يتأكد أن الطلب لم يُرسل، ويقرر استرداداً كاملاً إلى البطاقة الأصلية (method = original). يحتاج صلاحية ويُسجَّل في سجل التدقيق.', ['refunds', 'orders', 'audit_logs'], { refund: 'approved' }),
      S('api', 'db', 'إلغاء الطلب وقيد الاسترداد', 'في transaction واحدة: يُلغى الطلب فيصير rejected، وتُلغى مهمة الإرسال في outbox، ويُسجَّل القيد العكسي بالمبلغ الكامل شاملاً الضريبة.', ['orders', 'order_events', 'refunds', 'ledger_entries', 'outbox_events'], { ledger: 'customer_funds إلى gateway_clearing · 12.49$ ، vat_payable إلى gateway_clearing · 2.50$', status: 'rejected' }),
      S('db', 'worker', 'refunds.process', 'outbox ينقل المهمة إلى queue الاسترداد.', ['outbox_events']),
      S('worker', 'gateway', 'طلب استرداد', 'استرداد بالمبلغ الكامل مع مفتاح idempotency حتى لا يتكرر. refunds.status = processing.', ['refunds', 'payments'], { refund: 'processing' }),
      S('gateway', 'api', 'webhook refund.succeeded', 'تأكيد موقّع بنجاح الاسترداد: refunds.status = completed وتُخزَّن gateway_refund_id.', ['refunds', 'payments'], { refund: 'completed' }),
      S('api', 'customer', 'إيميل الاسترداد', 'العميل يستلم إيميل الاسترداد، وتُغلق التذكرة بردّ جاهز من reply_templates.', ['notifications', 'support_tickets', 'reply_templates']),
    ],
  },
  {
    id: 'b2c-chargeback', name: 'نزاع chargeback خسرناه', group: 'b2c', lanes: ['gateway', 'api', 'db', 'admin'],
    tracks: [{ key: 'dispute', title: 'حالة النزاع الآن', chain: ['needs_response', 'under_review', 'lost'], empty: 'لا يوجد نزاع بعد' }],
    steps: [
      S('gateway', 'api', 'webhook dispute.created', 'العميل اعترض عند مصدر بطاقته، فأرسلت البوابة النزاع بمهلة لتقديم الأدلة. المبلغ المتنازع عليه 14.99$ مع رسم نزاع 15$.', ['disputes', 'payments', 'outbox_events']),
      S('api', 'db', 'سجل النزاع', 'يُنشأ disputes بحالة needs_response مع evidence_due_at، وتُعلَّم الدفعة والطلب والعميل.', ['disputes', 'payments', 'orders', 'customers'], { dispute: 'needs_response' }),
      S('db', 'admin', 'تنبيه بالمهلة', 'تنبيه فوري للإدارة بموعد تقديم الأدلة قبل أن تنتهي المهلة.', ['notifications', 'disputes']),
      S('admin', 'api', 'تجميع حزمة الأدلة', 'من النظام نفسه: سجل الطلب الزمني، ونتيجة فحص IMEI، وإثبات التسليم (النتيجة والوقت)، وموافقات الشروط وتنازل الانسحاب مع IP والوقت، وإيميلات الحالة المرسلة.', ['order_events', 'imei_checks', 'consent_records', 'notifications', 'risk_assessments', 'files']),
      S('api', 'gateway', 'رفع الأدلة', 'تُرفع الحزمة عبر API البوابة: disputes.status = under_review مع submitted_at.', ['disputes', 'files'], { dispute: 'under_review' }),
      S('gateway', 'api', 'webhook: lost', 'قرار البنك لصالح العميل: النزاع خسرناه.', ['disputes'], { dispute: 'lost' }),
      S('api', 'db', 'قيد الخسارة', 'المبلغ المسترَدّ من البوابة مع رسم النزاع يُسجَّلان خسارة.', ['disputes', 'ledger_entries', 'ledger_transactions'], { ledger: 'gateway_clearing إلى chargeback_loss · 29.99$' }),
      S('admin', 'db', 'حظر وتعلّم', 'يُضاف إيميل العميل وبصمة بطاقته والجهاز إلى blocklist_entries بمصدر chargeback، وترتفع مخاطر العميل فتُحجب طلباته القادمة.', ['blocklist_entries', 'customers', 'risk_assessments', 'audit_logs']),
    ],
  },
  {
    id: 'b2c-ticket', name: 'تذكرة دعم: تأخير', group: 'b2c', lanes: ['customer', 'api', 'db', 'admin'],
    tracks: [{ key: 'ticket', title: 'حالة التذكرة الآن', chain: ['new', 'open', 'pending_customer', 'resolved', 'closed'], empty: 'لم تُفتح تذكرة بعد' }],
    steps: [
      S('customer', 'api', 'POST /store/v1/tickets', 'الطلب تأخّر عن الوقت المتوقع. العميل يفتح تذكرة من صفحة التتبع بلا حساب بفئة delay ويكتب رسالته.', ['support_tickets', 'ticket_messages', 'orders']),
      S('api', 'db', 'تذكرة و SLA', 'تُنشأ التذكرة بحالة new مع number وأولوية، ويُحسب sla_due_at حسب الفئة.', ['support_tickets', 'ticket_messages', 'outbox_events'], { ticket: 'new' }),
      S('db', 'admin', 'طابور الدعم', 'تظهر في طابور الدعم لدى الإدارة، ويصل العميل إيميل باستلام التذكرة.', ['notifications', 'support_tickets']),
      S('admin', 'api', 'استلام ورد', 'الموظف يستلمها فيصبح assignee_id، ويراجع سجل الطلب ومراسلات المورد، ثم يرد بقالب من reply_templates. هذا أول رد فيُسجَّل first_response_at.', ['support_tickets', 'ticket_messages', 'reply_templates', 'order_events', 'supplier_api_logs'], { ticket: 'open' }),
      S('api', 'customer', 'الرد بالإيميل', 'يصل الرد إلى العميل بالإيميل، وتنتظر التذكرة ردّه.', ['notifications', 'ticket_messages'], { ticket: 'pending_customer' }),
      S('customer', 'api', 'رد العميل', 'رد العميل بالإيميل يُربط بنفس التذكرة كرسالة جديدة، فتعود إلى open.', ['ticket_messages', 'support_tickets'], { ticket: 'open' }),
      S('admin', 'api', 'حل التذكرة', 'بعد اكتمال الطلب وتأكيد العميل يضع الموظف التذكرة resolved ويُسجَّل resolved_at.', ['support_tickets', 'audit_logs'], { ticket: 'resolved' }),
      S('api', 'customer', 'تقييم CSAT', 'يصل العميل رابط تقييم الدعم، وتُغلق التذكرة بعد التقييم: csat_score.', ['support_tickets', 'notifications'], { ticket: 'closed' }),
    ],
  },
  {
    id: 'b2c-account', name: 'إدارة حساب عميل', group: 'b2c', lanes: ['admin', 'api', 'db', 'customer'],
    tracks: [{ key: 'account', title: 'حالة الحساب الآن', chain: ['invited', 'active', 'suspended'], empty: 'لا حساب بعد' }],
    steps: [
      S('admin', 'api', 'POST /admin/customers', 'عميل طلب بالهاتف أن يُنشأ له حساب. الموظف يدخل الاسم والإيميل والبلد، ويختار «رابط لاختيار كلمة المرور». يُرفض الإيميل إن كان لعميل آخر أو في القائمة السوداء.', ['customers', 'blocklist_entries']),
      S('api', 'db', 'حفظ الحساب والدعوة', 'يُنشأ customers بـ has_account وcreated_by = الموظف وstatus = active، وسجل customer_credentials بلا كلمة مرور بعد، ورمز دعوة في auth_tokens (يُخزَّن hash فقط) صالح ساعة، وسطر في audit_logs.', ['customers', 'customer_credentials', 'auth_tokens', 'audit_logs'], { account: 'invited' }),
      S('api', 'customer', 'إيميل الدعوة', 'يصل العميل إيميل فيه رابط الدعوة. إن اختار الموظف كلمة مؤقتة بدل الرابط: تُحفظ hash مع must_change_password = true ويُرسلها الموظف بقناة آمنة.', ['notifications', 'auth_tokens']),
      S('customer', 'api', 'POST /store/v1/auth/password/set', 'العميل يفتح الرابط ويختار كلمته. الرمز يُستهلك مرة واحدة فيُملأ used_at، ويوثَّق الإيميل: email_verified_at.', ['auth_tokens', 'customer_credentials', 'customers'], { account: 'active' }),
      S('api', 'db', 'جلسة جديدة', 'تُفتح جلسة في sessions ويُحدَّث last_login_at، وأي جلسات قديمة تُنهى. الكلمة لا تُخزَّن إلا hash.', ['sessions', 'customers', 'customer_credentials']),
      S('admin', 'api', 'POST /admin/customers/:id/password', 'بعد أسابيع نسي العميل كلمته. الموظف لا يرى الحالية أبداً: يرسل رابط تعيين جديداً، ويختار إنهاء كل الجلسات. لا تدخل كلمة المرور في سجل التدقيق، فقط أن تغييراً تمّ.', ['customer_credentials', 'auth_tokens', 'sessions', 'notifications', 'audit_logs']),
      S('admin', 'api', 'POST /admin/customers/:id/suspend', 'اشتبه العميل باختراق حسابه فطلب إيقافه. الموظف يوقفه بسبب: customers.status = suspended مع suspended_at وsuspended_reason وsuspended_by، وتُنهى كل الجلسات فوراً. لا شيء يُضاف للقائمة السوداء.', ['customers', 'sessions', 'audit_logs'], { account: 'suspended' }),
      S('customer', 'api', 'دخول أو طلب جديد', 'محاولة الدخول وفتح جلسة دفع جديدة تُرفضان برمز ACCOUNT_SUSPENDED. الطلبات الجارية تكتمل ويصل العميل نتيجتها، فالإيقاف لا يقطع خدمة دُفع ثمنها.', ['customers', 'sessions', 'checkout_sessions']),
      S('admin', 'api', 'POST /admin/customers/:id/reactivate', 'بعد التأكد من العميل يعيد الموظف التفعيل: status = active ويُمسح السبب، ويسجّل العميل دخوله من جديد. الفرق عن الحظر: الحظر للاحتيال ويضيف بصمته للقائمة السوداء.', ['customers', 'audit_logs'], { account: 'active' }),
    ],
  },
  {
    id: 'admin-team', name: 'إضافة موظف وإيقافه', group: 'ops', lanes: ['admin', 'api', 'db', 'staff'],
    tracks: [{ key: 'staff', title: 'حالة حساب الموظف', chain: ['invited', 'active', 'suspended'], empty: 'لا حساب بعد' }],
    steps: [
      S('admin', 'api', 'POST /admin/staff', 'المالك يضيف موظفاً: الاسم والإيميل والدور، ويختار «رابط لاختيار كلمة المرور». يُرفض الإيميل المكرر، ولا ينجح إلا لمن عنده staff:create. الإدارة العادية ترى الصفحة ولا تضيف.', ['staff_users', 'roles']),
      S('api', 'db', 'حفظ الحساب والدعوة', 'يُنشأ staff_users بحالة invited وcreated_by = المالك، ورمز دعوة في auth_tokens (hash فقط، ساعة، لمرة واحدة)، وسطر في audit_logs. لا تُكتب كلمة المرور في أي مكان.', ['staff_users', 'auth_tokens', 'audit_logs'], { staff: 'invited' }),
      S('api', 'staff', 'إيميل الدعوة', 'يصل الموظف رابط الدعوة. إن اختار المالك كلمة مؤقتة بدل الرابط: تُحفظ hash مع must_change_password = true ويسلّمها المالك بقناة آمنة.', ['notifications', 'auth_tokens']),
      S('staff', 'api', 'POST /admin/auth/password/set', 'الموظف يفتح الرابط ويختار كلمته. الرمز يُستهلك مرة واحدة، ثم يضبط 2FA بمسح QR (POST /admin/auth/2fa/setup)، فيصير twofa_enabled = true.', ['auth_tokens', 'staff_users']),
      S('staff', 'api', 'POST /admin/auth/login', 'قبل أي فحص للكلمة تُفحص قواعد IP: حظر نشط يطابق العنوان؟ ثم إن كان تقييد الإدارة مفعّلاً، هل العنوان في قائمة السماح؟ ثم الكلمة ورمز TOTP، فتُفتح جلسة ويُحدَّث last_login_at وlast_login_ip.', ['ip_rules', 'staff_users', 'sessions'], { staff: 'active' }),
      S('admin', 'api', 'PATCH /admin/staff/:id', 'المالك يغيّر دور موظف من Support إلى Finance. لا يستطيع تغيير دوره هو، ولا يُنزَّل المالك الأخير، حتى لا تبقى اللوحة بلا مالك.', ['staff_users', 'roles', 'audit_logs']),
      S('admin', 'api', 'POST /admin/staff/:id/suspend', 'الموظف ترك العمل. المالك يوقفه بسبب: status = suspended مع suspended_at وsuspended_reason وsuspended_by، وتُنهى كل جلساته فوراً. يُرفض إيقاف النفس أو المالك الأخير. اسمه يبقى على أفعاله القديمة في audit_logs.', ['staff_users', 'sessions', 'audit_logs'], { staff: 'suspended' }),
      S('staff', 'api', 'محاولة دخول', 'يُرفض الدخول برمز ACCOUNT_SUSPENDED حتى لو كانت الكلمة صحيحة، وأي جلسة قديمة لا تعمل.', ['staff_users', 'sessions']),
      S('admin', 'api', 'POST /admin/staff/:id/reactivate', 'عاد الموظف من إجازته. المالك يعيد التفعيل فيمسح السبب، ويدخل الموظف بكلمته ورمز 2FA الحاليين. إن فقد هاتفه يُستخدم POST /admin/staff/:id/reset-2fa فيضبط واحداً جديداً عند دخوله التالي.', ['staff_users', 'audit_logs'], { staff: 'active' }),
    ],
  },
  {
    id: 'ip-rules', name: 'حظر IP وقائمة السماح', group: 'ops', lanes: ['admin', 'api', 'db', 'customer', 'staff'],
    tracks: [{ key: 'restriction', title: 'تقييد لوحة الإدارة الآن', chain: ['open', 'restricted'], empty: 'مفتوحة لأي عنوان' }],
    steps: [
      S('admin', 'api', 'POST /admin/ip-rules', 'المالك يضيف عنوان المكتب إلى قائمة السماح (kind = allow): عنوان أو نطاق CIDR وتسمية ومدة اختيارية لمن يسافر. يُرفض النطاق الأوسع من /16 والمكرر.', ['ip_rules', 'audit_logs']),
      S('admin', 'api', 'PUT /admin/access/restriction', 'يشغّل تقييد لوحة الإدارة بالقائمة. يُرفض التشغيل إن لم يكن عنوان الطالب نفسه فيها، فلا يقفل أحد نفسه. المفتاح يُخزَّن في settings.', ['settings', 'ip_rules', 'audit_logs'], { restriction: 'restricted' }),
      S('staff', 'api', 'فتح لوحة الإدارة', 'زائر من عنوان ليس في القائمة يفتح اللوحة. الترتيب: (1) حظر نشط يطابق؟ (2) للإدارة مع التقييد: في قائمة السماح؟ لا، فيرجع 403 صفحة Access denied بلا نموذج دخول، ويزيد hit_count.', ['ip_rules']),
      S('api', 'db', 'مطابقة القواعد', 'القواعد النشطة تُحمَّل من ip_rules إلى Redis وتُبطَل عند أي تغيير، والمطابقة بالنطاق في الذاكرة فلا استعلام لكل طلب. القاعدة المنتهية expires_at تسقط وحدها.', ['ip_rules']),
      S('admin', 'api', 'POST /admin/ip-rules', 'من صفحة العميل يضغط الموظف «Block IP» على آخر عنوان له، ويُقرأ من آخر جلسة (sessions.ip) أو آخر جلسة دفع (checkout_sessions.ip). يُحظر عن المتجر لسبعة أيام (kind = block, scope = store) بسبب مكتوب. يُرفض نطاق يشمل عنوان الموظف نفسه إن كان الجمهور الإدارة أو الكل.', ['ip_rules', 'sessions', 'checkout_sessions', 'audit_logs']),
      S('customer', 'api', 'طلب من العنوان المحظور', 'أي طلب إلى /store/v1/* من هذا العنوان يُرفض بـ 403 قبل الوصول إلى منطق الدفع. الحساب نفسه لم يُمس: يدخل من شبكة أخرى بشكل عادي.', ['ip_rules']),
      S('api', 'db', 'حظر آلي', 'محرك المخاطر يرى 60 محاولة بطاقة في 10 دقائق من نطاق واحد، فيضيف قاعدة source = auto لمدة 30 يوماً ويسجّل تقييماً في risk_assessments.', ['ip_rules', 'risk_assessments']),
      S('admin', 'api', 'POST /admin/ip-rules/check', 'قبل التعديل يختبر الموظف عنواناً: يرجع القرار (allowed أو refused) والقاعدة المطابقة، حسب الجمهور المختار.', ['ip_rules']),
      S('admin', 'api', 'DELETE /admin/ip-rules/:id', 'يفك الحظر أو يزيل عنواناً مسموحاً. تُرفض إزالة القاعدة الوحيدة التي تُدخل الموظف نفسه ما دام التقييد مفعّلاً.', ['ip_rules', 'audit_logs']),
    ],
  },
];

// Money: semantic value flows; entries are the exact double-entry lines from the plan.
// pos = [row, col] on a 4x4 grid.
export const accounts = [
  { id: 'fee_income', name: 'إيراد الرسوم', kind: 'إيراد', pos: [1, 1] },
  { id: 'vat_payable', name: 'ضريبة مستحقة', kind: 'التزام', pos: [1, 2] },
  { id: 'chargeback_loss', name: 'خسائر النزاعات', kind: 'مصروف', pos: [1, 3] },
  { id: 'bank', name: 'البنك', kind: 'أصل', pos: [1, 4], init: 1000 },
  { id: 'gateway_fees', name: 'رسوم البوابات', kind: 'مصروف', pos: [2, 1] },
  { id: 'gateway_clearing', name: 'مستحق من البوابات', kind: 'أصل', pos: [2, 2] },
  { id: 'customer_funds', name: 'أموال العملاء', kind: 'التزام', pos: [2, 3] },
  { id: 'supplier_prepaid', name: 'رصيدك عند المورد', kind: 'أصل', pos: [2, 4], init: 200 },
  { id: 'commission_expense', name: 'مصروف العمولات', kind: 'مصروف', pos: [3, 1] },
  { id: 'client_wallet', name: 'محافظ التجار', kind: 'التزام', pos: [3, 2] },
  { id: 'revenue', name: 'الإيراد', kind: 'إيراد', pos: [3, 3] },
  { id: 'cogs', name: 'تكلفة الموردين', kind: 'مصروف', pos: [3, 4] },
  { id: 'adjustments', name: 'تعديلات يدوية', kind: 'مصروف', pos: [4, 2] },
  { id: 'client_hold', name: 'المحجوز', kind: 'التزام', pos: [4, 3] },
];

export const eventGroups = [
  { id: 'b2b', name: 'قناة التجار B2B: محفظة مسبقة الدفع' },
  { id: 'b2c', name: 'قناة المتجر B2C: دفع لكل طلب' },
];

export const moneyEvents = [
  {
    id: 'deposit', group: 'b2b', name: 'شحن 100$', note: 'التاجر يدفع 103$ والرسوم 3$ عليه',
    flows: [['gateway_clearing', 'client_wallet', 100], ['gateway_clearing', 'fee_income', 3]],
    delta: { gateway_clearing: 103, client_wallet: 100, fee_income: 3 },
    entry: [['gateway_clearing', 103, 0], ['client_wallet', 0, 100], ['fee_income', 0, 3]],
  },
  {
    id: 'order', group: 'b2b', name: 'طلب 5$', note: 'الرصيد يُحجز ولا يُصرف بعد', need: ['client_wallet', 5, 'اشحن الرصيد أولاً'],
    flows: [['client_wallet', 'client_hold', 5]],
    delta: { client_wallet: -5, client_hold: 5 },
    entry: [['client_wallet', 5, 0], ['client_hold', 0, 5]],
  },
  {
    id: 'complete', group: 'b2b', name: 'اكتمال الطلب', note: 'الإيراد 5$ والتكلفة 3$، فالربح 2$', need: ['client_hold', 5, 'لا يوجد طلب محجوز'],
    flows: [['client_hold', 'revenue', 5], ['supplier_prepaid', 'cogs', 3]],
    delta: { client_hold: -5, revenue: 5, supplier_prepaid: -3, cogs: 3 },
    entry: [['client_hold', 5, 0], ['cogs', 3, 0], ['revenue', 0, 5], ['supplier_prepaid', 0, 3]],
  },
  {
    id: 'reject', group: 'b2b', name: 'رفض الطلب', note: 'المبلغ يعود للمحفظة كاملاً', need: ['client_hold', 5, 'لا يوجد طلب محجوز'],
    flows: [['client_hold', 'client_wallet', 5]],
    delta: { client_hold: -5, client_wallet: 5 },
    entry: [['client_hold', 5, 0], ['client_wallet', 0, 5]],
  },
  {
    id: 'topup', group: 'b2b', name: 'شحن رصيد المورد 50$', note: 'تحويل من بنكك لشراء رصيد',
    flows: [['bank', 'supplier_prepaid', 50]],
    delta: { bank: -50, supplier_prepaid: 50 },
    entry: [['supplier_prepaid', 50, 0], ['bank', 0, 50]],
  },
  {
    id: 'commission', group: 'b2b', name: 'عمولة إحالة 0.20$', note: 'تُصرف لمحفظة التاجر المُحيل', need: ['revenue', 5, 'العمولة تُستحق على طلب مكتمل'],
    flows: [['commission_expense', 'client_wallet', 0.2]],
    delta: { commission_expense: 0.2, client_wallet: 0.2 },
    entry: [['commission_expense', 0.2, 0], ['client_wallet', 0, 0.2]],
  },
  {
    id: 'adjust', group: 'b2b', name: 'تعديل يدوي 10$', note: 'إضافة من الإدارة مع سبب وصلاحية',
    flows: [['adjustments', 'client_wallet', 10]],
    delta: { adjustments: 10, client_wallet: 10 },
    entry: [['adjustments', 10, 0], ['client_wallet', 0, 10]],
  },

  // B2C: net 12.49 + 20% VAT 2.50 = 14.99 gross; supplier cost 7.20; gateway fee 0.73
  {
    id: 'b2c_pay', group: 'b2c', name: 'دفع طلب 14.99$', note: 'صافي 12.49$ وضريبة 2.50$ (20%)',
    flows: [['gateway_clearing', 'customer_funds', 12.49], ['gateway_clearing', 'vat_payable', 2.5]],
    delta: { gateway_clearing: 14.99, customer_funds: 12.49, vat_payable: 2.5 },
    entry: [['gateway_clearing', 14.99, 0], ['customer_funds', 0, 12.49], ['vat_payable', 0, 2.5]],
  },
  {
    id: 'b2c_fee', group: 'b2c', name: 'رسوم البوابة 0.73$', note: 'مصروف على كل دفعة', need: ['customer_funds', 12.49, 'ادفع طلب المتجر أولاً'],
    flows: [['gateway_clearing', 'gateway_fees', 0.73]],
    delta: { gateway_clearing: -0.73, gateway_fees: 0.73 },
    entry: [['gateway_fees', 0.73, 0], ['gateway_clearing', 0, 0.73]],
  },
  {
    id: 'b2c_deliver', group: 'b2c', name: 'تسليم الطلب', note: 'الإيراد 12.49$ والتكلفة 7.20$', need: ['customer_funds', 12.49, 'ادفع طلب المتجر أولاً'],
    flows: [['customer_funds', 'revenue', 12.49], ['supplier_prepaid', 'cogs', 7.2]],
    delta: { customer_funds: -12.49, revenue: 12.49, supplier_prepaid: -7.2, cogs: 7.2 },
    entry: [['customer_funds', 12.49, 0], ['cogs', 7.2, 0], ['revenue', 0, 12.49], ['supplier_prepaid', 0, 7.2]],
  },
  {
    id: 'b2c_refund', group: 'b2c', name: 'استرداد قبل التسليم', note: 'كامل 14.99$ إلى البطاقة', need: ['customer_funds', 12.49, 'لا يوجد طلب مدفوع غير مسلَّم'],
    flows: [['customer_funds', 'gateway_clearing', 12.49], ['vat_payable', 'gateway_clearing', 2.5]],
    delta: { customer_funds: -12.49, vat_payable: -2.5, gateway_clearing: -14.99 },
    entry: [['customer_funds', 12.49, 0], ['vat_payable', 2.5, 0], ['gateway_clearing', 0, 14.99]],
  },
  {
    id: 'b2c_chargeback', group: 'b2c', name: 'نزاع خسرناه', note: '14.99$ ورسم نزاع 15$ يُخصمان من مستحقاتك', need: ['revenue', 12.49, 'النزاع يأتي بعد تسليم طلب مدفوع'],
    flows: [['gateway_clearing', 'chargeback_loss', 29.99]],
    delta: { gateway_clearing: -29.99, chargeback_loss: 29.99 },
    entry: [['chargeback_loss', 29.99, 0], ['gateway_clearing', 0, 29.99]],
  },
  {
    id: 'payout', group: 'b2c', name: 'تحويل البوابة للبنك 14.26$', note: 'دفعة الطلب بعد خصم الرسوم', need: ['gateway_clearing', 14.26, 'لا يوجد رصيد مستحق من البوابة'],
    flows: [['gateway_clearing', 'bank', 14.26]],
    delta: { gateway_clearing: -14.26, bank: 14.26 },
    entry: [['bank', 14.26, 0], ['gateway_clearing', 0, 14.26]],
  },
];
