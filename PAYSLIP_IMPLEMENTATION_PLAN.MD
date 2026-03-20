# Payslip Data Integration Plan

This plan outlines the required steps to fetch detailed Payslip implementation data (earnings, deductions, and employer information) and accurately render it in the `PayslipDetailScreen.tsx` using the `@odoo-portal/core` package.

## Goal
Currently, `PayslipDetailScreen.tsx` uses mock data for earnings, deductions, and company information. We need to replace this mock data with live information directly from Odoo (`hr.payslip.line` and `res.company`).

## Odoo Data Model Context
To display the detailed payslip on the screen, the following Odoo models and fields need to be handled:
1. **`hr.payslip`**: The core payslip record (we currently fetch `id`, `name`, `employee_id`, `date_from`, `date_to`, `net_wage`, `state`).
2. **`hr.payslip.line`**: Contains the individual line items of the payslip representing Earnings, Deductions, Gross, Net, etc.
3. **`res.company`**: The company that employs the user (used for "Employer" section: Tax ID, Name, Address, Contact Email).

## Step-by-Step Implementation

### Phase 1: Update Data Typology and Schema Mappings
1. **Define `PayslipLine` Type**:
   In `modules/payslip/src/types.ts`, define an interface for a single payslip line containing fields:
   - `id: number`
   - `name: string` (e.g., "Basic Salary")
   - `code: string` (e.g., "BASIC", "GROSS", "NET")
   - `category_id: { id: number, name: string }` (e.g., "Earnings", "Deductions")
   - `total: number` (the amount for the line item)

2. **Define `Company` Type**:
   Add a type definition for the company information, e.g.:
   - `id: number`
   - `name: string`
   - `vat: string` (Tax ID)
   - `email: string`
   - `street`, `city`, `state_id`, `zip`

3. **Update `mappings.ts`**:
   - Add mappings for `hr.payslip.line` fields (`id`, `name`, `code`, `category_id`, `total`).
   - Modify the `hr.payslip` schema mapper to pull `line_ids` (an array of associated `hr.payslip.line` IDs).
   - Add mappings for `res.company`.

### Phase 2: Extend the Repository Data Fetcher
In `modules/payslip/src/repository.ts`, add service methods to perform the RPC connections:
1. **`getPayslipLines`**:
   - Signature: `async getPayslipLines(lineIds: number[]): Promise<PayslipLine[]>`
   - Query `hr.payslip.line` given the specific `line_ids` attached to the payslip.
   
2. **`getCompanyDetails`**:
   - Signature: `async getCompanyDetails(companyId: number): Promise<Company>`
   - Alternatively, fetch the company details attached to the user's `employee_id.company_id`.

### Phase 3: Enhance React Query Hooks
In `modules/payslip/src/hooks.ts`, expose corresponding React Query wrappers:
1. **`usePayslipLines`**:
   Fetch `hr.payslip.line` items, separating them out by Earnings (`category_code = 'ALW'`) vs Deductions (`category_code = 'DED'`).
   
2. **`useCompany`**:
   Fetch the employer details to populate the `res.company` records.

### Phase 4: Data Integration on `PayslipDetailScreen.tsx`
1. Pass the exact payslip object down.
2. Replace `dummyEarnings` with `PayslipLine` instances filtered correctly (e.g., category 'Earnings' / 'ALW').
3. Replace `dummyDeductions` with `PayslipLine` instances filtered correctly (e.g., category 'Deductions' / 'DED').
4. Replace hardcoded "Orbit Dynamics Corp." and addresses with the `useCompany` output for the user's mapped company.
5. Add appropriate loading indicators (<ActivityIndicator>) while all queries cascade correctly.

## Verification
- Test connecting as a typical Odoo Employee portal user.
- Verify `net_wage` accurately matches `Total Gross - Total Deductions` visually.
- Verify API rate-limiting via React Query `staleTime` defaults to minimize RPC payloads.
