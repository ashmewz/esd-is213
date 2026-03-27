import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

const STORAGE_KEY = "stagepass_user";

function loadUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadUser);

  function login(userData) {
    setUser(userData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
  }

  function logout() {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin: user?.role === "admin" }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
