/**
 * Format a date to be displayed in a more human-readable format
 * If the date is today, return "Today"
 * If the date is yesterday, return "Yesterday"
 * Otherwise, return the date in the format "MMM DD, YYYY"
 */
export function formatDate(date) {
  if (!date) return '';
  
  const messageDate = new Date(date);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  
  if (isSameDay(messageDate, today)) {
    return 'Today';
  } else if (isSameDay(messageDate, yesterday)) {
    return 'Yesterday';
  } else {
    return messageDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
}

/**
 * Helper function to check if two dates are the same day
 */
function isSameDay(date1, date2) {
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  );
}
