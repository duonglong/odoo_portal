# Odoo Leave Management Integration Plan

This document outlines the technical plan to implement the Leave Management feature, including the new `LeaveRequestListScreen` (from `screen_designs/leave_request_list.html`) and the existing `LeaveRequestScreen` (creation form), fully integrated with the Odoo backend.

## 1. UI Screens & Components

### 1.1 `LeaveRequestListScreen.tsx` (Overview & List)
The main dashboard for leave management based on the provided HTML design.
- **Header Actions**: Search input and "New Request" button.
- **Balance Cards**: Displays visual summaries for "Paid Time Off", "Sick Leave", and "Unpaid Leave" balances with progress bars. Data is fetched via `useLeaveBalances()`.
- **Filters**: Year selector and Status tabs (All Requests, Approved, Pending, Draft).
- **Requests Table**: Displays the employee's historical and upcoming leave requests (Type, Description, Dates, Duration, Status, Actions). Adapts to smaller screens using NativeWind container queries or flex layouts.

### 1.2 `LeaveRequestScreen.tsx` (Creation Form)
The form to submit new requests.
- **Leave Type Picker**: Dropdown populated by `useLeaveTypes()`.
- **Date Range Picker**: Start and end dates.
- **Description / Reason**: Text input.
- **Who's Out Section**: Shows team members absent during the selected dates via `useTeamLeaves()`.

## 2. Odoo Models Involved
- `hr.leave`: The core model for leave requests. Used to fetch the user's requests for the list view, fetch team leaves, and create new requests.
- `hr.leave.type`: Defines the categories of leave (e.g., Paid Time Off, Sick Leave).
- `hr.leave.allocation` / `hr.leave.report`: Used to calculate the employee's current leave balances for the Balance Cards (total allocated vs. used).

## 3. Types Package (`@odoo-portal/types`)
Update `packages/types/src/attendance.ts` (or create `leave.ts`) with:

```typescript
export interface LeaveType {
    id: number;
    name: string;
}

export interface LeaveAllocation {
    id: number;
    holiday_status_id: [number, string]; // e.g. [1, "Paid Time Off"]
    max_leaves: number; // Total days
    leaves_taken: number; // Used days
}

export interface Leave {
    id: number;
    employee_id: [number, string];
    holiday_status_id: [number, string]; // Leave Type
    request_date_from: string;
    request_date_to: string;
    number_of_days: number; // Duration
    state: 'draft' | 'confirm' | 'refuse' | 'validate1' | 'validate';
    name: string; // Description
}
```

## 4. Odoo Client Repository (`@odoo-portal/odoo-client`)
Create a `LeaveRepository` (`packages/odoo-client/src/repositories/LeaveRepository.ts`) with:

- `getLeaveTypes()`: Fetch active `hr.leave.type` records.
- `getMyBalances(employeeId: number)`: Fetch `hr.leave.allocation` to calculate available and used days for the Balance Cards.
- `getMyLeaveRequests(employeeId: number, filters?: LeaveFilters)`: Fetch `hr.leave` for the logged-in user to populate the Requests Table, safely paginated and filtered by status and year.
- `getTeamUpcomingLeaves(departmentId: number)`: Fetch approved `hr.leave` records for team members to display in the "Who's Out" section of the form.
- `createLeaveRequest(data)`: Perform a `create` RPC call on `hr.leave`.

## 5. Attendance Module Hooks (`@odoo-portal/attendance`)
Provide React Query hooks in `modules/attendance/src/hooks/useLeave.ts`:

- `useLeaveTypes()`: Wraps `LeaveRepository.getLeaveTypes`.
- `useLeaveBalances()`: Wraps `LeaveRepository.getMyBalances`.
- `useMyLeaveRequests(filters)`: Wraps `LeaveRepository.getMyLeaveRequests`, supporting status tabs and pagination.
- `useTeamLeaves()`: Wraps `LeaveRepository.getTeamUpcomingLeaves`.
- `useCreateLeave()`: `useMutation` that handles calling `LeaveRepository.createLeaveRequest()`, showing a success/error toast, and invalidating `myLeaveRequests` and `leaveBalances` queries.

## 6. Implementation Phasing
1. **Repository & Hooks**: Implement `LeaveRepository.getMyLeaveRequests` and `useMyLeaveRequests` to support reading the data.
2. **Balance Cards UI**: Build the responsive `LeaveBalanceCards` component and wire it to `useLeaveBalances`.
3. **List Screen UI**: Build `LeaveRequestListScreen.tsx` with the status tabs, table layout (or card layout for mobile), and link it to `useMyLeaveRequests`.
4. **Navigation**: Update Expo Routing to handle defaults and navigation between `LeaveRequestListScreen` (overview) and `LeaveRequestScreen` (new request form).
