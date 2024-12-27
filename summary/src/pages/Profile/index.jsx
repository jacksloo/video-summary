import React, { useState, useEffect } from "react";
import {
  Card,
  Form,
  Input,
  Button,
  Avatar,
  Upload,
  message,
  Divider,
} from "antd";
import { UserOutlined, UploadOutlined } from "@ant-design/icons";
import axios from "axios";
import "./index.css";

const Profile = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    fetchUserInfo();
  }, []);

  const fetchUserInfo = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:8000/api/users/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setUserInfo(response.data);
      form.setFieldsValue({
        username: response.data.username,
        email: response.data.email,
        phone: response.data.phone,
      });
    } catch (error) {
      message.error("获取用户信息失败");
    }
  };

  const onFinish = async (values) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      await axios.put("http://localhost:8000/api/users/me", values, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      message.success("个人信息更新成功");
      fetchUserInfo();
    } catch (error) {
      message.error(
        "更新失败：" + (error.response?.data?.detail || "未知错误")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-container">
      <Card title="个人信息" className="profile-card">
        <div className="avatar-section">
          <Avatar size={100} icon={<UserOutlined />} />
          <Upload
            showUploadList={false}
            beforeUpload={(file) => {
              message.info("头像上传功能开发中");
              return false;
            }}
          >
            <Button icon={<UploadOutlined />}>更换头像</Button>
          </Upload>
        </div>
        <Divider />
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          className="profile-form"
        >
          <Form.Item
            label="用户名"
            name="username"
            rules={[{ required: true, message: "请输入用户���" }]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>

          <Form.Item
            label="邮箱"
            name="email"
            rules={[
              { required: true, message: "请输入邮箱" },
              { type: "email", message: "请输入有效的邮箱地址" },
            ]}
          >
            <Input placeholder="请输入邮箱" />
          </Form.Item>

          <Form.Item
            label="手机号"
            name="phone"
            rules={[
              { required: true, message: "请输入手机号" },
              { pattern: /^1[3-9]\d{9}$/, message: "请输入有效的手机号" },
            ]}
          >
            <Input placeholder="请输入手机号" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              保存修改
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Profile;
