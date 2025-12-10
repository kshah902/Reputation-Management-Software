import crypto from 'crypto';
import { config } from '../config';

export function generateId(): string {
  return crypto.randomUUID();
}

export function generateApiKey(): string {
  return `rms_${crypto.randomBytes(32).toString('hex')}`;
}

export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function generateShortCode(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function parsePhoneNumber(phone: string): string | null {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  }
  if (cleaned.length > 10) {
    return `+${cleaned}`;
  }
  return null;
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function parseCSVRow(row: Record<string, string>): {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
} | null {
  const nameKeys = ['name', 'full_name', 'fullname', 'customer_name', 'customername'];
  const firstNameKeys = ['first_name', 'firstname', 'fname', 'first'];
  const lastNameKeys = ['last_name', 'lastname', 'lname', 'last'];
  const emailKeys = ['email', 'email_address', 'emailaddress', 'e-mail'];
  const phoneKeys = ['phone', 'phone_number', 'phonenumber', 'mobile', 'cell', 'telephone'];

  const findValue = (keys: string[]): string | undefined => {
    for (const key of keys) {
      const normalizedKey = Object.keys(row).find(k => k.toLowerCase() === key);
      if (normalizedKey && row[normalizedKey]?.trim()) {
        return row[normalizedKey].trim();
      }
    }
    return undefined;
  };

  let firstName = findValue(firstNameKeys);
  let lastName = findValue(lastNameKeys);

  if (!firstName) {
    const fullName = findValue(nameKeys);
    if (fullName) {
      const parts = fullName.split(' ');
      firstName = parts[0];
      lastName = parts.slice(1).join(' ') || undefined;
    }
  }

  if (!firstName) {
    return null;
  }

  const email = findValue(emailKeys);
  const phoneRaw = findValue(phoneKeys);
  const phone = phoneRaw ? parsePhoneNumber(phoneRaw) : undefined;

  return {
    firstName,
    lastName,
    email: email && validateEmail(email) ? email : undefined,
    phone: phone || undefined,
  };
}

export function replaceTokens(
  template: string,
  tokens: Record<string, string | undefined>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return tokens[key] || match;
  });
}

export function calculateResponseRate(sent: number, responses: number): number {
  if (sent === 0) return 0;
  return Math.round((responses / sent) * 100 * 10) / 10;
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function addHours(date: Date, hours: number): Date {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
}
