// AuthContext.tsx
import React, { createContext, useState, useEffect, type ReactNode } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

// Define user types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'Patient' | 'Doctor';
  hasCompletedAssessment?: boolean;
}

interface UserRegisterData {
  email: string;
  password: string;
  name: string;
  [key: string]: string | number | boolean;
}

// Define context type
interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string, role: string) => Promise<User | null>;
  register: (userData: UserRegisterData, role: string) => Promise<void>;
  logout: () => void;
  setAuthenticatedUserManually: (token: string, userDataFromToken: User, userRole: 'Patient' | 'Doctor') => void;
}

// Create context with default undefined value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Define props interface
interface AuthProviderProps {
  children: ReactNode;
}

// Auth Provider component
const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decodedUser = jwtDecode<User>(token);
        setUser(decodedUser);
        
        // Configure axios with token
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        console.log('Token trouvé et configuré depuis localStorage');
      } catch (error) {
        console.error('Token invalide', error);
        localStorage.removeItem('token');
        localStorage.removeItem('userInfo');
        localStorage.removeItem('userRole');
      }
    } else {
      console.log('Aucun token trouvé dans localStorage');
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string, role: string): Promise<User | null> => {
    setLoading(true);
    setError(null);
    try {
      // Use the correct API endpoint format
      const response = await axios.post('/api/auth/login', {
        email,
        password,
        role
      });
      
      const { token } = response.data;
      
      if (token) {
        localStorage.setItem('token', token);
        localStorage.setItem('userRole', role);
        
        // Store user info if available
        if (response.data.user) {
          localStorage.setItem('userInfo', JSON.stringify(response.data.user));
        }
        
        const apiUser = response.data; // User details are directly in response.data (e.g., _id, fullName, email, role, hasCompletedAssessment)
        const decodedFromToken = jwtDecode<{ id: string, iat?: number, exp?: number }>(token); // JWT typically only has id, iat, exp

        const userObject: User = {
          id: apiUser._id || decodedFromToken.id, // Prefer _id from response, fallback to token's id
          email: apiUser.email,
          name: apiUser.fullName, // Map fullName to name
          role: apiUser.role,
        };

        // Add hasCompletedAssessment only if it's present in the API response
        if (apiUser.hasCompletedAssessment !== undefined) {
          userObject.hasCompletedAssessment = apiUser.hasCompletedAssessment;
        }
        // Add other optional fields from User interface if they exist in apiUser similarly

        // No need to filter undefined properties if we construct it carefully like above.
        // The User interface itself defines what's optional.

        localStorage.setItem('userInfo', JSON.stringify(userObject));
        const userToSetAndReturn = userObject; // Assign to const

        setUser(userToSetAndReturn);
        
        // Configure axios with token
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        console.log('Connexion réussie, token stocké, user object:', userToSetAndReturn);
        return userToSetAndReturn;
      }
      return null;
    } catch (error) {
      setError('Identifiants incorrects. Veuillez réessayer.');
      console.error('Erreur de connexion:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: UserRegisterData, role: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post('/api/auth/register', {
        ...userData,
        role
      });
      
      const { token } = response.data;
      
      if (token) {
        localStorage.setItem('token', token);
        localStorage.setItem('userRole', role);
        
        // Store user info if available
        if (response.data.user) {
          localStorage.setItem('userInfo', JSON.stringify(response.data.user));
        }
        
        const decodedUser = jwtDecode<User>(token);
        setUser(decodedUser);
        
        // Configure axios with token
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        console.log('Inscription réussie, token stocké');
      }
    } catch (error) {
      setError('Erreur lors de l\'inscription. Veuillez réessayer.');
      console.error('Erreur d\'inscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const setAuthenticatedUserManually = (token: string, userDataFromToken: User, userRole: 'Patient' | 'Doctor') => {
    localStorage.setItem('token', token);
    localStorage.setItem('userRole', userRole);
    // Assuming userDataFromToken is the decoded payload. If actual user object is different, adjust accordingly.
    localStorage.setItem('userInfo', JSON.stringify(userDataFromToken)); 
    setUser(userDataFromToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setLoading(false); // Ensure loading is set to false
    console.log('Utilisateur authentifié manuellement, token stocké');
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userInfo');
    localStorage.removeItem('userRole');
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
    console.log('Déconnexion effectuée, token supprimé');
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, register, logout, setAuthenticatedUserManually }}>
      {children}
    </AuthContext.Provider>
  );
};

// Export both context and provider
export { AuthContext, AuthProvider };