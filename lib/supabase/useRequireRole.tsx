import { useEffect } from 'react';
import { router } from 'expo-router';
import { useAuth } from './AuthContext';

/**
 * Hook pour protéger une route selon le rôle de l'utilisateur
 * Redirige automatiquement si l'utilisateur n'a pas le rôle requis
 * 
 * @param requiredRole - Le rôle requis ('admin' | 'user')
 * @param redirectTo - Route de redirection si non autorisé (défaut: '/(tabs)')
 */
export function useRequireRole(requiredRole: 'admin' | 'user' = 'admin', redirectTo: string = '/(tabs)') {
  const { user, isAdmin, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    // Vérifier l'authentification
    if (!isAuthenticated || !user) {
      router.replace('/auth/login');
      return;
    }

    // Vérifier le rôle
    if (requiredRole === 'admin' && !isAdmin) {
      router.replace(redirectTo);
      return;
    }

    // Pour 'user', on accepte tous les utilisateurs authentifiés (admin inclus)
    // Si besoin de restreindre aux users uniquement, ajouter: && !isAdmin
  }, [isLoading, isAuthenticated, isAdmin, user, requiredRole, redirectTo]);

  return {
    user,
    isAuthorized: requiredRole === 'admin' ? isAdmin : isAuthenticated,
    isLoading,
  };
}
