// ============================================================
//  CENTRALIZED API ENDPOINTS
//  -----------------------------------------------------------
//  All backend API route strings live here.
//  Never hardcode a URL path in a component — import from here.
//
//  Usage:
//    import { API } from "@/lib/endpoints";
//    apiClient.get(API.ATTENDANCE.SUMMARY, { params: ... });
//    apiClient.post(API.AUTH.LOGIN, { email, password });
//
//  For dynamic routes with IDs, use the helper functions:
//    apiClient.patch(API.PROFILES.BY_ID(id), data);
// ============================================================

export const API = {

  // ── Authentication ───────────────────────────────────────
  AUTH: {
    LOGIN:          "/auth/login",
    REGISTER:       "/auth/register",
    ME:             "/auth/me",
    RESET_PASSWORD: "/auth/reset-password",
  },

  // ── Profiles ─────────────────────────────────────────────
  PROFILES: {
    LIST:           "/profiles",
    ME:             "/profiles/me",
    BY_ID:          (id: string) => `/profiles/${id}`,
    BULK_UPDATE:    "/profiles/bulk-update",
    UPDATE_THEME:   "/profiles/update-theme",

    // Departments
    DEPARTMENTS:    "/profiles/departments",
    DEPARTMENT_BY_ID: (id: string) => `/profiles/departments/${id}`,

    // Shifts
    SHIFTS:         "/profiles/shifts",
    SHIFT_BY_ID:    (id: string) => `/profiles/shifts/${id}`,
  },

  // ── Attendance ───────────────────────────────────────────
  ATTENDANCE: {
    SUMMARY:        "/attendance/summary",
    RECENT:         "/attendance/recent",
    MY_PUNCHES:     "/attendance/my-punches",
    PUNCH:          "/attendance/punch",
    REPROCESS:      "/attendance/reprocess",
    DELETE_PUNCHES: "/attendance/delete-punches",
  },

  // ── Leaves ───────────────────────────────────────────────
  LEAVES: {
    LIST:           "/leaves",
    APPLY:          "/leaves/apply",
    STATUS_BY_ID:   (id: string) => `/leaves/${id}/status`,
    BALANCES:       "/leaves/balances",
    BALANCES_ALL:   "/leaves/balances/all",
    BALANCES_SYNC:  "/leaves/balances/sync",
  },

  // ── Payroll ──────────────────────────────────────────────
  PAYROLL: {
    LIST:           "/payroll",
    BY_ID:          (id: string) => `/payroll/${id}`,
    CREATE:         "/payroll",
    GENERATE:       "/payroll/generate",
    RELEASE_ALL:    "/payroll/release-all",
    CALCULATE_DAYS: "/payroll/calculate-days",
  },

  // ── Loans ────────────────────────────────────────────────
  LOANS: {
    LIST:           "/loans",
    CREATE:         "/loans",
    STATUS_BY_ID:   (id: string) => `/loans/${id}/status`,
  },

  // ── Holidays ─────────────────────────────────────────────
  HOLIDAYS: {
    BY_YEAR:        (year: number | string) => `/holidays?year=${year}`,
    CREATE:         "/holidays",
    UPLOAD_PDF:     (year: number | string) => `/holidays/upload-pdf?year=${year}`,
    DOWNLOAD:       (year: number | string) => `/holidays/download/${year}`,
  },

  // ── Dashboard ────────────────────────────────────────────
  DASHBOARD: {
    ADMIN_STATS:    "/dashboard/admin/stats",
    ADMIN_LEAVE:    "/dashboard/admin/leave",
    EMPLOYEE:       "/dashboard/employee",
    BIRTHDAYS:      "/dashboard/birthdays",
    ANNIVERSARIES:  "/dashboard/anniversaries",
  },

  // ── Settings ─────────────────────────────────────────────
  SETTINGS: {
    GET:            "/settings",
    UPDATE:         "/settings",
    UPLOAD_LOGO:    "/settings/logo",
  },

  // ── Role Permissions ─────────────────────────────────────
  ROLE_PERMISSIONS: {
    LIST:           "/role-permissions",
    UPDATE:         "/role-permissions",
  },

  // ── Onboarding ───────────────────────────────────────────
  ONBOARDING: {
    DASHBOARD:      "/onboarding/dashboard",
    DOCUMENTS:      (requestId: string) => `/onboarding/documents/${requestId}`,
    VERIFY:         "/onboarding/verify",
  },

} as const;
