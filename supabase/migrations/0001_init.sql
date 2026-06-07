-- ============================================================================
-- MyForm — סכמה ראשונית
-- מערכת לניהול, שליחה וחתימה של טפסי PDF דיגיטליים.
-- multi-tenant-ready: לכל ישות יש org_id, RLS מסנן לפי הארגון של המשתמש המחובר.
-- ============================================================================

-- ----- Enums -----
create type field_type as enum ('text', 'number', 'date', 'signature', 'initials');
create type submission_status as enum ('pending', 'opened', 'completed', 'expired');

-- ----- organizations -----
create table organizations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);

-- ----- profiles (משתמשי משרד; מקושר ל-auth.users) -----
create table profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  org_id     uuid not null references organizations (id) on delete cascade,
  full_name  text,
  role       text not null default 'admin',
  created_at timestamptz not null default now()
);
create index profiles_org_id_idx on profiles (org_id);

-- ----- forms (תבנית טופס) -----
create table forms (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references organizations (id) on delete cascade,
  name              text not null,
  original_pdf_path text not null,
  page_count        integer not null default 1,
  created_by        uuid references profiles (id) on delete set null,
  created_at        timestamptz not null default now()
);
create index forms_org_id_idx on forms (org_id);

-- ----- form_fields (שדות; קואורדינטות מנורמלות 0..1 יחסית לעמוד) -----
create table form_fields (
  id         uuid primary key default gen_random_uuid(),
  form_id    uuid not null references forms (id) on delete cascade,
  page       integer not null,
  x          double precision not null,
  y          double precision not null,
  width      double precision not null,
  height     double precision not null,
  type       field_type not null,
  label      text not null default '',
  required   boolean not null default false,
  font_size  double precision not null default 12,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index form_fields_form_id_idx on form_fields (form_id);

-- ----- submissions (שליחה ללקוח) -----
create table submissions (
  id                 uuid primary key default gen_random_uuid(),
  form_id            uuid not null references forms (id) on delete cascade,
  org_id             uuid not null references organizations (id) on delete cascade,
  recipient_name     text not null,
  recipient_email    text not null,
  token_hash         text not null unique,
  status             submission_status not null default 'pending',
  expires_at         timestamptz not null,
  sent_at            timestamptz,
  opened_at          timestamptz,
  completed_at       timestamptz,
  completed_pdf_path text,
  created_by         uuid references profiles (id) on delete set null,
  created_at         timestamptz not null default now()
);
create index submissions_org_id_idx on submissions (org_id);
create index submissions_form_id_idx on submissions (form_id);
create index submissions_token_hash_idx on submissions (token_hash);

-- ----- submission_values (ערכים שמולאו) -----
create table submission_values (
  id            uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions (id) on delete cascade,
  field_id      uuid not null references form_fields (id) on delete cascade,
  value         text not null default '',
  created_at    timestamptz not null default now(),
  unique (submission_id, field_id)
);
create index submission_values_submission_id_idx on submission_values (submission_id);

-- ----- signature_audit (תיעוד משפטי של החתימה) -----
create table signature_audit (
  id                   uuid primary key default gen_random_uuid(),
  submission_id        uuid not null references submissions (id) on delete cascade,
  signer_ip            text,
  user_agent           text,
  signed_at            timestamptz not null default now(),
  doc_sha256           text not null,
  signature_image_path text
);
create index signature_audit_submission_id_idx on signature_audit (submission_id);

-- ============================================================================
-- פונקציית עזר: org_id של המשתמש המחובר (לשימוש ב-RLS).
-- SECURITY DEFINER כדי לא להיכנס לרקורסיית RLS על profiles.
-- ============================================================================
create or replace function auth_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from profiles where id = auth.uid();
$$;

-- ============================================================================
-- RLS
-- מנהלים (משתמשים מחוברים) רואים/עורכים רק נתונים של הארגון שלהם.
-- זרימת הלקוח הציבורית עוברת דרך service role בצד שרת ועוקפת RLS.
-- ============================================================================
alter table organizations    enable row level security;
alter table profiles          enable row level security;
alter table forms             enable row level security;
alter table form_fields       enable row level security;
alter table submissions       enable row level security;
alter table submission_values enable row level security;
alter table signature_audit   enable row level security;

-- organizations: קריאה של הארגון שלך בלבד
create policy org_select on organizations
  for select using (id = auth_org_id());

-- profiles: קריאה של פרופילים באותו ארגון; עדכון של עצמך
create policy profiles_select on profiles
  for select using (org_id = auth_org_id());
create policy profiles_update_self on profiles
  for update using (id = auth.uid());

-- forms: כל הפעולות מוגבלות לארגון שלך
create policy forms_all on forms
  for all using (org_id = auth_org_id()) with check (org_id = auth_org_id());

-- form_fields: דרך ה-form המקושר
create policy form_fields_all on form_fields
  for all using (
    exists (select 1 from forms f where f.id = form_fields.form_id and f.org_id = auth_org_id())
  )
  with check (
    exists (select 1 from forms f where f.id = form_fields.form_id and f.org_id = auth_org_id())
  );

-- submissions: לארגון שלך
create policy submissions_all on submissions
  for all using (org_id = auth_org_id()) with check (org_id = auth_org_id());

-- submission_values: דרך ה-submission המקושר
create policy submission_values_all on submission_values
  for all using (
    exists (select 1 from submissions s where s.id = submission_values.submission_id and s.org_id = auth_org_id())
  )
  with check (
    exists (select 1 from submissions s where s.id = submission_values.submission_id and s.org_id = auth_org_id())
  );

-- signature_audit: קריאה בלבד למנהל (כתיבה דרך service role)
create policy signature_audit_select on signature_audit
  for select using (
    exists (select 1 from submissions s where s.id = signature_audit.submission_id and s.org_id = auth_org_id())
  );

-- ============================================================================
-- Storage buckets (private). גישה דרך signed URLs / service role בלבד.
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('originals', 'originals', false),
       ('completed', 'completed', false),
       ('signatures', 'signatures', false)
on conflict (id) do nothing;

-- אין policies ציבוריות על ה-buckets: כל הגישה לקבצים עוברת דרך הקוד בצד שרת
-- (service role) שמפיק signed URLs לאחר בדיקת הרשאה.
