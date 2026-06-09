-- תיקון אבטחה: מניעת הסלמת הרשאות בפרופיל המשתמש.
-- הפוליסי הישן אפשר למשתמש לשנות את org_id ו-role שלו לכל ערך.
-- הפוליסי החדש מאפשר עדכון עצמי אך מונע שינוי של org_id ו-role.

drop policy if exists profiles_update_self on profiles;

create policy profiles_update_self on profiles
  for update
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and org_id = (select org_id from profiles where id = auth.uid())
    and role   = (select role   from profiles where id = auth.uid())
  );
