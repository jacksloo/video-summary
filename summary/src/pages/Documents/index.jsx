import React, { useState, useEffect } from "react";
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  message,
  Tag,
  Tooltip,
  Tabs,
  Upload,
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  FileTextOutlined,
  EyeOutlined,
  VideoCameraOutlined,
  UploadOutlined,
  FileAddOutlined,
} from "@ant-design/icons";
import request from "../../utils/request";
import styles from "./index.css";

const { TabPane } = Tabs;

const Documents = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [editingDocument, setEditingDocument] = useState(null);
  const [documentType, setDocumentType] = useState("video"); // video 或 text
  const [activeTab, setActiveTab] = useState("transcription");
  const [form] = Form.useForm();
  const [uploadForm] = Form.useForm();

  // 加载文档列表
  const loadDocuments = async () => {
    setLoading(true);
    try {
      const response = await request.get(
        `/api/${
          documentType === "video" ? "video-documents" : "text-documents"
        }`
      );
      setDocuments(response.data);
    } catch (error) {
      message.error("加载文档失败：" + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [documentType]);

  // 处理编辑文档
  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      if (editingDocument) {
        if (documentType === "video") {
          await request.put(
            `/api/video-documents/${editingDocument.id}/${activeTab}`,
            values
          );
        } else {
          await request.put(
            `/api/text-documents/${editingDocument.id}`,
            values
          );
        }
        message.success("文档更新成功");
      }
      setModalVisible(false);
      form.resetFields();
      setEditingDocument(null);
      loadDocuments();
    } catch (error) {
      message.error("操作失败：" + error.message);
    }
  };

  // 处理删除文档
  const handleDelete = async (id) => {
    try {
      await request.delete(
        `/api/${
          documentType === "video" ? "video-documents" : "text-documents"
        }/${id}`
      );
      message.success("文档删除成功");
      loadDocuments();
    } catch (error) {
      message.error("删除失败：" + error.message);
    }
  };

  // 处理文件上传
  const handleUpload = async (file) => {
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = JSON.parse(e.target.result);
          const values = await uploadForm.validateFields();
          await request.post("/api/text-documents", {
            ...values,
            content: content.text || content.content || "",
          });
          message.success("文档上传成功");
          setUploadModalVisible(false);
          uploadForm.resetFields();
          if (documentType === "text") {
            loadDocuments();
          }
        } catch (error) {
          message.error("JSON解析失败：" + error.message);
        }
      };
      reader.readAsText(file);
      return false; // 阻止自动上传
    } catch (error) {
      message.error("文件读取失败：" + error.message);
      return false;
    }
  };

  // 视频文档的表格列
  const videoColumns = [
    {
      title: "视频名称",
      dataIndex: "videoTitle",
      key: "videoTitle",
      render: (text) => (
        <Space>
          <VideoCameraOutlined />
          <span>{text}</span>
        </Space>
      ),
    },
    {
      title: "转录文本预览",
      dataIndex: "transcription",
      key: "transcription",
      ellipsis: {
        showTitle: false,
      },
      render: (text) => (
        <Tooltip placement="topLeft" title={text}>
          {text || "暂无转录文本"}
        </Tooltip>
      ),
    },
    {
      title: "摘要预览",
      dataIndex: "summary",
      key: "summary",
      ellipsis: {
        showTitle: false,
      },
      render: (text) => (
        <Tooltip placement="topLeft" title={text}>
          {text || "暂无摘要"}
        </Tooltip>
      ),
    },
    {
      title: "语言",
      dataIndex: "language",
      key: "language",
      render: (text) => text && <Tag color="blue">{text.toUpperCase()}</Tag>,
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (text) => new Date(text).toLocaleString(),
    },
    {
      title: "操作",
      key: "action",
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => {
              setEditingDocument(record);
              form.setFieldsValue({
                videoTitle: record.videoTitle,
                content: record[activeTab],
                language: record.language,
              });
              setModalVisible(true);
            }}
          >
            查看
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingDocument(record);
              form.setFieldsValue({
                videoTitle: record.videoTitle,
                content: record[activeTab],
                language: record.language,
              });
              setModalVisible(true);
            }}
          >
            编辑
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  // 纯文本文档的表格列
  const textColumns = [
    {
      title: "标题",
      dataIndex: "title",
      key: "title",
      render: (text) => (
        <Space>
          <FileTextOutlined />
          <span>{text}</span>
        </Space>
      ),
    },
    {
      title: "内容预览",
      dataIndex: "content",
      key: "content",
      ellipsis: {
        showTitle: false,
      },
      render: (text) => (
        <Tooltip placement="topLeft" title={text}>
          {text}
        </Tooltip>
      ),
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (text) => new Date(text).toLocaleString(),
    },
    {
      title: "操作",
      key: "action",
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => {
              setEditingDocument(record);
              form.setFieldsValue(record);
              setModalVisible(true);
            }}
          >
            查看
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingDocument(record);
              form.setFieldsValue(record);
              setModalVisible(true);
            }}
          >
            编辑
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className={styles.container}>
      <Card
        title="文档管理"
        extra={
          documentType === "text" && (
            <Button
              type="primary"
              icon={<FileAddOutlined />}
              onClick={() => setUploadModalVisible(true)}
            >
              上传文档
            </Button>
          )
        }
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Tabs activeKey={documentType} onChange={setDocumentType}>
            <TabPane tab="视频文档" key="video"></TabPane>
            <TabPane tab="纯文本文档" key="text" />
          </Tabs>
          <Table
            columns={documentType === "video" ? videoColumns : textColumns}
            dataSource={documents}
            rowKey="id"
            loading={loading}
          />
        </Space>
      </Card>

      {/* 编辑/查看模态框 */}
      <Modal
        title={`${editingDocument ? "编辑" : "查看"}${
          documentType === "video"
            ? activeTab === "transcription"
              ? "转录文本"
              : "视频摘要"
            : "文档"
        }`}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setEditingDocument(null);
        }}
        width={800}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name={documentType === "video" ? "videoTitle" : "title"}
            label={documentType === "video" ? "视频名称" : "标题"}
          >
            <Input disabled={documentType === "video"} />
          </Form.Item>
          <Form.Item name="content" label="内容">
            <Input.TextArea rows={10} />
          </Form.Item>
          {documentType === "video" && activeTab === "transcription" && (
            <Form.Item name="language" label="语言">
              <Input disabled />
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* 上传文档模态框 */}
      <Modal
        title="上传文档"
        open={uploadModalVisible}
        onOk={() => {}}
        onCancel={() => {
          setUploadModalVisible(false);
          uploadForm.resetFields();
        }}
        footer={null}
      >
        <Form form={uploadForm} layout="vertical">
          <Form.Item
            name="title"
            label="文档标题"
            rules={[{ required: true, message: "请输入文档标题" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="file"
            label="JSON文件"
            rules={[{ required: true, message: "请选择要上传的JSON文件" }]}
          >
            <Upload.Dragger
              accept=".json"
              beforeUpload={handleUpload}
              showUploadList={false}
            >
              <p className="ant-upload-drag-icon">
                <UploadOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
              <p className="ant-upload-hint">
                支持单个或批量上传，仅支持 JSON 格式文件
              </p>
            </Upload.Dragger>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Documents;
