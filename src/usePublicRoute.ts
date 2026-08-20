// src/hooks/usePublicRoute.ts
import { useLocation } from 'react-router-dom';

const PUBLIC_ROUTES = ['/login', '/orhc-form', '/unauthorized'];

export const usePublicRoute = (): boolean => {
  const location = useLocation();
  return PUBLIC_ROUTES.some(route => location.pathname.startsWith(route));
};