-- Phase 12: יומן ביקורת ברמת הגשה - מי שלח/למי/מתי/ערוץ/נפתח/נחתם/בוטל.
create type audit_event_type as enum (
  'sent', 'resent', 'opened', 'completed', 'link_cancelled', 'expired'
);

create table submission_audit_log (
  id            uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions (id) on delete cascade,
  org_id        uuid not null references organizations (id) on delete cascade,
  event_type    audit_event_type not null,
  channel       text,
  actor_id      uuid references profiles (id) on delete set null,
  ip_address    text,
  user_agent    text,
  created_at    timestamptz not null default now()
);
create index submission_audit_log_submission_id_idx on submission_audit_log (submission_id);
create index submission_audit_log_org_id_idx on submission_audit_log (org_id);

alter table submission_audit_log enable row level security;

-- קריאה למנהלים של הארגון בלבד; כתיבה רק דרך service role (admin client).
create policy submission_audit_log_select on submission_audit_log
  for select using (org_id = auth_org_id());
