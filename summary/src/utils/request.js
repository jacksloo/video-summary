import axios from "axios";
import { message } from "antd";

// 创建 axios 实例
const request = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:8000",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// 针对转录请求的特殊配置
request.transcribe = {
  timeout: 300000,
};

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };
    }
    if (config.responseType === "blob") {
      config.timeout = 60000;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      switch (error.response.status) {
        case 401:
          message.error("未登录或登录已过期");
          localStorage.removeItem("token");
          window.location.href = "/login";
          break;
        case 403:
          message.error("没有权限访问");
          break;
        case 404:
          message.error("请求的资源不存在");
          break;
        case 500:
          message.error("服务器错误，请稍后重试");
          break;
        default:
          message.error(error.response.data?.detail || "请求失败");
      }
    } else {
      message.error("网络错误，请检查网络连接");
    }
    if (error.code === "ECONNABORTED") {
      console.error("Request timeout:", error);
    }
    return Promise.reject(error);
  }
);

export default request;
