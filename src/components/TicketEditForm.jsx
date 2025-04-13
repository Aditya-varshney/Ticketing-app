import { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';

export default function TicketEditForm({ ticket, onSave, onCancel }) {
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Initialize form data with ticket data
    if (ticket?.form_data) {
      setFormData(
        typeof ticket.form_data === 'string' 
          ? JSON.parse(ticket.form_data) 
          : ticket.form_data
      );
    }
  }, [ticket]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/forms/submissions/${ticket.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          form_data: formData
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to update ticket');
      }

      const updatedTicket = await response.json();
      onSave(updatedTicket);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-md">
          {error}
        </div>
      )}

      {Object.entries(formData).map(([key, value]) => (
        <div key={key} className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {key.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </label>
          <input
            type="text"
            name={key}
            value={value}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
      ))}

      <div className="flex justify-end space-x-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
} 