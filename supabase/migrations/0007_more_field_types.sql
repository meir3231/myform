-- ============================================================================
-- הוספת סוגי שדות עתידיים (אימייל, טלפון, רשימה נפתחת, קובץ) ל-enum הקיים.
-- מוקדם בכוונה (Phase 5.0) - ה-UI/הטיפוסים המתאימים יתווספו ב-Phase 5.2.
-- ============================================================================

alter type field_type add value 'email';
alter type field_type add value 'phone';
alter type field_type add value 'dropdown';
alter type field_type add value 'file';
