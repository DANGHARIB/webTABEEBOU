import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

// Custom hook for accessing auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth doit être utilisé à l\'intérieur d\'un AuthProvider');
  }
  
  return context;
};