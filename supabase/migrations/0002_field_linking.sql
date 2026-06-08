-- שיוך שדה למקור-העתקה: כשהלקוח ממלא שדה "מקור", שדות שמצביעים אליו
-- (copy_from_field_id) מתמלאים אוטומטית באותו ערך בדף המילוי.
-- on delete set null: מחיקת שדה המקור משחררת את השדות שהיו מקושרים אליו
-- במקום לחסום את המחיקה.
alter table form_fields
  add column copy_from_field_id uuid references form_fields (id) on delete set null;

create index form_fields_copy_from_idx on form_fields (copy_from_field_id);
