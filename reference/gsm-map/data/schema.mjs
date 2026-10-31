// 66 tables: the 40 from the original plan (B2B) + 21 for the B2C expansion (stages 14-19) + 5 for system health and alerting (domain G).
// fk: [column, target, kind]
// kind: 'fk' (default) | 'poly' (polymorphic / logical) | 'array' (id array)
// b2c: 'new' = table added for B2C, 'mod' = existing table that gained B2C columns (shown as tags on the map)
export const domains = [
  { id: 'A', name: 'الهوية والصلاحيات' },
  { id: 'B', name: 'الكتالوج والتسعير' },
  { id: 'C', name: 'الموردون' },
  { id: 'D', name: 'الطلبات' },
  { id: 'E', name: 'المال' },
  { id: 'F', name: 'العمولات' },
  { id: 'G', name: 'المنصة' },
  { id: 'H', name: 'المتجر والمحتوى' },
  { id: 'I', name: 'عملاء المتجر B2C' },
  { id: 'J', name: 'الدعم' },
  { id: 'K', name: 'المخاطر والامتثال' },
];

const T = (n, d, desc, cols, fk = [], b2c = null) => ({ n, d, desc, cols, fk, ...(b2c ? { b2c } : {}) });

export const tables = [
  // ── A. الهوية والصلاحيات ──
  T('staff_users', 'A', 'موظفو لوحة الإدارة، و 2FA إجباري. الحالة: invited حتى أول دخول، أو active، أو suspended (إيقاف يُعكس ويُنهي الجلسات ويُبقي السجل). لا يُوقف المالك الأخير ولا الموظف نفسه. العناوين المسموحة في ip_rules لا في العمود', ['email', 'password_hash nullable', 'name', 'role_id', 'totp_secret_enc', 'twofa_enabled', 'must_change_password', 'password_changed_at', 'status', 'suspended_at', 'suspended_reason', 'suspended_by', 'created_by', 'last_login_at', 'last_login_ip'], [['role_id', 'roles']]),
  T('roles', 'A', 'الأدوار وصلاحياتها (RBAC)', ['name', 'permissions text[]']),
  T('clients', 'A', 'التجار B2B؛ username هو اسم مستخدم Dhru', ['username', 'email', 'password_hash', 'name', 'company', 'phone', 'country', 'group_id', 'status', 'kyc_status', 'referred_by_id', 'referral_code', 'totp_secret_enc', 'email_verified_at', 'telegram_chat_id', 'notification_prefs jsonb'], [['group_id', 'client_groups'], ['referred_by_id', 'clients']]),
  T('sessions', 'A', 'جلسات الدخول للموظفين والتجار والعملاء (magic link)', ['token_hash', 'subject_type', 'subject_id', 'ip', 'user_agent', 'last_seen_at', 'expires_at', 'revoked_at'], [['subject_id', 'staff_users', 'poly'], ['subject_id', 'clients', 'poly'], ['subject_id', 'customers', 'poly']], 'mod'),
  T('auth_tokens', 'A', 'رموز الاستعمال الواحد لرابط الدعوة واستعادة كلمة المرور للعملاء والموظفين، والدخول بالرابط وتوثيق الإيميل: hash فقط، صالحة ساعة ولمرة واحدة', ['purpose', 'subject_type', 'subject_id', 'token_hash', 'expires_at', 'used_at', 'ip', 'created_by'], [['subject_id', 'customers', 'poly'], ['subject_id', 'staff_users', 'poly'], ['created_by', 'staff_users']], 'new'),
  T('api_keys', 'A', 'مفاتيح الـ API للتجار، مخزنة hash', ['client_id', 'name', 'prefix', 'key_hash', 'scopes text[]', 'allowed_ips cidr[]', 'rate_limit_per_min', 'last_used_at', 'last_used_ip', 'expires_at', 'revoked_at'], [['client_id', 'clients']]),
  T('kyc_submissions', 'A', 'طلبات توثيق التجار', ['client_id', 'status', 'file_ids bigint[]', 'reviewed_by', 'reviewed_at', 'note'], [['client_id', 'clients'], ['reviewed_by', 'staff_users'], ['file_ids', 'files', 'array']]),

  T('ip_rules', 'A', 'قواعد الشبكة تُفحص قبل أي منطق: سماح للوحة الإدارة، وحظر لعنوان أو نطاق لجمهور واحد (المتجر أو API أو الإدارة) أو للكل. الحظر يغلب السماح، والتقييد بقائمة السماح مفتاح في settings. تُحمَّل النشطة في Redis فلا استعلام لكل طلب', ['kind', 'scope', 'cidr', 'label', 'reason', 'source', 'expires_at nullable', 'hit_count', 'last_hit_at', 'created_by'], [['created_by', 'staff_users']]),

  // ── B. الكتالوج والتسعير ──
  T('client_groups', 'B', 'الفئات ونسب الخصم وحدود الترقية؛ kind = b2c_retail لفئة التجزئة الوحيدة للمتجر', ['name', 'kind', 'discount_percent', 'is_default', 'earn_threshold', 'deposit_limit', 'overdraft_allowed', 'sort'], [], 'mod'),
  T('service_categories', 'B', 'التصنيفات، وتساوي GROUPNAME في Dhru', ['name', 'type', 'allowed_group_ids bigint[]', 'sort', 'is_active'], [['allowed_group_ids', 'client_groups', 'array']]),
  T('services', 'B', 'الخدمات؛ id يساوي SERVICEID', ['category_id', 'type', 'name', 'info', 'delivery_time', 'status', 'fulfillment', 'price_mode', 'base_price', 'cost', 'cost_currency', 'min_qty', 'max_qty', 'qty_options int[]', 'allow_free', 'duplicate_rule', 'allow_cancel', 'allow_verify', 'verify_window_h', 'requires jsonb'], [['category_id', 'service_categories']]),
  T('service_fields', 'B', 'الحقول المخصصة، وتساوي Requires.Custom', ['service_id', 'key', 'label', 'field_type', 'options text[]', 'required', 'regex', 'sort', 'supplier_key'], [['service_id', 'services']]),
  T('service_options', 'B', 'قوائم الموديل والمزود و MEP', ['service_id', 'list', 'value', 'label', 'supplier_value'], [['service_id', 'services']]),
  T('service_group_prices', 'B', 'سعر الخدمة لكل فئة، وفيها سعر Retail للمتجر', ['service_id', 'group_id', 'price'], [['service_id', 'services'], ['group_id', 'client_groups']]),
  T('service_client_prices', 'B', 'سعر متفاوض لتاجر بعينه', ['service_id', 'client_id', 'price', 'note', 'created_by'], [['service_id', 'services'], ['client_id', 'clients'], ['created_by', 'staff_users']]),
  T('pricing_rules', 'B', 'قواعد الهامش والخصم للتسعير الآلي', ['scope', 'target_id', 'group_id', 'kind', 'percent', 'fixed', 'rounding', 'min_profit', 'priority', 'is_active'], [['target_id', 'service_categories', 'poly'], ['target_id', 'services', 'poly'], ['group_id', 'client_groups']]),
  T('inventory_codes', 'B', 'مخزون الأكواد الرقمية', ['service_id', 'code_enc', 'status', 'order_id', 'batch_ref', 'created_by'], [['service_id', 'services'], ['order_id', 'orders'], ['created_by', 'staff_users']]),
  T('tac_catalog', 'B', 'أول 8 أرقام من الـ IMEI (TAC) مع الماركة والموديل؛ للتعرف التلقائي وفحص IMEI وصفحات SEO', ['tac', 'brand', 'model', 'marketing_name', 'release_year', 'source'], [], 'new'),

  // ── C. الموردون ──
  T('suppliers', 'C', 'اتصالات الموردين ورصيدك عندهم', ['name', 'driver', 'base_url', 'username', 'api_key_enc', 'param_format', 'currency', 'credit_rate', 'status', 'balance', 'balance_checked_at', 'low_balance_alert', 'max_concurrency', 'rate_limit_per_min', 'timeout_ms']),
  T('supplier_services', 'C', 'نسخة من خدمات المورد بعد المزامنة', ['supplier_id', 'remote_id', 'remote_group', 'type', 'name', 'credit', 'time', 'requires jsonb', 'custom_fields jsonb', 'raw jsonb', 'is_available', 'last_seen_at', 'price_changed_at'], [['supplier_id', 'suppliers']]),
  T('service_supplier_links', 'C', 'ربط خدمتك بخدمة المورد حسب الأولوية', ['service_id', 'supplier_service_id', 'priority', 'field_map jsonb', 'is_active'], [['service_id', 'services'], ['supplier_service_id', 'supplier_services']]),
  T('supplier_api_logs', 'C', 'سجل كل طلب ورد مع المورد', ['supplier_id', 'order_id', 'action', 'request', 'response', 'http_status', 'duration_ms', 'error'], [['supplier_id', 'suppliers'], ['order_id', 'orders']]),

  // ── D. الطلبات ──
  T('orders', 'D', 'الطلبات؛ id يساوي REFERENCEID. client_id يقبل null لطلبات المتجر (B2C) ويُملأ customer_id بدلاً منه، وأحدهما فقط', ['client_id nullable', 'customer_id', 'service_id', 'type', 'source', 'api_key_id', 'status', 'dispatch_state', 'imei', 'quantity', 'inputs jsonb', 'unit_price', 'total_price', 'unit_cost', 'total_cost', 'currency', 'pricing_snapshot jsonb', 'public_token', 'checkout_session_id', 'tax_amount', 'tax_country', 'supplier_id', 'supplier_service_id', 'supplier_ref', 'result_code', 'result_comment', 'client_note', 'admin_note', 'verification_status', 'idempotency_key', 'fingerprint', 'input_file_id', 'result_file_id', 'placed_at', 'sent_at', 'completed_at'], [['client_id', 'clients'], ['customer_id', 'customers'], ['service_id', 'services'], ['api_key_id', 'api_keys'], ['checkout_session_id', 'checkout_sessions'], ['tax_country', 'tax_rates', 'poly'], ['supplier_id', 'suppliers'], ['supplier_service_id', 'supplier_services'], ['input_file_id', 'files'], ['result_file_id', 'files']], 'mod'),
  T('order_events', 'D', 'سجل الطلب الزمني، إضافة فقط', ['order_id', 'type', 'from_status', 'to_status', 'actor_type', 'actor_id', 'data jsonb', 'created_at'], [['order_id', 'orders'], ['actor_id', 'staff_users', 'poly'], ['actor_id', 'clients', 'poly'], ['actor_id', 'customers', 'poly']], 'mod'),

  // ── E. المال ──
  T('currencies', 'E', 'العملات وأسعار الصرف، مع هامش وتقريب نفسي لعرض المتجر', ['code', 'name', 'rate_to_base', 'rate_updated_at', 'markup_percent', 'charm_rounding', 'is_storefront', 'decimals', 'is_active'], [], 'mod'),
  T('ledger_accounts', 'E', 'الحسابات: محفظة، محجوز، إيراد، وأموال العملاء والضريبة المستحقة', ['kind', 'owner_type', 'owner_id', 'currency', 'balance', 'overdraft_limit', 'version'], [['owner_id', 'clients', 'poly'], ['owner_id', 'suppliers', 'poly'], ['owner_id', 'customers', 'poly'], ['currency', 'currencies']], 'mod'),
  T('ledger_transactions', 'E', 'رأس القيد مع idempotency', ['kind', 'ref_type', 'ref_id', 'memo', 'idempotency_key', 'created_by_type', 'created_by_id'], [['ref_id', 'orders', 'poly'], ['ref_id', 'invoices', 'poly'], ['ref_id', 'refunds', 'poly'], ['ref_id', 'disputes', 'poly'], ['created_by_id', 'staff_users', 'poly']], 'mod'),
  T('ledger_entries', 'E', 'أسطر القيد، ومجموعها صفر', ['transaction_id', 'account_id', 'amount', 'balance_after'], [['transaction_id', 'ledger_transactions'], ['account_id', 'ledger_accounts']]),
  T('invoices', 'E', 'فواتير الشحن والكشوف، وإيصالات B2C الضريبية بنسخة PDF', ['number', 'client_id nullable', 'customer_id', 'order_id', 'kind', 'amount', 'fee', 'net_amount', 'tax_amount', 'tax_rate', 'tax_country', 'customer_vat_id', 'total', 'currency', 'status', 'gateway_id', 'pdf_file_id', 'due_at', 'paid_at'], [['client_id', 'clients'], ['customer_id', 'customers'], ['order_id', 'orders'], ['gateway_id', 'payment_gateways'], ['pdf_file_id', 'files'], ['currency', 'currencies']], 'mod'),
  T('payment_gateways', 'E', 'بوابات الدفع ورسومها وحدودها، مقسّمة حسب الجمهور B2B أو B2C', ['code', 'driver', 'name', 'audience', 'config_enc', 'webhook_secret_enc', 'fee_percent', 'fee_fixed', 'min_amount', 'max_amount', 'allowed_group_ids', 'supports_refunds', 'supports_3ds', 'is_manual', 'instructions', 'hold_hours', 'is_active'], [['allowed_group_ids', 'client_groups', 'array']], 'mod'),
  T('payments', 'E', 'الدفعات وتأكيدها: شحن محفظة أو دفع طلب B2C', ['invoice_id', 'customer_id', 'order_id', 'purpose', 'gateway_id', 'gateway_txn_id', 'amount', 'fee_amount', 'currency', 'status', 'method_type', 'three_ds', 'captured_at', 'receipt_file_id', 'raw jsonb', 'reviewed_by'], [['invoice_id', 'invoices'], ['customer_id', 'customers'], ['order_id', 'orders'], ['gateway_id', 'payment_gateways'], ['receipt_file_id', 'files'], ['reviewed_by', 'staff_users']], 'mod'),
  T('withdrawal_requests', 'E', 'طلبات السحب، لمرحلة لاحقة', ['client_id', 'amount', 'method', 'destination', 'status', 'decided_by', 'decided_at'], [['client_id', 'clients'], ['decided_by', 'staff_users']]),
  T('refunds', 'E', 'المرتجعات: كاملة أو جزئية إلى البطاقة أو المحفظة أو رصيد المتجر', ['payment_id', 'order_id', 'customer_id', 'client_id', 'amount', 'currency', 'reason', 'method', 'status', 'gateway_refund_id', 'requested_by_type', 'requested_by_id', 'approved_by', 'ledger_tx_id', 'completed_at'], [['payment_id', 'payments'], ['order_id', 'orders'], ['customer_id', 'customers'], ['client_id', 'clients'], ['currency', 'currencies'], ['requested_by_id', 'customers', 'poly'], ['requested_by_id', 'staff_users', 'poly'], ['approved_by', 'staff_users'], ['ledger_tx_id', 'ledger_transactions']], 'new'),
  T('disputes', 'E', 'نزاعات chargeback: المهلة وحزمة الأدلة والنتيجة', ['payment_id', 'order_id', 'customer_id', 'gateway_dispute_id', 'reason_code', 'amount', 'currency', 'fee', 'status', 'evidence_due_at', 'evidence_file_ids bigint[]', 'submitted_at', 'resolved_at', 'ledger_tx_id'], [['payment_id', 'payments'], ['order_id', 'orders'], ['customer_id', 'customers'], ['currency', 'currencies'], ['evidence_file_ids', 'files', 'array'], ['ledger_tx_id', 'ledger_transactions']], 'new'),
  T('tax_rates', 'E', 'نسب الضريبة حسب البلد للخدمات الرقمية، ونظام OSS', ['country', 'region', 'rate_percent', 'tax_type', 'applies_to', 'valid_from', 'valid_to', 'label', 'oss_scheme'], [], 'new'),

  // ── F. العمولات ──
  T('commission_plans', 'F', 'خطط الإحالة والكاش باك', ['name', 'kind', 'basis', 'percent', 'tiers jsonb', 'period', 'is_active']),
  T('commission_assignments', 'F', 'ربط الخطة بالتاجر المستفيد', ['plan_id', 'beneficiary_id', 'scope', 'starts_at', 'ends_at'], [['plan_id', 'commission_plans'], ['beneficiary_id', 'clients']]),
  T('commission_accruals', 'F', 'العمولات المستحقة والمصروفة', ['plan_id', 'beneficiary_id', 'order_id', 'period', 'basis_amount', 'percent', 'amount', 'status', 'ledger_tx_id'], [['plan_id', 'commission_plans'], ['beneficiary_id', 'clients'], ['order_id', 'orders'], ['ledger_tx_id', 'ledger_transactions']]),

  // ── G. المنصة ──
  T('settings', 'G', 'إعدادات النظام بصيغة key و value', ['key', 'value jsonb']),
  T('notification_templates', 'G', 'قوالب البريد و Telegram للموظفين والتجار والعملاء', ['event', 'channel', 'audience', 'locale', 'subject', 'body', 'is_active'], [], 'mod'),
  T('notifications', 'G', 'سجل الإشعارات المرسلة', ['recipient_type', 'recipient_id', 'channel', 'event', 'payload', 'status', 'sent_at'], [['recipient_id', 'clients', 'poly'], ['recipient_id', 'staff_users', 'poly'], ['recipient_id', 'customers', 'poly'], ['event', 'notification_templates', 'poly']], 'mod'),
  T('webhook_endpoints', 'G', 'عناوين webhooks لدى التجار', ['client_id', 'url', 'secret_enc', 'events text[]', 'is_active', 'failure_count'], [['client_id', 'clients']]),
  T('webhook_deliveries', 'G', 'محاولات إرسال الـ webhooks', ['endpoint_id', 'event', 'payload', 'attempt', 'status', 'response_code', 'next_retry_at'], [['endpoint_id', 'webhook_endpoints']]),
  T('outbox_events', 'G', 'أحداث تنتظر المعالجة بالـ Worker', ['type', 'aggregate_type', 'aggregate_id', 'payload', 'processed_at', 'attempts'], [['aggregate_id', 'orders', 'poly'], ['aggregate_id', 'invoices', 'poly'], ['aggregate_id', 'checkout_sessions', 'poly']], 'mod'),
  T('audit_logs', 'G', 'سجل التدقيق لعمليات الإدارة', ['actor_type', 'actor_id', 'action', 'entity_type', 'entity_id', 'before', 'after', 'ip'], [['actor_id', 'staff_users', 'poly']]),
  T('files', 'G', 'ملفات S3 وبياناتها', ['bucket', 'key', 'filename', 'mime', 'size', 'sha256', 'owner_type', 'owner_id'], [['owner_id', 'clients', 'poly'], ['owner_id', 'staff_users', 'poly'], ['owner_id', 'customers', 'poly']], 'mod'),

  T('service_checks', 'G', 'نتائج فحوص الصحة الدورية: كل دقيقة يفحص الـ Worker قاعدة البيانات والكاش والتخزين وكل مورد وبوابة دفع ويكتب الحالة وزمن الاستجابة. منها تُحسب نسبة التشغيل ويُكتشف العطل. المقاييس عالية الدقة (الطلبات والـ latency) لا تُخزَّن هنا بل في نظام المراقبة. تُحذف بعد 90 يوماً', ['component', 'supplier_id nullable', 'gateway_id nullable', 'status', 'latency_ms', 'detail jsonb', 'checked_at'], [['supplier_id', 'suppliers'], ['gateway_id', 'payment_gateways']]),
  T('alert_rules', 'G', 'قواعد التنبيه: المقياس والمقارنة والعتبة والمدة والخطورة والقنوات (Telegram أو إيميل). الكتم المؤقت بـ muted_until أثناء الصيانة', ['key', 'name', 'metric', 'comparator', 'threshold', 'window_seconds', 'severity', 'channels text[]', 'is_active', 'muted_until', 'created_by', 'updated_by'], [['created_by', 'staff_users'], ['updated_by', 'staff_users']]),
  T('alert_events', 'G', 'كل انطلاقة لقاعدة: firing ثم acknowledged ثم resolved. تُغلق آلياً عند عودة القيمة لمجالها، ولا تتكرر الرسالة حتى يؤكد الموظف أو تمر مدة التذكير', ['rule_id', 'status', 'severity', 'value', 'subject_type', 'subject_id', 'started_at', 'acknowledged_by', 'acknowledged_at', 'resolved_at', 'note'], [['rule_id', 'alert_rules'], ['subject_id', 'suppliers', 'poly'], ['acknowledged_by', 'staff_users']]),
  T('incidents', 'G', 'حوادث التشغيل: يعلنها موظف أو تُفتح من تنبيه حرج. الخطورة والمكوّنات المتأثرة والخط الزمني (timeline jsonb) والسبب والإجراء عند الإغلاق', ['title', 'severity', 'status', 'components text[]', 'summary', 'timeline jsonb', 'root_cause', 'started_at', 'resolved_at', 'alert_event_id nullable', 'created_by', 'resolved_by'], [['alert_event_id', 'alert_events'], ['created_by', 'staff_users'], ['resolved_by', 'staff_users']]),
  T('job_runs', 'G', 'سجل تشغيل المهام المجدولة والخلفية (مزامنة الأسعار، فحص سلامة الـ ledger، حذف البيانات المنتهية، تذكيرات): البداية والنهاية والنتيجة والخطأ. result يحمل ملخص الفحص، ومنه آخر نتيجة لفحص المال', ['job', 'trigger', 'status', 'started_at', 'finished_at', 'duration_ms', 'processed', 'result jsonb', 'error', 'triggered_by nullable'], [['triggered_by', 'staff_users']]),

  // ── H. المتجر والمحتوى (B2C) ──
  T('service_listings', 'H', 'صفحة الخدمة العامة في المتجر: العنوان والـ slug والـ SEO لكل لغة', ['service_id', 'locale', 'slug', 'public_title', 'summary', 'description_md', 'eta_text', 'requirements_md', 'brand', 'carrier', 'country', 'is_listed', 'is_featured', 'sort', 'seo_title', 'seo_description', 'og_file_id'], [['service_id', 'services'], ['og_file_id', 'files']], 'new'),
  T('content_pages', 'H', 'صفحات الهبوط والصفحات الثابتة والمدونة بعدة لغات', ['kind', 'slug', 'locale', 'title', 'body_md', 'seo_title', 'seo_description', 'canonical_url', 'status', 'published_at', 'author_id', 'template_params jsonb'], [['author_id', 'staff_users']], 'new'),
  T('help_articles', 'H', 'مركز المساعدة والأسئلة الشائعة، ويمكن ربط مقال بخدمة', ['category', 'question', 'answer_md', 'locale', 'service_id', 'sort', 'is_published', 'helpful_yes', 'helpful_no'], [['service_id', 'services']], 'new'),
  T('legal_documents', 'H', 'الشروط والخصوصية والاسترداد والكوكيز بنسخ مؤرشفة', ['type', 'version', 'locale', 'body_md', 'effective_from', 'is_current', 'requires_reacceptance', 'created_by'], [['created_by', 'staff_users']], 'new'),

  // ── I. عملاء المتجر B2C ──
  T('customers', 'I', 'عملاء المتجر: ضيف بالإيميل، أو حساب بكلمة مرور أو رابط دخول. الحالة: active أو suspended (إيقاف مؤقت يُعكس) أو blocked (احتيال) أو anonymized', ['email', 'email_verified_at', 'name', 'phone', 'country', 'locale', 'currency', 'has_account', 'created_by nullable', 'marketing_opt_in', 'risk_level', 'status', 'suspended_at', 'suspended_reason', 'suspended_by', 'internal_notes', 'last_login_at', 'first_order_at', 'total_spent', 'anonymized_at'], [['currency', 'currencies'], ['created_by', 'staff_users'], ['suspended_by', 'staff_users']], 'new'),
  T('customer_credentials', 'I', 'بيانات دخول الحساب منفصلة عن الملف الشخصي: hash فقط. كلمة مرور مؤقتة يضعها موظف تفرض التغيير عند أول دخول، ولا أحد يقرأ الكلمة الحالية', ['customer_id unique', 'password_hash nullable', 'must_change_password', 'password_changed_at', 'failed_attempts', 'locked_until', 'updated_by'], [['customer_id', 'customers'], ['updated_by', 'staff_users']], 'new'),
  T('checkout_sessions', 'I', 'جلسة الدفع قبل أي طلب: السعر والضريبة وسعر الصرف المثبّتة، وبعد الدفع يُنشأ الطلب', ['token', 'customer_id', 'email', 'service_id', 'imei_enc', 'inputs jsonb', 'quantity', 'currency', 'fx_rate', 'net_amount', 'tax_rate', 'tax_amount', 'gross_amount', 'tax_country', 'utm jsonb', 'ip', 'user_agent', 'status', 'expires_at', 'order_id', 'recovery_emailed_at'], [['customer_id', 'customers'], ['service_id', 'services'], ['currency', 'currencies'], ['tax_country', 'tax_rates', 'poly'], ['order_id', 'orders']], 'new'),
  T('consent_records', 'I', 'دليل الموافقات: الشروط والخصوصية والتسويق وتنازل الانسحاب، مع الـ IP والوقت', ['subject_type', 'subject_id', 'legal_document_id', 'purpose', 'granted', 'checkout_session_id', 'order_id', 'ip', 'user_agent'], [['subject_id', 'customers', 'poly'], ['subject_id', 'clients', 'poly'], ['legal_document_id', 'legal_documents'], ['checkout_session_id', 'checkout_sessions'], ['order_id', 'orders']], 'new'),

  // ── J. الدعم ──
  T('support_tickets', 'J', 'تذاكر الدعم من عملاء المتجر والتجار، مرتبطة بطلب مع مهلة SLA', ['number', 'subject', 'channel', 'requester_type', 'requester_id', 'order_id', 'category', 'priority', 'status', 'assignee_id', 'sla_due_at', 'first_response_at', 'resolved_at', 'csat_score'], [['requester_id', 'customers', 'poly'], ['requester_id', 'clients', 'poly'], ['order_id', 'orders'], ['assignee_id', 'staff_users']], 'new'),
  T('ticket_messages', 'J', 'رسائل التذكرة: من العميل أو الموظف أو النظام، وملاحظات داخلية', ['ticket_id', 'author_type', 'author_id', 'body', 'is_internal', 'file_ids bigint[]'], [['ticket_id', 'support_tickets'], ['author_id', 'customers', 'poly'], ['author_id', 'clients', 'poly'], ['author_id', 'staff_users', 'poly'], ['file_ids', 'files', 'array']], 'new'),
  T('reply_templates', 'J', 'قوالب ردود جاهزة للموظفين بحسب الفئة واللغة', ['title', 'category', 'locale', 'body', 'shortcut', 'created_by'], [['created_by', 'staff_users']], 'new'),

  // ── K. المخاطر والامتثال ──
  T('imei_checks', 'K', 'فحوص IMEI: قائمة سوداء وقفل وiCloud، مجانية أو قبل الطلب، مع كاش', ['imei_hash', 'imei_enc', 'tac', 'brand', 'model', 'check_type', 'status', 'result jsonb', 'supplier_id', 'service_id', 'customer_id', 'checkout_session_id', 'source', 'cost', 'price', 'ip', 'cached_until'], [['tac', 'tac_catalog'], ['supplier_id', 'suppliers'], ['service_id', 'services'], ['customer_id', 'customers'], ['checkout_session_id', 'checkout_sessions']], 'new'),
  T('risk_assessments', 'K', 'تقييم مخاطر الجلسة أو الطلب: score وإشارات وقرار allow أو review أو block', ['checkout_session_id', 'order_id', 'customer_id', 'score', 'decision', 'signals jsonb', 'provider', 'reviewed_by', 'reviewed_at', 'outcome'], [['checkout_session_id', 'checkout_sessions'], ['order_id', 'orders'], ['customer_id', 'customers'], ['reviewed_by', 'staff_users']], 'new'),
  T('blocklist_entries', 'K', 'قائمة الحظر: إيميل ودومين وIMEI وبصمة بطاقة وجهاز وبلد. عناوين IP في ip_rules', ['kind', 'value_hash', 'display', 'reason', 'expires_at', 'source', 'created_by'], [['created_by', 'staff_users']], 'new'),
  T('data_requests', 'K', 'طلبات أصحاب البيانات: تصدير أو حذف، بموعد قانوني للإنجاز', ['customer_id', 'kind', 'status', 'requested_at', 'due_at', 'completed_at', 'handled_by', 'file_id'], [['customer_id', 'customers'], ['handled_by', 'staff_users'], ['file_id', 'files']], 'new'),
];
