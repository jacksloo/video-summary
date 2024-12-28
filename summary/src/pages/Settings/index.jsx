import React, { useEffect, useState } from "react";
import {
  Card,
  Form,
  Input,
  Button,
  Select,
  Switch,
  message,
  Radio,
  InputNumber,
  Divider,
  Space,
  Tooltip,
  Menu,
  Layout,
} from "antd";
import {
  QuestionCircleOutlined,
  BgColorsOutlined,
  AudioOutlined,
  FileTextOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import request from "../../utils/request";
import styles from "./index.module.css";

const { Option } = Select;
const { Sider, Content } = Layout;

const Settings = () => {
  const [form] = Form.useForm();
  const [selectedKey, setSelectedKey] = useState("theme");

  // 加载用户设置
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await request.get("/api/settings");
        form.setFieldsValue(response.data);
      } catch (error) {
        message.error(
          "加载设置失败：" + (error.response?.data?.detail || error.message)
        );
      }
    };
    loadSettings();
  }, [form]);

  const onFinish = async (values) => {
    try {
      await request.post("/api/settings", values);
      message.success("设置保存成功");
      // 如果主题发生变化，立即应用
      if (values.theme?.mode !== form.getFieldValue(["theme", "mode"])) {
        applyTheme(values.theme.mode);
      }
    } catch (error) {
      message.error(
        "保存设置失败：" + (error.response?.data?.detail || error.message)
      );
    }
  };

  // 应用主题
  const applyTheme = (mode) => {
    document.body.className = mode === "dark" ? "dark-theme" : "light-theme";
  };

  const menuItems = [
    {
      key: "theme",
      icon: <BgColorsOutlined />,
      label: "主题设置",
    },
    {
      key: "transcription",
      icon: <AudioOutlined />,
      label: "转录设置",
    },
    {
      key: "summary",
      icon: <FileTextOutlined />,
      label: "摘要设置",
    },
    {
      key: "system",
      icon: <SettingOutlined />,
      label: "系统设置",
    },
  ];

  // 渲染设置内容
  const renderSettingContent = () => {
    switch (selectedKey) {
      case "theme":
        return (
          <>
            <h3>主题设置</h3>
            <Form.Item name={["theme", "mode"]} label="主题模式">
              <Radio.Group>
                <Radio.Button value="light">浅色主题</Radio.Button>
                <Radio.Button value="dark">深色主题</Radio.Button>
                <Radio.Button value="system">跟随系统</Radio.Button>
              </Radio.Group>
            </Form.Item>

            <Form.Item name={["theme", "primaryColor"]} label="主题色">
              <Radio.Group>
                <Radio.Button value="#1890ff">默认蓝</Radio.Button>
                <Radio.Button value="#52c41a">清新绿</Radio.Button>
                <Radio.Button value="#722ed1">典雅紫</Radio.Button>
                <Radio.Button value="#f5222d">中国红</Radio.Button>
              </Radio.Group>
            </Form.Item>

            <Form.Item
              name={["theme", "compactMode"]}
              label="紧凑模式"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </>
        );
      case "transcription":
        return (
          <>
            <h3>转录设置</h3>
            <Form.Item
              name={["transcription", "model"]}
              label={
                <Space>
                  转录模型
                  <Tooltip title="更大的模型准确度更高，但处理速度较慢">
                    <QuestionCircleOutlined />
                  </Tooltip>
                </Space>
              }
            >
              <Select>
                <Option value="distil-large-v3">Whisper Large V3</Option>
                <Option value="distil-medium">Whisper Medium</Option>
                <Option value="distil-small">Whisper Small</Option>
              </Select>
            </Form.Item>

            <Form.Item name={["transcription", "language"]} label="默认语言">
              <Select>
                <Option value="zh">中文</Option>
                <Option value="en">英文</Option>
                <Option value="auto">自动检测</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name={["transcription", "autoStart"]}
              label="自动开始转录"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              name={["transcription", "chunkSize"]}
              label="分段长度（秒）"
              tooltip="视频转录时的分段长度，较短的分段可以更快得到结果"
            >
              <InputNumber min={10} max={60} />
            </Form.Item>
          </>
        );
      case "summary":
        return (
          <>
            <h3>摘要设置</h3>
            <Form.Item name={["summary", "model"]} label="摘要模型">
              <Select>
                <Option value="gpt-3.5-turbo">GPT-3.5</Option>
                <Option value="gpt-4">GPT-4</Option>
              </Select>
            </Form.Item>

            <Form.Item name={["summary", "maxLength"]} label="最大长度">
              <InputNumber min={100} max={2000} />
            </Form.Item>

            <Form.Item name={["summary", "style"]} label="摘要风格">
              <Select>
                <Option value="concise">简洁</Option>
                <Option value="detailed">详细</Option>
                <Option value="bullet">要点</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name={["summary", "autoSummarize"]}
              label="自动生成摘要"
              valuePropName="checked"
              tooltip="转录完成后自动生成摘要"
            >
              <Switch />
            </Form.Item>
          </>
        );
      case "system":
        return (
          <>
            <h3>系统设置</h3>
            <Form.Item
              name={["system", "autoSave"]}
              label="自动保存"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              name={["system", "saveInterval"]}
              label="保存间隔（分钟）"
            >
              <InputNumber min={1} max={30} />
            </Form.Item>

            <Form.Item
              name={["system", "notifications"]}
              label="系统通知"
              valuePropName="checked"
              tooltip="启用桌面通知"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              name={["system", "defaultVideoPath"]}
              label="默认视频目录"
              tooltip="设置默认的视频文件目录"
            >
              <Input placeholder="请输入默认视频目录路径" />
            </Form.Item>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <Card title="系统设置" className={styles.settingsCard}>
      <Layout className={styles.settingsLayout}>
        <Sider width={200} className={styles.settingsSider}>
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            items={menuItems}
            onClick={({ key }) => setSelectedKey(key)}
            style={{ height: "100%" }}
          />
        </Sider>
        <Content className={styles.settingsContent}>
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            initialValues={{
              theme: {
                mode: "light",
                primaryColor: "#1890ff",
                compactMode: false,
              },
              transcription: {
                model: "distil-large-v3",
                language: "zh",
                autoStart: true,
                chunkSize: 30,
              },
              summary: {
                model: "gpt-3.5-turbo",
                maxLength: 500,
                style: "concise",
                autoSummarize: true,
              },
              system: {
                autoSave: true,
                saveInterval: 5,
                notifications: true,
                defaultVideoPath: "",
              },
            }}
          >
            {renderSettingContent()}
            <Divider />
            <Form.Item>
              <Button type="primary" htmlType="submit">
                保存设置
              </Button>
            </Form.Item>
          </Form>
        </Content>
      </Layout>
    </Card>
  );
};

export default Settings;
