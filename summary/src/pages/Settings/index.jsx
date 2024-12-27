import React, { useState } from "react";
import {
  Card,
  Form,
  Switch,
  Button,
  Divider,
  Select,
  InputNumber,
  message,
  Anchor,
  Space,
  Row,
  Col,
} from "antd";
import "./index.css";

const Settings = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    try {
      setLoading(true);
      console.log("系统设置:", values);
      message.success("设置保存成功");
    } catch (error) {
      message.error(
        "保存失败：" + (error.response?.data?.detail || "未知错误")
      );
    } finally {
      setLoading(false);
    }
  };

  const settingSections = [
    {
      key: "basic",
      title: "基础设置",
      items: [
        {
          name: "darkMode",
          label: "深色模式",
          component: <Switch />,
          valuePropName: "checked",
        },
        {
          name: "language",
          label: "语言",
          component: (
            <Select>
              <Select.Option value="zh_CN">简体中文</Select.Option>
              <Select.Option value="en_US">English</Select.Option>
            </Select>
          ),
        },
      ],
    },
    {
      key: "video",
      title: "视频设置",
      items: [
        {
          name: "videoQuality",
          label: "默认视频质量",
          component: (
            <Select>
              <Select.Option value="1080p">1080p</Select.Option>
              <Select.Option value="720p">720p</Select.Option>
              <Select.Option value="480p">480p</Select.Option>
            </Select>
          ),
        },
        {
          name: "aspectRatio",
          label: "默认画面比例",
          tooltip: "设置视频的默认显示比例",
          component: (
            <Select>
              <Select.Option value="auto">自动</Select.Option>
              <Select.Option value="16:9">16:9 宽屏</Select.Option>
              <Select.Option value="4:3">4:3 标准</Select.Option>
              <Select.Option value="1:1">1:1 正方形</Select.Option>
              <Select.Option value="9:16">9:16 竖屏</Select.Option>
              <Select.Option value="custom">自定义</Select.Option>
            </Select>
          ),
        },
        {
          name: "maxConcurrent",
          label: "最大并发处理数",
          tooltip: "同时处理的最大视频数量",
          component: <InputNumber min={1} max={5} />,
        },
        {
          name: "autoSave",
          label: "自动保存",
          tooltip: "自动保存处理结果",
          component: <Switch />,
          valuePropName: "checked",
        },
      ],
    },
    {
      key: "notification",
      title: "通知设置",
      items: [
        {
          name: "notifications",
          label: "启用通知",
          component: <Switch />,
          valuePropName: "checked",
        },
      ],
    },
  ];

  return (
    <div className="settings-layout">
      <div className="settings-header">
        <h2>系统设置</h2>
        <Button type="primary" onClick={() => form.submit()} loading={loading}>
          保存设置
        </Button>
      </div>
      <Row gutter={24} className="settings-content">
        <Col span={4}>
          <Anchor
            className="settings-anchor"
            items={settingSections.map((section) => ({
              key: section.key,
              href: `#${section.key}`,
              title: section.title,
            }))}
          />
        </Col>
        <Col span={20}>
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            initialValues={{
              darkMode: false,
              language: "zh_CN",
              videoQuality: "720p",
              aspectRatio: "16:9",
              maxConcurrent: 3,
              autoSave: true,
              notifications: true,
            }}
          >
            {settingSections.map((section) => (
              <Card
                key={section.key}
                id={section.key}
                title={section.title}
                className="settings-section"
              >
                {section.items.map((item) => (
                  <Form.Item
                    key={item.name}
                    name={item.name}
                    label={item.label}
                    tooltip={item.tooltip}
                    valuePropName={item.valuePropName}
                  >
                    {item.component}
                  </Form.Item>
                ))}
              </Card>
            ))}
          </Form>
        </Col>
      </Row>
    </div>
  );
};

export default Settings;
