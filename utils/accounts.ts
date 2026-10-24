import { AccountAlias } from '../types';

// Números de cuenta en un texto: "*4814", "**4814", "cuenta 29200006485", "llave 71291437" o números largos.
// Misma regla que el servidor (server/index.js: accountTokens / sameAccount).
const TOKEN_RE = /(\*{1,3}\s?|cuenta\s+(?:no\.?\s*|n[°º]\s*)?|cta\.?\s*|tarjeta\s+|llave\s+@?)(\d{4,})|\b(\d{8,})\b/gi;

// Coinciden si el número más largo termina en el más corto (mínimo 4 dígitos): "29200006485" ~ "*6485"
export const sameAccount = (a: string, b: string) => {
  const x = a.replace(/\D/g, ''), y = b.replace(/\D/g, '');
  const [s, l] = x.length <= y.length ? [x, y] : [y, x];
  return s.length >= 4 && l.endsWith(s);
};

// Agrega a quién pertenece cada cuenta conocida: "a cuenta *6485" -> "a cuenta *6485 (Roxana)"
export const annotateAccounts = (text: string, accounts: AccountAlias[]): string => {
  if (!text || accounts.length === 0) return text;
  return text.replace(TOKEN_RE, (match, prefix, num, long) => {
    const digits = num || long;
    const acc = accounts.find(a => sameAccount(a.accountNumber, digits));
    return acc && !text.includes(`(${acc.label})`) ? `${match} (${acc.label})` : match;
  });
};
