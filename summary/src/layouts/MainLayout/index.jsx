import React from "react";
import { Layout, Menu, Avatar, Dropdown, Space } from "antd";
import {
  UserOutlined,
  VideoCameraOutlined,
  LogoutOutlined,
  HomeOutlined,
  SettingOutlined,
  FileTextOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import Logo from "../../assets/logo";
import "./index.css";

const { Header, Sider, Content } = Layout;

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const username = localStorage.getItem("username") || "用户";

  const menuItems = [
    {
      key: "/home",
      icon: <HomeOutlined />,
      label: "首页",
    },
    {
      key: "/videos",
      icon: <VideoCameraOutlined />,
      label: "视频管理",
    },
    {
      key: "/documents",
      icon: <FileTextOutlined />,
      label: "文档管理",
    },
    {
      key: "/team",
      icon: <TeamOutlined />,
      label: "团队协作",
    },
    {
      key: "/settings",
      icon: <SettingOutlined />,
      label: "系统设置",
    },
  ];

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
      label: "退出登录",
      danger: true,
    },
  ];

  const handleMenuClick = (e) => {
    navigate(e.key);
  };

  const handleUserMenuClick = ({ key }) => {
    if (key === "logout") {
      localStorage.removeItem("token");
      localStorage.removeItem("username");
      navigate("/login");
    } else if (key === "profile") {
      navigate("/profile");
    } else if (key === "settings") {
      navigate("/settings");
    }
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider width={200} theme="dark">
        <div className="logo">
          <Logo className="logo-icon" />
          <span className="logo-text">视频摘要助手</span>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: "0 16px", background: "#fff" }}>
          <div className="header-content">
            <div className="header-left">{/* 可以添加面包屑导航等 */}</div>
            <div className="header-right">
              <Dropdown
                menu={{
                  items: userMenuItems,
                  onClick: handleUserMenuClick,
                }}
              >
                <Space style={{ cursor: "pointer" }}>
                  <Avatar
                    icon={<UserOutlined />}
                    style={{ backgroundColor: "#1890ff" }}
                  />
                  <span>{username}</span>
                </Space>
              </Dropdown>
            </div>
          </div>
        </Header>
        <Content style={{ margin: "24px 16px", minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
