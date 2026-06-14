-- מוסיף אפשרות "מילוי אוטומטי של תאריך היום" לשדות מסוג תאריך.
alter table form_fields
  add column auto_fill_today boolean not null default false;
