export interface Payslip {
    id: number;
    name: string;
    employeeId: { id: number; name: string } | null;
    companyId: { id: number; name: string } | null;
    dateFrom: string;
    dateTo: string;
    state: 'draft' | 'verify' | 'done' | 'cancel';
}

export interface PayslipLine {
    id: number;
    name: string;
    code: string;
    categoryId: { id: number; name: string } | null;
    sequence?: number;
    quantity?: number;
    rate?: number;
    amount?: number;
    total: number;
    slipId: { id: number; name: string } | null;
}

export interface Company {
    id: number;
    name: string;
    vat: string | null;
    email: string | null;
    street: string | null;
    city: string | null;
    stateId: { id: number; name: string } | null;
    zip: string | null;
}
