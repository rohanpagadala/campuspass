import { createContext, useContext, useEffect, useState } from "react";
import apiClient from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [role, setRole] = useState(() => localStorage.getItem("role"));
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!token || user) return;
    apiClient
      .get("/auth/me")
      .then(({ data }) => {
        setUser(data);
        setRole(data.role);
        localStorage.setItem("role", data.role);
      })
      .catch(() => {
        // interceptor already clears the token/role and redirects on 401
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function login(username, password) {
    const form = new URLSearchParams();
    form.append("username", username);
    form.append("password", password);

    const { data } = await apiClient.post("/auth/login", form, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const newToken = data.access_token;
    localStorage.setItem("token", newToken);
    setToken(newToken);

    const me = await apiClient.get("/auth/me");

    localStorage.setItem("role", me.data.role);
    setRole(me.data.role);
    setUser(me.data);

    return me.data;
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    setToken(null);
    setRole(null);
    setUser(null);
  }

  const value = {
    token,
    role,
    user,
    isAuthenticated: Boolean(token),
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
