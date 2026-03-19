export interface Payslip {
    id: number;
    name: string;
    employeeId: { id: number; name: string } | null;
    dateFrom: string;
    dateTo: string;
    state: 'draft' | 'verify' | 'done' | 'cancel';
    netWage: number;
}
