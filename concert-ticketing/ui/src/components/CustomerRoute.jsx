import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function CustomerRoute({ children }) {
  const { isCustomer, isAdmin } = useAuth();
  if (isAdmin) return <Navigate to="/admin" replace />;
  return isCustomer ? children : <Navigate to="/login" replace />;
}
