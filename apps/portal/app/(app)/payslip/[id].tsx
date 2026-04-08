import { PayslipDetailScreen } from '@odoo-portal/payslip';
import { useLocalSearchParams } from 'expo-router';

export default function PayslipDetailPage() {
    const { id } = useLocalSearchParams<{ id: string }>();
    return <PayslipDetailScreen payslipId={parseInt(id, 10)} />;
}
