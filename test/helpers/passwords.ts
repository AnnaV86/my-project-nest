export const validPasswordCases = [
  { name: '8 ASCII-символов', password: 'a'.repeat(8) },
  { name: '72 ASCII-символа', password: 'a'.repeat(72) },
  { name: '36 букв кириллицы — 72 байта', password: 'я'.repeat(36) },
  { name: '18 эмодзи — 72 байта', password: '😀'.repeat(18) },
];

export const invalidPasswordCases = [
  { name: '7 ASCII-символов', password: 'a'.repeat(7) },
  { name: '7 букв кириллицы — 14 байт', password: 'я'.repeat(7) },
  { name: '73 ASCII-символа', password: 'a'.repeat(73) },
  { name: 'кириллица и ASCII — 73 байта', password: 'я'.repeat(36) + 'a' },
  { name: '19 эмодзи — 76 байт', password: '😀'.repeat(19) },
];
