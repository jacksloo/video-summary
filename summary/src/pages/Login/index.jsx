import React, { useState } from "react";
import {
  Form,
  Input,
  Button,
  Card,
  message,
  Checkbox,
  Tabs,
  Alert,
} from "antd";
import { UserOutlined, LockOutlined, MobileOutlined } from "@ant-design/icons";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import Logo from "../../assets/logo";
import "./index.css";

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("account");
  const [form] = Form.useForm();
  const [countdown, setCountdown] = useState(0);
  const [shouldValidate, setShouldValidate] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const startCountdown = () => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const sendVerificationCode = async () => {
    try {
      const phone = form.getFieldValue("phone");
      if (!phone) {
        message.error("请输入手机号！");
        return;
      }
      await axios.post("http://localhost:8000/api/send-code", { phone });
      message.success("验证码已发送！");
      startCountdown();
    } catch (error) {
      message.error(
        "发送失败：" + (error.response?.data?.message || "未知错误")
      );
    }
  };

  const onFinish = async (values) => {
    setLoading(true);
    setErrorMessage("");
    try {
      const formData = new URLSearchParams();
      formData.append("username", values.account);
      formData.append("password", values.password);
      formData.append("grant_type", "password");

      const response = await axios.post(
        "http://localhost:8000/api/auth/login",
        formData,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      if (response.status === 200) {
        localStorage.setItem("token", response.data.access_token);
        if (values.remember) {
          localStorage.setItem("username", values.account);
          localStorage.setItem("password", values.password);
        }
        message.success("登录成功！");
        navigate("/home");
      }
    } catch (error) {
      let errorMsg = "登录失败";
      if (error.response) {
        errorMsg = error.response.data.detail || "用户名或密码错误";
      }
      setErrorMessage(errorMsg);
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setShouldValidate(true);
    try {
      const values = await form.validateFields();
      onFinish(values);
    } catch (errorInfo) {
      console.log("验证失败:", errorInfo);
    }
  };

  const items = [
    {
      key: "account",
      label: "账号密码登录",
      children: (
        <>
          <Form.Item
            name="account"
            rules={[{ required: true, message: "请输入用户名/邮��！" }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="用户名/邮箱"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: "请输入密码！" }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
              size="large"
            />
          </Form.Item>

          <div className="login-options">
            <Form.Item name="remember" valuePropName="checked" noStyle>
              <Checkbox>记住密码</Checkbox>
            </Form.Item>
            <Link className="forgot-password" to="/forgot-password">
              忘记密码？
            </Link>
          </div>
        </>
      ),
    },
    {
      key: "phone",
      label: "手机号登录",
      children: (
        <>
          <Form.Item
            name="phone"
            rules={[
              { required: true, message: "请输入手机号！" },
              { pattern: /^1\d{10}$/, message: "请输入正确的手机号！" },
            ]}
          >
            <Input
              prefix={<MobileOutlined />}
              placeholder="手机号"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="verificationCode"
            rules={[{ required: true, message: "请输入验证码！" }]}
            className="verification-code-form-item"
          >
            <div className="verification-code-input">
              <Input
                prefix={<LockOutlined />}
                placeholder="验证码"
                size="large"
              />
              <Button
                className="send-code-btn"
                disabled={countdown > 0}
                onClick={sendVerificationCode}
                type="primary"
              >
                {countdown > 0 ? `${countdown}s` : "获取验证码"}
              </Button>
            </div>
          </Form.Item>
        </>
      ),
    },
  ];

  return (
    <div className="login-container">
      <div className="login-content">
        <Card className="login-card">
          <div className="login-header">
            <div className="title-with-logo">
              <Logo className="title-logo" />
              <div className="title-content">
                <h2>视频摘要助手 - 登录</h2>
                <p className="subtitle">智能生成视频摘要，提升观看效率</p>
              </div>
            </div>
          </div>

          <Form
            form={form}
            name="login"
            onFinish={onFinish}
            autoComplete="off"
            initialValues={{
              remember: true,
            }}
          >
            {errorMessage && (
              <Form.Item>
                <Alert
                  message={errorMessage}
                  type="error"
                  showIcon
                  closable
                  onClose={() => setErrorMessage("")}
                />
              </Form.Item>
            )}

            <Tabs
              activeKey={activeTab}
              onChange={(key) => {
                setActiveTab(key);
                setErrorMessage("");
                setShouldValidate(false);
                form.resetFields();
              }}
              items={items}
              centered
            />

            <Form.Item>
              <Button
                type="primary"
                onClick={handleSubmit}
                loading={loading}
                block
                size="large"
              >
                登录
              </Button>
            </Form.Item>

            <div className="form-footer">
              <Link to="/register">还没有账号？立即注册</Link>
            </div>
          </Form>
        </Card>
      </div>
    </div>
  );
};

export default Login;
