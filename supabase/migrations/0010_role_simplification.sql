-- Phase 9 follow-up: פישוט תפקידים מ-4 ל-3, גנרי ולא ספציפי למשרד עו"ד.
-- lawyer / secretary (הרשאות מלאות פרט לניהול משתמשים) מתאחדים לתפקיד אחד: editor (עורך).
update profiles set role = 'editor' where role in ('lawyer', 'secretary');

alter table profiles drop constraint profiles_role_check;

alter table profiles
  add constraint profiles_role_check
  check (role in ('admin', 'editor', 'viewer'));
