export interface UserProfile {
    // Identity Information (res.users / res.partner)
    userId: number;
    partnerId: number;
    employeeId?: number; // Might be null if the user has no HR employee record
    
    // Core details
    name: string;
    email: string;
    image1920?: string | null;
    
    // HR Details (hr.employee)
    jobPosition?: string;
    
    // Company/Partner details (res.partner)
    companyName?: string;
    taxId?: string; // vat
    website?: string;
    
    
    // Address (res.partner)
    street?: string;
    city?: string;
    stateId?: { id: number, name: string };
    zip?: string;
    countryId?: { id: number, name: string };
}
