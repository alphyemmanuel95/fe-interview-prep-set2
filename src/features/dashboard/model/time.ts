// Fixed locale for the same reason as money: identical output on every machine and in tests.
const timeFormatter = new Intl.DateTimeFormat('en-US', { timeStyle: 'medium' });

export function formatTime(value: Date | number): string {
  return timeFormatter.format(value);
}
