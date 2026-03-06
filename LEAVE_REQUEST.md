# Odoo Leave Request Integration Plan

This document outlines the technical plan to integrate the new `LeaveRequestScreen` with the realtime Odoo backend.

## 1. Odoo Models Involved
To fully implement the UI, we need to interact with the following Odoo models:
- `hr.leave`: The core model for leave requests. We will create new records here and fetch upcoming leaves for the "Who's Out" section.
- `hr.leave.type`: Defines the categories of leave (e.g., Paid Time Off, Sick Leave). Used to populate the dropdown.
- `hr.leave.allocation` / `hr.leave.report`: Used to calculate the employee's current leave balances (total allocated vs. used).

## 2. Types Package (`@odoo-portal/types`)
Update `packages/types/src/attendance.ts` (or create a new `leave.ts` file) to include interfaces:

```typescript
export interface LeaveType {
    id: number;
    name: string;
    // other fields like color, requires_allocation, etc.
}

export interface LeaveAllocation {
    id: number;
    holiday_status_id: [number, string];
    max_leaves: number;
    leaves_taken: number;
    // Remaining = max_leaves - leaves_taken
}

export interface Leave {
    id: number;
    employee_id: [number, string];
    holiday_status_id: [number, string];
    request_date_from: string;
    request_date_to: string;
    state: 'draft' | 'confirm' | 'refuse' | 'validate1' | 'validate';
    name: string; // Description
}
```

## 3. Odoo Client Repository (`@odoo-portal/odoo-client`)
Create a new `LeaveRepository` (e.g., `packages/odoo-client/src/repositories/LeaveRepository.ts`) with the following methods:

- `getLeaveTypes()`: Fetch active `hr.leave.type` records.
- `getMyBalances(employeeId: number)`: Fetch `hr.leave.allocation` grouped/summarized for the the user to display progress bars (Remaining / Total).
- `getTeamUpcomingLeaves(departmentId: number)`: Fetch `hr.leave` where `state` is 'confirm' or 'validate' and dates overlap with the current/upcoming week, filtered by the user's department/team.
- `createLeaveRequest(data)`: Perform a `create` RPC call on `hr.leave` with the selected type, dates, and description.

## 4. Attendance Module Hooks (`@odoo-portal/attendance`)
Create new custom hooks in `modules/attendance/src/hooks/useLeave.ts` wrapping React Query:

- `useLeaveTypes()`: `useQuery` mapped to `LeaveRepository.getLeaveTypes`.
- `useLeaveBalances()`: `useQuery` mapped to `LeaveRepository.getMyBalances`.
- `useTeamLeaves()`: `useQuery` mapped to `LeaveRepository.getTeamUpcomingLeaves`.
- `useCreateLeave()`: `useMutation` that handles calling `LeaveRepository.createLeaveRequest()`, showing a success/error toast via `useOdooErrorToast`, and invalidating relevant queries upon success.

## 5. UI Integration (`LeaveRequestScreen.tsx`)
Map the newly created hooks to the static UI components:

1. **Leave Balances Card**: Replace the hardcoded "12/20 days" with data from `useLeaveBalances()`. Show a loading skeleton while fetching.
2. **Who's Out Card**: Replace the static avatars and names with data mapped from `useTeamLeaves()`.
3. **Leave Form**:
    - Populate the "Leave Type" picker using data from `useLeaveTypes()`.
    - Local state `startDate`, `endDate`, `description`, `leaveTypeId`.
    - On "Submit Request" click:
        - Validate form (dates are valid, type is selected).
        - Trigger the `useCreateLeave` mutation.
        - Handle loading state on the button (`isDisabled`, `isLoading`).
        - Reset the form or navigate back upon successful submission.

## Conclusion
This phased approach maintains the modular architecture of the codebase, ensuring data logic is kept out of the presentation layer, and relies heavily on structured RPC interactions and React Query for state management.
