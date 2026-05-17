import React from 'react';
import { Navigate } from 'react-router-dom';

const normalizeRole = (role) => String(role || '').trim().toLowerCase();

const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('token');
  const role = normalizeRole(localStorage.getItem('role'));

  if (!token) {
    return <Navigate to="/login" />;
  }

  const normalizedAllowedRoles = (allowedRoles || []).map(normalizeRole);

  if (normalizedAllowedRoles.length > 0 && !normalizedAllowedRoles.includes(role)) {
    return <Navigate to="/login" />;
  }

  return children;
};

export default ProtectedRoute;