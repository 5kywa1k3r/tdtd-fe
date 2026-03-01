import { clearAuthStorage } from "../stores/authStorage";
import { baseApi } from "../api/base/baseApi";

export const AUTH_LOGOUT_EVENT = 'tdtd:logout';

export function emitLogout() {
  window.dispatchEvent(new Event(AUTH_LOGOUT_EVENT));
}

export function performLogout() {
  clearAuthStorage();
  baseApi.util.resetApiState();
  emitLogout();                 
}
