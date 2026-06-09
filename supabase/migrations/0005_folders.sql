-- ============================================================================
-- תיקיות לתבניות: כל ארגון יכול ליצור תיקיות ולארגן בהן טפסים.
-- parent_id מאפשר היררכיה (אך ה-UI הראשוני מציג רק רמה אחת).
-- ============================================================================

create table folders (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references organizations(id) on delete cascade,
  name       text not null check (char_length(trim(name)) between 1 and 100),
  parent_id  uuid references folders(id) on delete cascade,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index folders_org_id_idx    on folders(org_id);
create index folders_parent_id_idx on folders(parent_id);

-- קישור טפסים לתיקיות
alter table forms
  add column folder_id uuid references folders(id) on delete set null;

-- RLS: תיקיות רק בתוך הארגון שלך
alter table folders enable row level security;

create policy folders_all on folders
  for all
  using     (org_id = auth_org_id())
  with check(org_id = auth_org_id());
