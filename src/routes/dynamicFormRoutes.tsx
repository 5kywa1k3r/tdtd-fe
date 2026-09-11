import { Navigate, useLocation } from "react-router-dom";

export const DYNAMIC_FORM_LIST_PATH = "/design/forms";
export const LEGACY_DYNAMIC_FORM_PATH = "/dynamic-forms";
export const DYNAMIC_FORM_CREATE_PATH = `${DYNAMIC_FORM_LIST_PATH}/create`;

export function dynamicFormPath(
  id?: string | null,
  mode?: "edit",
) {
  if (!id) return DYNAMIC_FORM_LIST_PATH;
  const base = `${DYNAMIC_FORM_LIST_PATH}/${encodeURIComponent(id)}`;
  return mode === "edit" ? `${base}/edit` : base;
}

export function getLegacyDynamicFormRedirectTarget(location: {
  pathname: string;
  search?: string;
  hash?: string;
}) {
  const legacySuffix = location.pathname.startsWith(LEGACY_DYNAMIC_FORM_PATH)
    ? location.pathname.slice(LEGACY_DYNAMIC_FORM_PATH.length)
    : "";
  return `${DYNAMIC_FORM_LIST_PATH}${legacySuffix}${location.search ?? ""}${location.hash ?? ""}`;
}

export function LegacyDynamicFormsRedirect() {
  const location = useLocation();
  return <Navigate to={getLegacyDynamicFormRedirectTarget(location)} replace />;
}
