import type { DashboardSnapshot, Order, Sales } from '../model/types';

const isObject = (value: unknown): value is object => typeof value === 'object' && value !== null;

const isSales = (value: unknown): value is Sales =>
  isObject(value) &&
  'totalCents' in value &&
  Number.isInteger(value.totalCents) &&
  'currency' in value &&
  typeof value.currency === 'string';

const isOrder = (value: unknown): value is Order =>
  isObject(value) &&
  'id' in value &&
  typeof value.id === 'string' &&
  'customer' in value &&
  typeof value.customer === 'string' &&
  'amountCents' in value &&
  Number.isInteger(value.amountCents) &&
  'createdAt' in value &&
  typeof value.createdAt === 'string';

export const isDashboardSnapshot = (value: unknown): value is DashboardSnapshot =>
  isObject(value) &&
  'sales' in value &&
  isSales(value.sales) &&
  'activeUsers' in value &&
  Number.isInteger(value.activeUsers) &&
  'recentOrders' in value &&
  Array.isArray(value.recentOrders) &&
  value.recentOrders.every(isOrder);
