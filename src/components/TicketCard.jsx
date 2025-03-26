// Add to the existing component to display revoked status
const getStatusBadge = (status) => {
  switch(status) {
    case 'revoked':
      return (
        <span className="px-2 py-1 text-xs rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
          Revoked
        </span>
      );
    // Other status handling
    default:
      return null;
  }
};

// In the JSX of your ticket card
{getStatusBadge(ticket.status)} 