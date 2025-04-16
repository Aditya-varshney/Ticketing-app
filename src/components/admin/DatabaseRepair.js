import { useState } from 'react';

const DatabaseRepair = () => {
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [message, setMessage] = useState('');
  const [logs, setLogs] = useState([]);
  const [dbInfo, setDbInfo] = useState(null);

  const addLog = (text) => {
    setLogs(prev => [...prev, `[${new Date().toISOString()}] ${text}`]);
  };

  const checkDatabaseStatus = async () => {
    try {
      setStatus('loading');
      addLog('Checking database status...');

      const response = await fetch('/api/debug/audit-logs?schema=true');
      const data = await response.json();
      
      setDbInfo(data);
      
      if (data.error) {
        addLog(`⚠️ Database error: ${data.error.message}`);
        setStatus('error');
        setMessage(`Database connection error: ${data.error.message}`);
        return;
      }
      
      addLog(`✅ Connected to database ${data.database.name} as ${data.database.user}`);
      
      // Check if audit_logs table exists
      const hasAuditTable = data.schema?.tables?.includes('audit_logs');
      if (!hasAuditTable) {
        addLog('⚠️ audit_logs table not found in database');
        setStatus('error');
        setMessage('audit_logs table is missing. Please run the database repair.');
        return;
      }
      
      addLog('✅ audit_logs table exists');
      
      // Check for required columns
      const columns = data.schema?.auditLogsColumns || [];
      const columnNames = columns.map(c => c.Field);
      
      const hasPreviousValue = columnNames.includes('previous_value');
      const hasNewValue = columnNames.includes('new_value');
      
      if (!hasPreviousValue || !hasNewValue) {
        addLog('⚠️ previous_value or new_value columns are missing from audit_logs table');
        setStatus('error');
        setMessage('Required columns are missing. Please run the database repair.');
        return;
      }
      
      addLog('✅ Required columns exist in audit_logs table');
      setStatus('success');
      setMessage('Database schema looks good! No repairs needed.');
      
    } catch (error) {
      addLog(`❌ Error: ${error.message}`);
      setStatus('error');
      setMessage(`Failed to check database: ${error.message}`);
    }
  };

  const repairDatabase = async () => {
    try {
      setStatus('loading');
      addLog('Starting database repair...');
      
      // Create uploads directory
      addLog('Creating uploads directory if needed...');
      await fetch('/api/debug/create-directory?path=public/uploads', { method: 'POST' });
      
      // Attempt to create/update audit_logs table
      addLog('Attempting to repair audit_logs table...');
      const response = await fetch('/api/admin/repair-database', { method: 'POST' });
      const data = await response.json();
      
      if (!response.ok) {
        addLog(`❌ Repair failed: ${data.error}`);
        setStatus('error');
        setMessage(`Repair failed: ${data.error}`);
        return;
      }
      
      addLog(`✅ Repair result: ${data.message}`);
      
      // Check status after repair
      await checkDatabaseStatus();
      
    } catch (error) {
      addLog(`❌ Error: ${error.message}`);
      setStatus('error');
      setMessage(`Failed to repair database: ${error.message}`);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Database Repair Utility</h2>
      
      <div className="space-y-4">
        <div className="flex space-x-4">
          <button
            onClick={checkDatabaseStatus}
            disabled={status === 'loading'}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded disabled:opacity-50"
          >
            Check Database Status
          </button>
          
          <button
            onClick={repairDatabase}
            disabled={status === 'loading'}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded disabled:opacity-50"
          >
            Repair Database
          </button>
        </div>
        
        {/* Status message */}
        {message && (
          <div className={`p-3 rounded ${
            status === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : 
            status === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
            'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
          }`}>
            {message}
          </div>
        )}
        
        {/* Log output */}
        <div className="mt-4">
          <h3 className="text-md font-medium mb-2">Operation Log</h3>
          <div className="bg-gray-100 dark:bg-gray-900 rounded p-3 h-64 overflow-y-auto font-mono text-sm">
            {logs.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No operations performed yet. Click "Check Database Status" to begin.</p>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="leading-tight">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
        
        {/* Database info */}
        {dbInfo && (
          <div className="mt-4">
            <h3 className="text-md font-medium mb-2">Database Information</h3>
            <pre className="bg-gray-100 dark:bg-gray-900 rounded p-3 overflow-x-auto text-sm">
              {JSON.stringify(dbInfo, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default DatabaseRepair; 