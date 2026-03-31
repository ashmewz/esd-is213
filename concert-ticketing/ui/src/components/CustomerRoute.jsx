import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function CustomerRoute({ children }) {
  const { isCustomer } = useAuth();
  return isCustomer ? children : <Navigate to="/login" replace />;
}
