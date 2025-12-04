export function maskSensitive(obj: any, maxString = 120) {
  try {
    if (obj === null || obj === undefined) return obj;

    // Primitive types
    if (typeof obj === 'string') {
      return trimString(obj, maxString);
    }
    if (typeof obj !== 'object') return obj;

    // Arrays
    if (Array.isArray(obj)) {
      return obj.map((v) => maskSensitive(v, maxString));
    }

    const out: any = {};
    for (const key of Object.keys(obj)) {
      const lower = key.toLowerCase();
      const val = obj[key];

      // Don't log sensitive keys
      if (
        lower === 'password' ||
        lower === 'passwordconfirm' ||
        lower === 'oldpassword' ||
        lower === 'newpassword'
      ) {
        out[key] = '<<masked password>>';
        continue;
      }

      // Mask authorization header or long tokens
      if (lower === 'authorization' && typeof val === 'string') {
        out[key] = maskAuthHeader(val, maxString);
        continue;
      }

      // Strings: trim long values (tokens, long IDs)
      if (typeof val === 'string') {
        out[key] = trimString(val, maxString);
        continue;
      }

      // Recurse for objects/arrays
      out[key] = maskSensitive(val, maxString);
    }

    return out;
  } catch (err) {
    return `<<mask-error:${String(err)}>>`;
  }
}

function maskAuthHeader(header: string, maxString: number) {
  // Typical: "Bearer eyJ..." or "Token ..."
  const parts = header.split(' ');
  if (parts.length >= 2) {
    return `${parts[0]} ${trimString(parts.slice(1).join(' '), Math.min(60, maxString))}`;
  }
  return trimString(header, maxString);
}

function trimString(s: string, maxString: number) {
  if (s.length <= maxString) return s;
  const prefix = s.slice(0, 40);
  return `${prefix}...<trimmed:${s.length}>`;
}
