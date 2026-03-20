// ============================================================
//  CENTRALIZED MODULE VISIBILITY CONTROLLER
//  -----------------------------------------------------------
//  Set a module to `true`  → it shows for users who have access
//  Set a module to `false` → it is completely hidden from all users
//                            (sidebar link + route both blocked)
// ============================================================

export interface ModuleConfig {
  /** Whether the module is live and visible to eligible users */
  enabled: boolean;
  /** Human-readable label (for reference only) */
  label: string;
}

/** Master module registry — flip `enabled` to show/hide any module */
export const MODULE_CONFIG: Record<string, ModuleConfig> = {
  // ── Core ──────────────────────────────────────────────────
  dashboard:          { enabled: true,  label: "Dashboard" },
  attendance:         { enabled: true,  label: "Attendance" },
  leave_requests:     { enabled: true,  label: "Leave Requests" },

  // ── Management ────────────────────────────────────────────
  employees:          { enabled: true,  label: "Employees" },
  departments:        { enabled: true,  label: "Departments" },
  shifts:             { enabled: true,  label: "Shifts" },
  holidays:           { enabled: true,  label: "Holidays" },

  // ── Financial ─────────────────────────────────────────────
  payroll:            { enabled: true,  label: "Payroll" },
  loans:              { enabled: true,  label: "Loans" },
  my_payslips:        { enabled: true,  label: "My Payslips" },

  // ── Reports ───────────────────────────────────────────────
  attendance_summary: { enabled: true,  label: "Attendance Summary" },
  attendance_reset:   { enabled: true,  label: "Attendance Reset" },

  // ── Profile & Onboarding ──────────────────────────────────
  my_profile:         { enabled: true,  label: "My Profile" },
  onboarding:         { enabled: true,  label: "Onboarding" },

  // ── Administration ─────────────────────────────────────────
  company_branding:   { enabled: true,  label: "Company Branding" },
  role_permissions:   { enabled: true,  label: "Role Permissions" },
  menu_order:         { enabled: true,  label: "Menu Order" },
};

/**
 * Returns true if the module is active/live.
 * Use this anywhere in the codebase to gate a module.
 *
 * @example
 *   if (!isModuleLive("payroll")) return <Navigate to="/" />;
 */
export function isModuleLive(moduleKey: string): boolean {
  return MODULE_CONFIG[moduleKey]?.enabled ?? false;
}
