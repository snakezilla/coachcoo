const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const DEFAULT_LENGTH = 21;

export function nanoId(length: number = DEFAULT_LENGTH): string {
  let id = "";
  for (let i = 0; i < length; i += 1) {
    const index = Math.floor(Math.random() * ALPHABET.length);
    id += ALPHABET[index];
  }
  return id;
}
