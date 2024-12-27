import React, { useState } from "react";
import { Form, Input, Button, Card, message, Alert } from "antd";
import {
  UserOutlined,
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
} from "@ant-design/icons";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import Logo from "../../assets/logo";
import "./index.css";

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [errorMessage, setErrorMessage] = useState("");

  const onFinish = async (values) => {
    setLoading(true);
    setErrorMessage("");
    try {
      const response = await axios.post(
        "http://localhost:8000/api/auth/register",
        {
          username: values.username,
          password: values.password,
          email: values.email,
          phone: values.phone,
        }
      );

      if (response.status === 200) {
        message.success("注册成功！");
        navigate("/login");
      }
    } catch (error) {
      let errorMsg = "注册失败";
      if (error.response) {
        errorMsg = error.response.data.detail || "注册失败，请重试";
      }
      setErrorMessage(errorMsg);
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-content">
        <Card className="register-card">
          <div className="login-header">
            <div className="title-with-logo">
              <Logo className="title-logo" />
              <div className="title-content">
                <h2>视频摘要助手 - 注册</h2>
                <p className="subtitle">智能生成视频摘要，提升观看效率</p>
              </div>
            </div>
          </div>

          <Form
            form={form}
            name="register"
            onFinish={onFinish}
            autoComplete="off"
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

            <Form.Item
              name="username"
              rules={[
                { required: true, message: "请输入用户名！" },
                { min: 3, message: "用户名至少3个字符！" },
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="用户名"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="email"
              rules={[
                { required: true, message: "请输入邮箱！" },
                { type: "email", message: "请输入有效的邮箱地址！" },
              ]}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder="邮箱"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="phone"
              rules={[
                { required: true, message: "请输入手机号！" },
                { pattern: /^1[3-9]\d{9}$/, message: "请输入有效的手机号！" },
              ]}
            >
              <Input
                prefix={<PhoneOutlined />}
                placeholder="手机号"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: "请输入密码！" },
                { min: 6, message: "密码至少6个字符！" },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="密码"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              dependencies={["password"]}
              rules={[
                { required: true, message: "请确认密码！" },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue("password") === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error("两次输入的密码不一致！"));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="确认密码"
                size="large"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                size="large"
              >
                注册
              </Button>
            </Form.Item>

            <div className="form-footer">
              <Link to="/login">已有账号？立即登录</Link>
            </div>
          </Form>
        </Card>
      </div>
    </div>
  );
};

export default Register;
