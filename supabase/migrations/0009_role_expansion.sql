-- Phase 9: הרחבת תפקידי משתמשים מ-admin/member ל-4 תפקידים:
-- admin (מנהל) / lawyer (עו"ד-מקצועי) / secretary (מזכירות-תפעול) / viewer (צופה-בלבד).
-- 'member' הישן (הרשאות מלאות פרט לניהול משתמשים) הופך ל-'lawyer'.
update profiles set role = 'lawyer' where role = 'member';

alter table profiles
  add constraint profiles_role_check
  check (role in ('admin', 'lawyer', 'secretary', 'viewer'));
