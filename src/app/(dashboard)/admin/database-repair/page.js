import DatabaseRepair from '@/components/admin/DatabaseRepair';
import AdminOnly from '@/components/auth/AdminOnly';

export const metadata = {
  title: 'Database Repair - Admin Dashboard',
  description: 'Repair and maintain database integrity'
};

export default function DatabaseRepairPage() {
  return (
    <AdminOnly>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Database Maintenance</h1>
        
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6" role="alert">
          <p className="font-bold">Caution</p>
          <p>This utility allows administrators to repair database issues with audit logs and attachments. Use with care.</p>
        </div>
        
        <DatabaseRepair />
      </div>
    </AdminOnly>
  );
} 