import { Linking } from 'react-native';
import { openWhatsApp } from '@/utils/whatsapp';

export interface ReminderVariables {
  name: string;
  amount: string;
  dueDate: string;
  loanNo: string;
  businessName: string;
}

export const DEFAULT_REMINDER_TEMPLATES = {
  UPCOMING_DUE:
    'Dear {name}, friendly reminder from {businessName}: Your installment of {amount} for loan {loanNo} is due on {dueDate}. Kindly ensure timely payment. Thank you.',
  OVERDUE_NUDGE:
    'URGENT from {businessName}: Dear {name}, your loan installment of {amount} for {loanNo} was due on {dueDate} and is now OVERDUE. Please clear the pending dues immediately to avoid further penalty.',
  PAYMENT_CONFIRMATION:
    'Receipt from {businessName}: Dear {name}, we have received your payment of {amount} towards {loanNo}. Thank you for your payment.',
};

export function formatTemplate(template: string, vars: ReminderVariables): string {
  return template
    .replace(/{name}/g, vars.name)
    .replace(/{amount}/g, vars.amount)
    .replace(/{dueDate}/g, vars.dueDate)
    .replace(/{loanNo}/g, vars.loanNo)
    .replace(/{businessName}/g, vars.businessName);
}

export function openWhatsAppReminder(phone: string, message: string): void {
  openWhatsApp(phone, message);
}

export function openSmsReminder(phone: string, message: string): void {
  const cleanPhone = phone.replace(/\D/g, '').slice(-10);
  const encoded = encodeURIComponent(message);
  Linking.openURL(`sms:${cleanPhone}?body=${encoded}`);
}
