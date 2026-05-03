export type EvaluationTemplateAccessInput = {
  unitCode?: string | null;
  unitSymbol?: string | null;
  username?: string | null;
  positionCode?: string | null;
  roles?: string[] | null;
};

const ALLOWED_UNIT_CODES = ['PV01'] as const;
const ALLOWED_POSITION_CODES = ['TRUONG_PHONG', 'PHO_PHONG', 'PHO_TRUONG_PHONG'] as const;
const MANAGER_ROLE_PREFIXES = [
  'SYSTEM_ADMIN',
  'ADMIN',
  'MANAGER_LEVEL',
  'MANAGER_UNIT',
] as const;

function normalize(value?: string | null) {
  return (value ?? '').trim().toUpperCase();
}

export function canCrudEvaluationTemplate(input?: EvaluationTemplateAccessInput | null): boolean {
  if (!input) return false;

  const roles = input.roles ?? [];
  const hasAllowedRole = roles.some((role) => {
    const normalized = normalize(role);
    return MANAGER_ROLE_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}:`));
  });
  if (hasAllowedRole) return true;

  const unitCode = normalize(input.unitCode || input.unitSymbol);
  const positionCode = normalize(input.positionCode);
  return (
    ALLOWED_UNIT_CODES.includes(unitCode as (typeof ALLOWED_UNIT_CODES)[number]) &&
    ALLOWED_POSITION_CODES.includes(positionCode as (typeof ALLOWED_POSITION_CODES)[number])
  );
}
