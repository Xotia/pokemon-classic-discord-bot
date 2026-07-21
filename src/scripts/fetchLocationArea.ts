const fetch = require("node-fetch");

export async function fetchLocationArea(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Erreur location-area ${url}: ${res.status}`);
  return await res.json();
}
