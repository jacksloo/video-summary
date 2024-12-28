import React, { useState, useEffect } from "react";
import {
  Table,
  Button,
  Space,
  Input,
  Select,
  Card,
  message,
  Tooltip,
  Form,
  Modal,
  Alert,
  ExclamationCircleOutlined,
} from "antd";
import {
  DeleteOutlined,
  PlusOutlined,
  FolderOpenOutlined,
  EyeOutlined,
  CloudUploadOutlined,
  LinkOutlined,
} from "@ant-design/icons";
import request from "../../utils/request";
import FolderSelector from "../../components/FolderSelector";
import "./index.css";
import { useNavigate } from "react-router-dom";
import axios from "axios";
const { Option } = Select;

const VideoList = () => {
  const [form] = Form.useForm();
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [isSettingModalVisible, setIsSettingModalVisible] = useState(false);
  const [sourceType, setSourceType] = useState("LOCAL");
  const [duplicateError, setDuplicateError] = useState(null);
  const navigate = useNavigate();

  const sourceTypes = [
    {
      value: "LOCAL",
      label: "本地文件夹",
      icon: <FolderOpenOutlined />,
    },
    {
      value: "CLOUD",
      label: "云存储",
      icon: <CloudUploadOutlined />,
    },
    {
      value: "URL",
      label: "网络链接",
      icon: <LinkOutlined />,
    },
  ];

  // 获取视频源列表的函数
  const fetchSources = async () => {
    const controller = new AbortController();
    try {
      setLoading(true);
      const response = await request.get("/api/videos/sources", {
        signal: controller.signal,
      });
      setSources(response.data);
    } catch (error) {
      if (!axios.isCancel(error)) {
        console.error("获取视频源失败:", error);
        message.error("获取视频源失败");
      }
    } finally {
      setLoading(false);
    }
    return controller;
  };

  // 初始加载时获取视频源列表
  useEffect(() => {
    let controller;
    const loadSources = async () => {
      controller = await fetchSources();
    };
    loadSources();
    return () => {
      if (controller) {
        controller.abort();
      }
    };
  }, []);

  // 删除视频源
  const handleDelete = async (record) => {
    try {
      await request.delete(`/api/videos/sources/${record.id}`);
      message.success("删除成功");
      fetchSources(); // 刷新列表
    } catch (error) {
      console.error("删除失败:", error);
      message.error(error.response?.data?.detail || "删除失败，请重试");
    }
  };

  // 表格选择配置
  const rowSelection = {
    selectedRowKeys: selectedRows.map((row) => row.id),
    onChange: (selectedRowKeys, selectedRows) => {
      setSelectedRows(selectedRows);
    },
  };

  // 取消添加来源
  const handleSettingModalCancel = () => {
    setIsSettingModalVisible(false);
    form.resetFields();
    setDuplicateError(null);
  };

  // 渲染设置表单
  const renderSettingForm = () => {
    return (
      <>
        {duplicateError && (
          <Alert
            message="路径重复"
            description={duplicateError}
            type="error"
            showIcon
            closable
            onClose={() => setDuplicateError(null)}
            style={{ marginBottom: 16 }}
          />
        )}
        <Form.Item
          name="type"
          label="来源类型"
          initialValue="LOCAL"
          rules={[{ required: true, message: "请选择来源类型" }]}
        >
          <Select
            value={sourceType}
            onChange={(value) => {
              setSourceType(value);
              form.setFieldsValue({ type: value });
            }}
          >
            {sourceTypes.map((type) => (
              <Option key={type.value} value={type.value}>
                {type.icon} {type.label}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {sourceType === "LOCAL" ? (
          <Form.Item
            name="path"
            label="文件夹路径"
            rules={[
              { required: true, message: "请选择文件夹" },
              {
                validator: async (_, value) => {
                  if (!value) return;
                  // 检查是否已存在相同路径
                  const existingSource = sources.find((s) => s.path === value);
                  if (existingSource) {
                    throw new Error("该路径已被添加，请选择其他路径");
                  }
                },
              },
            ]}
            help={
              <span style={{ color: "#ff4d4f" }}>每个文件夹只能添加一次</span>
            }
          >
            <FolderSelector />
          </Form.Item>
        ) : sourceType === "CLOUD" ? (
          <>
            <Form.Item
              name="cloudService"
              label="云存储服务"
              rules={[{ required: true, message: "请选择云存储服务" }]}
            >
              <Select>
                <Option value="oss">阿��云 OSS</Option>
                <Option value="cos">腾讯云 COS</Option>
                <Option value="obs">华为云 OBS</Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="config"
              label="配置信息"
              rules={[
                { required: true, message: "请输入配置信息" },
                {
                  validator: (_, value) => {
                    try {
                      if (value) JSON.parse(value);
                      return Promise.resolve();
                    } catch (e) {
                      return Promise.reject(
                        new Error("配置信息必须是有效的 JSON")
                      );
                    }
                  },
                },
              ]}
            >
              <Input.TextArea
                rows={4}
                placeholder="请输入 JSON 格式的配置信息"
              />
            </Form.Item>
          </>
        ) : (
          <Form.Item
            name="path"
            label="URL"
            rules={[
              { required: true, message: "请输入 URL" },
              { type: "url", message: "请输入有效的 URL" },
              {
                validator: async (_, value) => {
                  if (!value) return;
                  const existingSource = sources.find((s) => s.path === value);
                  if (existingSource) {
                    throw new Error("该 URL 已被添加，请输入其他 URL");
                  }
                },
              },
            ]}
            help="每个 URL 只能添加一次"
          >
            <Input placeholder="请输入视频源 URL" />
          </Form.Item>
        )}

        <Form.Item
          name="name"
          label="来源名称"
          rules={[{ required: true, message: "请输入来源名称" }]}
        >
          <Input placeholder="请输入便于识别的来源名称" />
        </Form.Item>
      </>
    );
  };

  const handleSettingModalOk = async () => {
    let values;
    try {
      values = await form.validateFields();
      console.log("发送的数据:", values);
      const response = await request.post("/api/videos/sources/", values);
      message.success("添加来源成功");
      setIsSettingModalVisible(false);
      form.resetFields();
      setDuplicateError(null);
      fetchSources(); // 刷新列表
    } catch (error) {
      console.error("添加来源失败:", error);
      if (error.response) {
        console.error("错误响应:", error.response);
        if (error.response.status === 409) {
          setDuplicateError(
            error.response.data?.detail || "该路径已被添加，请选择其他路径"
          );
          if (values?.path) {
            const existingSource = sources.find((s) => s.path === values.path);
            if (existingSource) {
              // TODO: 可以添加高亮效果
            }
          }
        } else {
          message.error(error.response.data?.detail || "添加来源失败，请重试");
        }
      } else {
        message.error("网络错误，请检查网络连接");
      }
    }
  };

  // 进入文件夹
  const handleEnterFolder = (record) => {
    console.log("进入文件夹：", record);
    navigate(`/videos/folder/${record.id}`, {
      state: {
        sourceId: record.id,
        path: record.path,
        name: record.name,
      },
    });
  };

  // 表格列定义
  const columns = [
    {
      title: "名称",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "类型",
      dataIndex: "type",
      key: "type",
      render: (type) => {
        const types = {
          LOCAL: "本地文件夹",
          CLOUD: "云存储",
          URL: "网络链接",
        };
        return types[type] || type;
      },
    },
    {
      title: "路径",
      dataIndex: "path",
      key: "path",
      ellipsis: true,
    },
    {
      title: "操作",
      key: "action",
      width: 200,
      render: (_, record) => (
        <Space size="middle">
          {record.type === "LOCAL" && (
            <Tooltip title="浏览文件夹">
              <Button
                type="text"
                icon={<EyeOutlined />}
                onClick={() => handleEnterFolder(record)}
              />
            </Tooltip>
          )}
          <Tooltip title="删除">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="video-list">
      <Card
        title="视频来源"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsSettingModalVisible(true)}
          >
            添加来源
          </Button>
        }
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={sources}
          loading={loading}
          rowSelection={rowSelection}
          onRow={(record) => ({
            onDoubleClick: () => handleEnterFolder(record),
            style: {
              cursor: record.type === "LOCAL" ? "pointer" : "default",
            },
          })}
        />
      </Card>

      {/* 设置弹窗 */}
      <Modal
        title="添加视频来源"
        open={isSettingModalVisible}
        onOk={handleSettingModalOk}
        onCancel={handleSettingModalCancel}
        okText="确定"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          {renderSettingForm()}
        </Form>
      </Modal>
    </div>
  );
};

export default VideoList;
