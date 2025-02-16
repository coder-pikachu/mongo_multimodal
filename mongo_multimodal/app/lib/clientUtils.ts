export function formatDate(date: string | Date | undefined): string {
  if (!date) return '';

  // Parse the date if it's a string
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  // Use ISO format for consistency between server and client
  return dateObj.toISOString().split('T')[0];
}
