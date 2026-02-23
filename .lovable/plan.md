

## Fix Late Minutes Display Format in Attendance Records

The "Late (mins)" column on the Attendance Records page currently shows raw numbers (e.g., `90`) instead of the `HH.MM` format (e.g., `01.30`). This needs to be fixed in three places within `src/pages/Attendance.tsx`:

### Changes

**File: `src/pages/Attendance.tsx`**

1. Add a `formatLateMinutes` helper function (same one already used in `EmployeeDailyDetails.tsx`):
   ```typescript
   function formatLateMinutes(mins: number | null) {
     if (!mins || mins <= 0) return "00.00";
     const h = Math.floor(mins / 60);
     const m = mins % 60;
     return `${String(h).padStart(2, "0")}.${String(m).padStart(2, "0")}`;
   }
   ```

2. Update the table cell rendering (line 416) from `{s.late_minutes || 0}` to `{formatLateMinutes(s.late_minutes)}`

3. Update the CSV export (line 270) from `s.late_minutes || 0` to `formatLateMinutes(s.late_minutes)`

4. Update the PDF export (line 305) from `s.late_minutes || 0` to `formatLateMinutes(s.late_minutes)`

### Technical Details

- The `formatLateMinutes` function converts raw minutes into `HH.MM` format (e.g., 90 minutes becomes `01.30`, 0 becomes `00.00`)
- No database or backend changes are needed -- this is purely a frontend display fix
- The same formatter is already used in the `EmployeeDailyDetails` dialog, so this brings consistency across the app

