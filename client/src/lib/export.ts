import type { Expense } from '@shared/schema';
import type { Income } from '@shared/schema';

export function exportToCSV(data: Expense[], filename: string, currency: string = 'PKR') {
  const headers = ['Date', 'Category', 'Description', 'Payment Method', `Amount (${currency})`];
  const rows = data.map(e => [
    e.date.split('T')[0],
    e.category,
    `"${e.description.replace(/"/g, '""')}"`,
    e.paymentMethod || 'cash',
    e.amount,
  ]);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  downloadCSV(csv, filename);
}

export function exportIncomeToCSV(data: Income[], filename: string, currency: string = 'PKR') {
  const headers = ['Date', 'Source', 'Description', `Amount (${currency})`];
  const rows = data.map(inc => [
    inc.date.split('T')[0],
    inc.source,
    `"${inc.description.replace(/"/g, '""')}"`,
    inc.amount,
  ]);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  downloadCSV(csv, filename);
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
