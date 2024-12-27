import React, { useState } from "react";
import { Layout, Menu, theme, Button, Dropdown, Avatar, message } from "antd";
import {
  UserOutlined,
  VideoCameraOutlined,
  UploadOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Logo from "../../assets/logo";
import "./index.css";
import Settings from "../Settings";
import VideoList from "../VideoList";

const { Header, Sider, Content } = Layout;

const Home = () => {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const {
    token: { colorBgContainer },
  } = theme.useToken();
  const [currentContent, setCurrentContent] = useState("videos");

  const username = localStorage.getItem("username") || "用户";

  // 处理菜单项点击
  const handleMenuClick = (key) => {
    switch (key) {
      case "1":
        setCurrentContent("videos");
        break;
      case "2":
        message.info("上传视频功能开发中");
        break;
      case "3":
        setCurrentContent("profile");
        break;
      case "4":
        setCurrentContent("settings");
        break;
      default:
        break;
    }
  };

  // 处理用户菜单点击
  const handleUserMenuClick = ({ key }) => {
    switch (key) {
      case "profile":
        setCurrentContent("profile");
        break;
      case "settings":
        setCurrentContent("settings");
        break;
      case "logout":
        handleLogout();
        break;
      default:
        break;
    }
  };

  const handleLogout = async () => {
    try {
      setLogoutLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "http://localhost:8000/api/auth/logout",
        null,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      localStorage.clear();
      message.success("退出���录成功");
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      if (error.response?.status !== 401) {
        message.error("退出失败���请重试");
      }
    } finally {
      setLogoutLoading(false);
    }
  };

  const userMenuItems = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "个人信息",
    },
    {
      key: "settings",
      icon: <SettingOutlined />,
      label: "账号设置",
    },
    {
      type: "divider",
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: logoutLoading ? "退出中..." : "退出登录",
      disabled: logoutLoading,
    },
  ];

  const menuItems = [
    {
      key: "1",
      icon: <VideoCameraOutlined />,
      label: "视频列表",
    },
    {
      key: "2",
      icon: <UploadOutlined />,
      label: "上传视频",
    },
    {
      key: "3",
      icon: <UserOutlined />,
      label: "个人中心",
    },
    {
      key: "4",
      icon: <SettingOutlined />,
      label: "系统设置",
    },
  ];

  const renderContent = () => {
    switch (currentContent) {
      case "settings":
        return <Settings />;
      case "profile":
        return <div>个人信息页面开发中</div>;
      case "videos":
        return <VideoList />;
      default:
        return <VideoList />;
    }
  };

  return (
    <Layout className="home-layout">
      <Sider
        width={200}
        theme="dark"
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
      >
        <div className="logo-container">
          <Logo />
          {!collapsed && <h1>视频摘要助手</h1>}
        </div>
        <Menu
          mode="inline"
          defaultSelectedKeys={["1"]}
          theme="dark"
          className="source-list"
          items={menuItems}
          onClick={({ key }) => handleMenuClick(key)}
        />
      </Sider>

      <Layout>
        <Header className="site-layout-header">
          <div className="header-content">
            <div className="header-left">
              <Button
                type="text"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed(!collapsed)}
                className="trigger-button"
              />
            </div>
            <div className="header-right">
              <Dropdown
                menu={{
                  items: userMenuItems,
                  onClick: handleUserMenuClick,
                }}
                placement="bottomRight"
                arrow
              >
                <div className="user-info">
                  <Avatar icon={<UserOutlined />} />
                  <span className="username">{username}</span>
                </div>
              </Dropdown>
            </div>
          </div>
        </Header>
        <Content className="site-layout-content">{renderContent()}</Content>
      </Layout>
    </Layout>
  );
};

export default Home;
