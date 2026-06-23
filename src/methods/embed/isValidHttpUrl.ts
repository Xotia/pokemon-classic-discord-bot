export function isValidHttpUrl(url: string): boolean {
  try {
    new URL(url);
    return url.startsWith('http');
  } catch {
    return false;
  }
}