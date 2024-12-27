import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VideoList from "./pages/VideoList";
import FolderView from "./pages/FolderView";
import VideoPlayer from "./pages/VideoPlayer";
import MainLayout from "./layouts/MainLayout";

// 验证是否已登录的函数
const isAuthenticated = () => {
  return localStorage.getItem("token") !== null;
};

// 受保护的路由组件
const ProtectedRoute = ({ children }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/videos" replace />} />
          <Route path="videos" element={<VideoList />} />
          <Route path="videos/folder/:sourceId" element={<FolderView />} />
          <Route path="/videos/play" element={<VideoPlayer />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
