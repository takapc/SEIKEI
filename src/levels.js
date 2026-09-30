export const LEVELS = [
  { value: 4, label: '最優先', description: '最初に覚える' },
  { value: 3, label: '必須', description: '基本の年号' },
  { value: 2, label: '標準', description: '範囲を広げる' },
  { value: 1, label: '補強', description: '難しめの事項' },
];

export const DEFAULT_LEVELS = [4, 3];
export const levelLabel = value => LEVELS.find(level => level.value === value)?.label ?? '未設定';
