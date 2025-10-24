import { useAuthContext } from '../context/AuthContext';

/**
 * Hook to access authentication state and methods
 * This is now a wrapper around useAuthContext for backwards compatibility
 */
export const useAuth = () => {
  return useAuthContext();
};
