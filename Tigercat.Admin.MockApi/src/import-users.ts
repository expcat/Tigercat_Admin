export type ImportMappings = { username: number | null; password: number | null; displayName: number | null; roleIds: number | null };
export type ImportRow = { rowNumber: number; username: string; displayName: string | null; roleIds: string; status: string; message: string; userId: number | null };
export type PreparedImportRow = ImportRow & { passwordHash: string | null; roles: number[] };
export type ImportJobItem = {
  id: string; source: string; resource: 'users'; mode: 'append'; conflict: 'skip'; status: string;
  progress: number; total: number; processed: number;
  result: { imported: number; skipped: number; failed: number; message: string };
  rows: PreparedImportRow[];
};
type ImportState = { users: { username: string }[]; roles: { id: number }[]; settings: { key: string; value: string }[] };

export function validateImportUser(username: string, password: string, displayName: string | null, state: ImportState): string | null {
  if (!username.trim() || !password.trim()) return '用户名或密码不能为空';
  if (username.length < 2 || username.length > 50) return '用户名长度需在 2-50 之间';
  // .NET char.IsLetterOrDigit works on UTF-16 characters, so astral code points are not accepted.
  if (!/^[\p{L}\p{Nd}_.-]+$/u.test(username) || Array.from(username).some(c => c.length > 1)) return '用户名只能包含字母、数字、下划线、短横线和点';
  const rawMin = Number(state.settings.find(s => s.key === 'auth.passwordMinLength')?.value ?? 6);
  const min = Number.isInteger(rawMin) ? Math.min(128, Math.max(6, rawMin)) : 6;
  if (password.length < min) return `密码长度不能少于 ${min} 位`;
  if (state.settings.find(s => s.key === 'auth.requireComplexPassword')?.value.toLowerCase() === 'true' &&
    (!/[\p{L}]/u.test(password) || !/[\p{Nd}]/u.test(password))) return '密码必须同时包含字母和数字';
  if (displayName !== null && displayName.length > 100) return '显示名称长度不能超过 100';
  return null;
}

// ASP.NET Identity v3 payload (SHA512 / 100000 iterations), using the browser's native crypto.
export async function hashImportPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const derived = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-512', iterations: 100000, salt }, key, 256));
  const bytes = new Uint8Array(61); bytes[0] = 1;
  const view = new DataView(bytes.buffer); view.setUint32(1, 2); view.setUint32(5, 100000); view.setUint32(9, 16);
  bytes.set(salt, 13); bytes.set(derived, 29);
  return btoa(String.fromCharCode(...bytes));
}
export async function matchesImportPassword(hash: string, password: string): Promise<boolean> {
  try {
    const bytes = Uint8Array.from(atob(hash), c => c.charCodeAt(0));
    if (bytes.length !== 61 || bytes[0] !== 1) return false;
    const view = new DataView(bytes.buffer);
    if (view.getUint32(1) !== 2 || view.getUint32(9) !== 16 || view.getUint32(5) !== 100000) return false;
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const derived = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-512', iterations: 100000, salt: bytes.slice(13, 29) }, key, 256));
    return derived.every((value, index) => value === bytes[index + 29]);
  } catch { return false; }
}

export function isImportPasswordHash(value: string): boolean {
  // The generated Identity v3 header is fixed; seeded demo credentials remain plain text.
  return value.length === 84 && value.startsWith('AQAAAAIAAYagAAAAE');
}

function parseCsv(text: string): { line: number; cells: string[] }[] {
  const records: { line: number; cells: string[] }[] = [];
  let cells: string[] = [], value = '', quoted = false, closedQuote = false, line = 1, startLine = 1;
  const endRecord = () => {
    cells.push(value); value = '';
    if (cells.length !== 1 || cells[0] !== '') records.push({ line: startLine, cells });
    cells = []; closedQuote = false;
  };
  for (let i = text.charCodeAt(0) === 0xfeff ? 1 : 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { value += '"'; i++; } else { quoted = false; closedQuote = true; }
      } else { value += c; if (c === '\n' || c === '\r' && text[i + 1] !== '\n') line++; }
      continue;
    }
    if (c === ',') { cells.push(value); value = ''; closedQuote = false; }
    else if (c === '\r' || c === '\n') { endRecord(); if (c === '\r' && text[i + 1] === '\n') i++; line++; startLine = line; }
    else if (c === '"' && value === '' && !closedQuote) quoted = true;
    else if (c === '"' || closedQuote) throw new Error(`第 ${startLine} 行 CSV 引号格式无效`);
    else value += c;
  }
  if (quoted) throw new Error(`第 ${startLine} 行 CSV 引号未闭合`);
  if (value || cells.length || closedQuote) endRecord();
  return records;
}

export async function prepareUserImport(body: Record<string, unknown>, state: ImportState, hashPasswords: boolean) {
  const source = String(body.source ?? '');
  if (!source.trim() || source.length > 500 || !source.toLowerCase().endsWith('.csv')) throw new Error('请选择 UTF-8 CSV 文件（文件名最多 500 字符）');
  if ((body.mode ?? 'append') !== 'append' || (body.conflict ?? 'skip') !== 'skip') throw new Error('用户导入仅支持追加和重复用户名跳过');
  const csv = typeof body.csv === 'string' ? body.csv : '';
  if (!csv || new TextEncoder().encode(csv).length > 1048576) throw new Error('CSV 不能为空且不能超过 1 MiB');
  const records = parseCsv(csv);
  if (records.length < 2) throw new Error('CSV 需包含表头和至少一行数据');
  if (records.length - 1 > 1000) throw new Error('每次最多导入 1000 行');
  const headers = records[0].cells.map(h => h.trim());
  if (headers.length > 50 || headers.some(h => !h) || new Set(headers.map(h => h.toLowerCase())).size !== headers.length) throw new Error('表头不能为空或重复，最多 50 列');
  const find = (...aliases: string[]) => { const index = headers.findIndex(h => aliases.some(a => a.toLowerCase() === h.toLowerCase())); return index < 0 ? null : index; };
  const mappings: ImportMappings = (body.mappings as ImportMappings | null) ?? { username: find('username', '用户名'), password: find('password', '密码'), displayName: find('displayName', '显示名称'), roleIds: find('roleIds', '角色ID') };
  const indexes = [mappings.username, mappings.password, mappings.displayName, mappings.roleIds].filter(i => i != null);
  if (indexes.some(i => !Number.isInteger(i) || i < 0 || i >= headers.length) || new Set(indexes).size !== indexes.length) throw new Error('映射列无效或重复');
  if (hashPasswords && (mappings.username == null || mappings.password == null)) throw new Error('请映射用户名和密码必填列');
  const seen = new Set(state.users.map(u => u.username.toLowerCase()));
  const rows: PreparedImportRow[] = [];
  for (const record of records.slice(1)) {
    const value = (index: number | null) => index == null ? '' : record.cells[index] ?? '';
    const password = value(mappings.password), username = value(mappings.username).trim().toLowerCase();
    const displayName = mappings.displayName == null ? null : value(mappings.displayName);
    const roleIds = value(mappings.roleIds).trim();
    let error = record.cells.length !== headers.length ? '列数与表头不一致' : mappings.username == null || mappings.password == null ? '请映射用户名和密码必填列' : validateImportUser(username, password, displayName, state);
    const roles = roleIds ? roleIds.split(';').map(p => /^[+-]?\d+$/.test(p.trim()) ? Number(p) : 0) : [];
    if (!error && (roles.some(id => id <= 0 || !state.roles.some(r => r.id === id)) || new Set(roles).size !== roles.length)) error = '角色 ID 无效或重复；多个角色用分号分隔';
    const status = error ? 'failed' : seen.has(username) ? 'skipped' : 'ready';
    const message = error ?? (status === 'skipped' ? '用户名已存在，跳过' : '校验通过');
    if (status === 'ready') seen.add(username);
    rows.push({ rowNumber: record.line, username, displayName, roleIds, roles, status, message, userId: null,
      passwordHash: hashPasswords && status === 'ready' ? await hashImportPassword(password) : null });
  }
  const rawMin = Number(state.settings.find(s => s.key === 'auth.passwordMinLength')?.value ?? 6);
  const min = Number.isInteger(rawMin) ? Math.min(128, Math.max(6, rawMin)) : 6;
  const complex = state.settings.find(s => s.key === 'auth.requireComplexPassword')?.value.toLowerCase() === 'true';
  return { headers, mappings, total: rows.length, valid: rows.filter(r => r.status === 'ready').length, skipped: rows.filter(r => r.status === 'skipped').length,
    failed: rows.filter(r => r.status === 'failed').length, passwordHint: `密码至少 ${min} 位` + (complex ? '，且同时包含字母和数字' : ''), rows };
}
export function publicImportRow({ passwordHash: _hash, roles: _roles, ...row }: PreparedImportRow): ImportRow { return row; }
export function publicImportJob(job: ImportJobItem) { return { ...job, rows: (job.rows ?? []).map(publicImportRow) }; }
