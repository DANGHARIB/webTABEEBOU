// Simple utility for authentication management

interface UserData {
  id: string;
  name?: string;
  email?: string;
  role: string;
  [key: string]: string | number | boolean | undefined | null; // For other potential properties
}

export const setAuthToken = (token: string, userData: UserData): void => {
  localStorage.setItem('token', token);
  localStorage.setItem('userInfo', JSON.stringify(userData));
  localStorage.setItem('userRole', userData.role);
  
  // Store login timestamp
  localStorage.setItem('auth_timestamp', Date.now().toString());
};

export const getAuthToken = (): string | null => {
  return localStorage.getItem('token');
};

export const getUserRole = (): string | null => {
  return localStorage.getItem('userRole');
};

export const getUserInfo = (): UserData | null => {
  const userInfo = localStorage.getItem('userInfo');
  return userInfo ? JSON.parse(userInfo) : null;
};

export const isAuthenticated = (): boolean => {
  return !!getAuthToken();
};

export const isDoctor = (): boolean => {
  return getUserRole() === 'Doctor';
};

export const clearAuth = (): void => {
  localStorage.removeItem('token');
  localStorage.removeItem('userInfo');
  localStorage.removeItem('userRole');
  localStorage.removeItem('auth_timestamp');
};
