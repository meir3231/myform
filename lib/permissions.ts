// תפקידי משתמשים ב-MyForm (Phase 9 - הרשאות ותפקידים).
//
// admin: מנהל מערכת - היחיד שיכול לנהל משתמשים (להוסיף/להסיר/לשנות תפקיד).
// lawyer / secretary: הרשאות מלאות לעבודה היומיומית (תבניות, שליחה, הגשות),
// פרט לניהול משתמשים - מקבילים ל-"member" הישן.
// viewer: צופה-בלבד - גישת קריאה בלבד, ללא יצירה/עריכה/שליחה/מחיקה.
export type Role = "admin" | "lawyer" | "secretary" | "viewer";

export const ROLES: Role[] = ["admin", "lawyer", "secretary", "viewer"];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "מנהל",
  lawyer: "עו\"ד-מקצועי",
  secretary: "מזכירות-תפעול",
  viewer: "צופה-בלבד",
};

export function roleLabel(role: string): string {
  return ROLE_LABELS[role as Role] ?? role;
}

export function isRole(value: string): value is Role {
  return (ROLES as string[]).includes(value);
}

export function isAdmin(role: string): boolean {
  return role === "admin";
}

// צופה-בלבד: גישת קריאה בלבד - אסור ליצור/לערוך/לשלוח/למחוק כל ישות.
export function canEdit(role: string): boolean {
  return role !== "viewer";
}

// הגנת-עומק ל-server actions: זורק שגיאה אם המשתמש הוא צופה-בלבד.
export function assertCanEdit(role: string): void {
  if (!canEdit(role)) throw new Error("צופה-בלבד: אין הרשאה לפעולה זו");
}
