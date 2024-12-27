import React from "react";
import { Navigate } from "react-router-dom";

const PrivateRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem("token") !== null;

  if (!isAuthenticated) {
    // 如果没有登录，重定向到登录页面
    return <Navigate to="/login" replace />;
  }

  // 如果已登录，显示受保护的组件
  return children;
};

export default PrivateRoute;
