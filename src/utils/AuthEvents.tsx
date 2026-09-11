import { clearAuthStorage } from "../stores/authStorage";

export const AUTH_LOGOUT_EVENT = 'tdtd:logout';

export function emitLogout() {
  window.dispatchEvent(new Event(AUTH_LOGOUT_EVENT));
}

export function performLogout() {
  clearAuthStorage();
  emitLogout();                 
}
