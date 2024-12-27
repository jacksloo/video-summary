import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import axios from "axios";

// 设置 axios 默认配置
axios.defaults.baseURL =
  process.env.REACT_APP_API_URL || "http://localhost:8000";

// 移除默认的 Content-Type，让 axios 根据请求自动设置
delete axios.defaults.headers.common["Content-Type"];

// 添加请求拦截器
axios.interceptors.request.use(
  (config) => {
    // 从 localStorage 获取 token
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 添加响应拦截器
axios.interceptors.response.use(
  (response) => {
    console.log("收到响应:", response);
    return response;
  },
  (error) => {
    if (error.response) {
      console.error("响应错误:", {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers,
      });
    } else if (error.request) {
      console.error("请求未收到响应:", error.request);
    } else {
      console.error("请求配置错误:", error.message);
    }
    return Promise.reject(error);
  }
);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
