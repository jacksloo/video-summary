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
  Tree,
  Divider,
  Tooltip,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  BookOutlined,
} from "@ant-design/icons";
import request from "../../utils/request";
import styles from "./index.module.css";

const Dictionary = () => {
  const [dictionaries, setDictionaries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDict, setEditingDict] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [form] = Form.useForm();

  // 加载字典数据
  const loadDictionaries = async () => {
    setLoading(true);
    try {
      const response = await request.get("/api/dictionaries");
      setDictionaries(response.data);
    } catch (error) {
      message.error("加载数据字典失败：" + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDictionaries();
  }, []);

  // 处理新建/编辑字典
  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      if (editingDict) {
        await request.put(`/api/dictionaries/${editingDict.id}`, values);
        message.success("字典更新成功");
      } else {
        await request.post("/api/dictionaries", {
          ...values,
          type: selectedType,
        });
        message.success("字典创建成功");
      }
      setModalVisible(false);
      form.resetFields();
      setEditingDict(null);
      loadDictionaries();
    } catch (error) {
      message.error("操作失败：" + error.message);
    }
  };

  // 处理删除字典
  const handleDelete = async (id) => {
    try {
      await request.delete(`/api/dictionaries/${id}`);
      message.success("字典删除成功");
      loadDictionaries();
    } catch (error) {
      message.error("删除失败：" + error.message);
    }
  };

  // 预设的字典类型
  const defaultTypes = [
    {
      title: "视频",
      key: "video",
      icon: <BookOutlined />,
      children: [
        {
          title: "画面比例",
          key: "video.aspect_ratio",
          icon: <BookOutlined />,
        },
        {
          title: "分辨率",
          key: "video.resolution",
          icon: <BookOutlined />,
        },
        {
          title: "编码格式",
          key: "video.codec",
          icon: <BookOutlined />,
        },
        {
          title: "帧率",
          key: "video.fps",
          icon: <BookOutlined />,
        },
      ],
    },
    {
      title: "音频",
      key: "audio",
      icon: <BookOutlined />,
      children: [
        {
          title: "采样率",
          key: "audio.sample_rate",
          icon: <BookOutlined />,
        },
        {
          title: "比特率",
          key: "audio.bitrate",
          icon: <BookOutlined />,
        },
        {
          title: "声道",
          key: "audio.channels",
          icon: <BookOutlined />,
        },
        {
          title: "编码格式",
          key: "audio.codec",
          icon: <BookOutlined />,
        },
      ],
    },
    {
      title: "转录",
      key: "transcription",
      icon: <BookOutlined />,
      children: [
        {
          title: "语言",
          key: "transcription.language",
          icon: <BookOutlined />,
        },
        {
          title: "模型",
          key: "transcription.model",
          icon: <BookOutlined />,
        },
        {
          title: "质量",
          key: "transcription.quality",
          icon: <BookOutlined />,
        },
      ],
    },
    {
      title: "摘要",
      key: "summary",
      icon: <BookOutlined />,
      children: [
        {
          title: "风格",
          key: "summary.style",
          icon: <BookOutlined />,
        },
        {
          title: "长度",
          key: "summary.length",
          icon: <BookOutlined />,
        },
        {
          title: "模型",
          key: "summary.model",
          icon: <BookOutlined />,
        },
      ],
    },
    {
      title: "字幕",
      key: "subtitle",
      icon: <BookOutlined />,
      children: [
        {
          title: "格式",
          key: "subtitle.format",
          icon: <BookOutlined />,
        },
        {
          title: "语言",
          key: "subtitle.language",
          icon: <BookOutlined />,
        },
        {
          title: "字体",
          key: "subtitle.font",
          icon: <BookOutlined />,
        },
        {
          title: "位置",
          key: "subtitle.position",
          icon: <BookOutlined />,
        },
      ],
    },
  ];

  // 修改构建树形数据的方法
  const buildTreeData = () => {
    // 获取已有的字典类型
    const existingTypes = [...new Set(dictionaries.map((item) => item.type))];

    // 合并预设类型和已有类型
    return defaultTypes.map((type) => {
      // 如果是有子类的类型
      if (type.children) {
        return {
          ...type,
          children: type.children.map((child) => ({
            ...child,
            isLeaf: true,
          })),
        };
      }
      // 没有子类的类型
      return {
        ...type,
        isLeaf: true,
      };
    });
  };

  // 修改选择处理方法
  const handleTreeSelect = (selectedKeys, info) => {
    if (selectedKeys.length > 0) {
      const key = selectedKeys[0];
      // 如果选中的是父节点，不显示表格内容
      if (info.node.children) {
        setSelectedType(null);
      } else {
        setSelectedType(key);
      }
    } else {
      setSelectedType(null);
    }
  };

  // 修改表格过滤方法
  const filterDictionaries = () => {
    if (!selectedType) return [];
    return dictionaries.filter((item) => item.type === selectedType);
  };

  // 表格列定义
  const columns = [
    {
      title: "键名",
      dataIndex: "key",
      key: "key",
    },
    {
      title: "值",
      dataIndex: "value",
      key: "value",
    },
    {
      title: "描述",
      dataIndex: "description",
      key: "description",
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
      title: "操作",
      key: "action",
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingDict(record);
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
      <Card title="数据字典">
        <div className={styles.layout}>
          <div className={styles.sider}>
            <Tree
              treeData={buildTreeData()}
              onSelect={handleTreeSelect}
              selectedKeys={selectedType ? [selectedType] : []}
              defaultExpandAll
            />
          </div>
          <Divider type="vertical" className={styles.divider} />
          <div className={styles.content}>
            <div className={styles.toolbar}>
              {selectedType && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setEditingDict(null);
                    form.resetFields();
                    setModalVisible(true);
                  }}
                >
                  新建字典项
                </Button>
              )}
            </div>
            <Table
              columns={columns}
              dataSource={filterDictionaries()}
              rowKey="id"
              loading={loading}
            />
          </div>
        </div>
      </Card>

      <Modal
        title={editingDict ? "编辑字典项" : "新建字典项"}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setEditingDict(null);
        }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="key"
            label="键名"
            rules={[{ required: true, message: "请输入键名" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="value"
            label="值"
            rules={[{ required: true, message: "请输入值" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Dictionary;
