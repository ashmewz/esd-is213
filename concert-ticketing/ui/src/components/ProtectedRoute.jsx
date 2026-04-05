import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { isAdmin, isCustomer } = useAuth();
  if (isAdmin) return children;
  if (isCustomer) return <Navigate to="/" replace />;
  return <Navigate to="/admin/login" replace />;
}
