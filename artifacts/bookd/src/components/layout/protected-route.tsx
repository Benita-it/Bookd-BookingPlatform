import { useAuth } from "@/lib/auth";
import { UserRole } from "@workspace/api-client-react";
import { Redirect } from "wouter";
import { ReactNode } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, token } = useAuth();

  if (!token || !user) {
    return <Redirect to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to their respective dashboard if they don't have access to this route
    if (user.role === UserRole.PROVIDER) {
      return <Redirect to="/provider/dashboard" />;
    }
    return <Redirect to="/dashboard" />;
  }

  return <>{children}</>;
}
