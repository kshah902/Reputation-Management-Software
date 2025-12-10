import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

export function formatPercentage(num: number): string {
  return `${num.toFixed(1)}%`;
}

export function getRatingColor(rating: number): string {
  if (rating >= 4.5) return 'text-green-600';
  if (rating >= 3.5) return 'text-yellow-600';
  if (rating >= 2.5) return 'text-orange-600';
  return 'text-red-600';
}

export function getSentimentColor(sentiment: string): string {
  switch (sentiment) {
    case 'POSITIVE':
      return 'text-green-600 bg-green-100';
    case 'NEUTRAL':
      return 'text-gray-600 bg-gray-100';
    case 'NEGATIVE':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return 'text-green-600 bg-green-100';
    case 'COMPLETED':
      return 'text-blue-600 bg-blue-100';
    case 'PAUSED':
      return 'text-yellow-600 bg-yellow-100';
    case 'DRAFT':
      return 'text-gray-600 bg-gray-100';
    case 'CANCELLED':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}
