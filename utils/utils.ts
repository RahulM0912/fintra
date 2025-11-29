export function toArray(input: any): any[] {
  if (!input) return [];

  // Already array
  if (Array.isArray(input)) return input;

  // If it's an object → wrap into array
  if (typeof input === "object") return [input];

  // If it's a string → try to parse JSON
  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [input]; // fallback for non-JSON strings
    }
  }

  // For numbers, booleans, etc.
  return [input];
}