import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

const STORAGE_KEY = "stagepass_user";
const CUSTOMER_ACCOUNT_KEY = "stagepass_customer_account";

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

  function persistUser(nextUser) {
    setUser(nextUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
  }

  function login(userData) {
    persistUser(userData);
  }

  function updateProfile(profileUpdates) {
    setUser((currentUser) => {
      if (!currentUser) return currentUser;
      const nextUser = { ...currentUser, ...profileUpdates };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
      if (nextUser.role === "customer") {
        localStorage.setItem(CUSTOMER_ACCOUNT_KEY, JSON.stringify(nextUser));
      }
      return nextUser;
    });
  }

  function logout() {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        updateProfile,
        logout,
        isAuthenticated: Boolean(user),
        isAdmin: user?.role === "admin",
        isCustomer: user?.role === "customer",
        currentUserId: user?.userId ?? null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
