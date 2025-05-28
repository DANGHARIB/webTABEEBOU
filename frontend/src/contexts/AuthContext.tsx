import { createContext, useState, useEffect, type ReactNode } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'Patient' | 'Doctor';
}

interface UserRegisterData {
  email: string;
  password: string;
  name: string;
  [key: string]: string | number | boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string, role: string) => Promise<void>;
  register: (userData: UserRegisterData, role: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
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
      }
    } else {
      console.log('Aucun token trouvé dans localStorage');
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string, role: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`/api/${role.toLowerCase()}/auth/login`, {
        email,
        password
      });
      
      const { token } = response.data;
      
      if (token) {
        localStorage.setItem('token', token);
        const decodedUser = jwtDecode<User>(token);
        setUser(decodedUser);
        
        // Configure axios with token
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        console.log('Connexion réussie, token stocké');
      }
    } catch (error) {
      setError('Identifiants incorrects. Veuillez réessayer.');
      console.error('Erreur de connexion:', error);
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: UserRegisterData, role: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`/api/${role.toLowerCase()}/auth/register`, userData);
      const { token } = response.data;
      
      if (token) {
        localStorage.setItem('token', token);
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

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
    console.log('Déconnexion effectuée, token supprimé');
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}; 