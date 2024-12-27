import React, { useState, useEffect } from "react";
import {
  Input,
  Button,
  Modal,
  Table,
  Breadcrumb,
  Space,
  message,
  Tabs,
  List,
  Empty,
  Typography,
  Tree,
  Select,
} from "antd";
import {
  FolderOutlined,
  ArrowUpOutlined,
  HddOutlined,
  HomeOutlined,
  VerticalAlignTopOutlined,
  ReloadOutlined,
  FolderOpenOutlined,
  HistoryOutlined,
  StarOutlined,
  StarFilled,
  EyeOutlined,
  FileOutlined,
  DesktopOutlined,
  UserOutlined,
  DownloadOutlined,
  PictureOutlined,
  PlaySquareOutlined,
  FileTextOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
} from "@ant-design/icons";
import axios from "axios";
import "./index.css";

const formatSize = (gb) => {
  if (!gb) return "";
  return `${gb} GB`;
};

const formatDriveInfo = (record) => {
  if (!record.total) return "";
  return `可用 ${record.free}GB / 总共 ${record.total}GB`;
};

const isWindows = () => {
  return navigator.platform.toLowerCase().includes("win");
};

const getIcon = (isExpanded, isLeaf) => {
  if (isLeaf) return <FileOutlined />;
  return isExpanded ? <FolderOpenOutlined /> : <FolderOutlined />;
};

const QUICK_ACCESS_ITEMS = {
  desktop: {
    title: "桌面",
    icon: <DesktopOutlined />,
    key: "desktop",
    folderName: "Desktop",
  },
  documents: {
    title: "文档",
    icon: <FileTextOutlined />,
    key: "documents",
    folderName: "Documents",
  },
  downloads: {
    title: "下载",
    icon: <DownloadOutlined />,
    key: "downloads",
    folderName: "Downloads",
  },
  pictures: {
    title: "图片",
    icon: <PictureOutlined />,
    key: "pictures",
    folderName: "Pictures",
  },
  videos: {
    title: "视频",
    icon: <PlaySquareOutlined />,
    key: "videos",
    folderName: "Videos",
  },
};

const FolderSelector = ({ value, onChange }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentPath, setCurrentPath] = useState("");
  const [parentPath, setParentPath] = useState(null);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [drives, setDrives] = useState([]);
  const [specialFolders, setSpecialFolders] = useState({});
  const [activeFolder, setActiveFolder] = useState("");
  const [recentFolders, setRecentFolders] = useState([]);
  const [favoriteFolders, setFavoriteFolders] = useState([]);
  const [activeTab, setActiveTab] = useState("folders"); // folders, recent, favorite
  const [treeData, setTreeData] = useState([]);
  const [expandedKeys, setExpandedKeys] = useState([
    "quick-access",
    "computer",
  ]);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [showHidden, setShowHidden] = useState(false);
  const [defaultUserPath, setDefaultUserPath] = useState("");
  const [quickAccessNodes, setQuickAccessNodes] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [selectedFolderName, setSelectedFolderName] = useState("");
  const [searchText, setSearchText] = useState("");
  const [sortField, setSortField] = useState("name");
  const [sortOrder, setSortOrder] = useState("ascend");

  const getUserFolderPath = (folderName) => {
    const userPath = currentPath?.split(/[/\\]/).slice(0, 3).join("\\");
    return userPath ? `${userPath}\\${folderName}` : "";
  };

  const fetchDefaultPath = async () => {
    try {
      const response = await axios.get(
        "http://localhost:8000/api/files/default-path",
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      if (response.data.path) {
        setDefaultUserPath(response.data.path);
        const nodes = Object.entries(QUICK_ACCESS_ITEMS).map(([key, item]) => ({
          title: item.title,
          key: `quick-${key}`,
          path: `${response.data.path}\\${item.folderName}`,
          icon: item.icon,
          isLeaf: true,
          isQuickAccess: true,
        }));
        setQuickAccessNodes(nodes);
        fetchFolders(response.data.path);
      }
    } catch (error) {
      console.error("获取默认路径失败:", error);
      fetchFolders("");
    }
  };

  useEffect(() => {
    fetchDefaultPath();
  }, []);

  useEffect(() => {
    if (isModalVisible) {
      if (value) {
        fetchFolders(value);
      } else {
        fetchDefaultPath();
      }
    }
  }, [isModalVisible]);

  useEffect(() => {
    const recent = JSON.parse(localStorage.getItem("recentFolders") || "[]");
    const favorites = JSON.parse(
      localStorage.getItem("favoriteFolders") || "[]"
    );
    setRecentFolders(recent);
    setFavoriteFolders(favorites);
  }, []);

  const addToRecent = (path) => {
    const recent = recentFolders.filter((f) => f.path !== path);
    const newRecent = [
      { path, name: path.split(/[/\\]/).pop(), timestamp: Date.now() },
      ...recent,
    ].slice(0, 10); // 只保留最近10个
    setRecentFolders(newRecent);
    localStorage.setItem("recentFolders", JSON.stringify(newRecent));
  };

  const toggleFavorite = (path) => {
    const isFavorite = favoriteFolders.some((f) => f.path === path);
    let newFavorites;
    if (isFavorite) {
      newFavorites = favoriteFolders.filter((f) => f.path !== path);
      message.success("已取消收藏");
    } else {
      newFavorites = [
        ...favoriteFolders,
        { path, name: path.split(/[/\\]/).pop() },
      ];
      message.success("已添加到收藏夹");
    }
    setFavoriteFolders(newFavorites);
    localStorage.setItem("favoriteFolders", JSON.stringify(newFavorites));
  };

  const validatePath = async (path) => {
    try {
      console.log("Validating path:", path);
      const response = await axios.post(
        "http://localhost:8000/api/files/validate",
        { path },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      console.log("Validation response:", response.data);
      return response.data.valid;
    } catch (error) {
      console.error("Validation error:", error.response?.data || error);
      return false;
    }
  };

  const refreshCurrentFolder = () => {
    fetchFolders(currentPath);
  };

  const fetchFolders = async (path) => {
    try {
      setLoading(true);
      const response = await axios.get(
        `http://localhost:8000/api/files/folders?path=${encodeURIComponent(
          path
        )}&show_hidden=${showHidden}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      setCurrentPath(response.data.current_path);
      setParentPath(response.data.parent_path);
      setFolders(response.data.folders);
      if (!path && response.data.current_path) {
        setActiveFolder(response.data.current_path);
      }
      if (response.data.drives) {
        setDrives(response.data.drives);
      }
      if (response.data.special_folders) {
        setSpecialFolders(response.data.special_folders);
      }
    } catch (error) {
      console.error("获取文件夹列表失败:", error);
      if (error.response?.status === 403) {
        message.error("无权访问此文件夹");
      } else {
        message.error(
          "获取文件夹列表失败：" + (error.response?.data?.detail || "未知错误")
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (path) => {
    const isValid = await validatePath(path);
    if (!isValid) {
      message.error("选择的文件夹无效或无权访问");
      return;
    }
    onChange(path);
    addToRecent(path);
    setIsModalVisible(false);
  };

  const columns = [
    {
      title: "名称",
      dataIndex: "name",
      key: "name",
      render: (text, record) => (
        <div className="folder-item">
          {record.isDrive ? (
            <HddOutlined style={{ color: "#1890ff" }} />
          ) : record.path === activeFolder ? (
            <FolderOpenOutlined style={{ color: "#faad14" }} />
          ) : (
            <FolderOutlined style={{ color: "#faad14" }} />
          )}{" "}
          {text}
        </div>
      ),
    },
    {
      title: "类型",
      dataIndex: "type",
      key: "type",
      width: 120,
      render: (_, record) => record.type || "文件夹",
    },
    {
      title: "修改时间",
      dataIndex: "modified",
      key: "modified",
      width: 180,
      render: (modified) =>
        modified ? new Date(modified * 1000).toLocaleString() : "",
    },
    {
      title: "大小",
      key: "size",
      width: 200,
      render: (_, record) => record.isDrive && formatDriveInfo(record),
    },
    {
      title: "操作",
      key: "actions",
      width: 120,
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={
              favoriteFolders.some((f) => f.path === record.path) ? (
                <StarFilled style={{ color: "#faad14" }} />
              ) : (
                <StarOutlined />
              )
            }
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(record.path);
            }}
          />
        </Space>
      ),
    },
  ];

  const getBreadcrumbItems = () => {
    if (!currentPath) return [];
    const parts = currentPath.split(/[/\\]/);
    const items = [];
    let path = "";
    parts.forEach((part, index) => {
      if (!part && index === 0 && isWindows()) {
        return;
      }
      path = index === 0 ? part : `${path}\\${part}`;
      items.push({
        title: part || "根目录",
        onClick: () => fetchFolders(path),
      });
    });
    return items;
  };

  const getTableData = () => {
    if (!currentPath) {
      return drives.map((drive) => ({
        ...drive,
        isDrive: true,
      }));
    }
    return folders.map((folder) => ({
      ...folder,
      isDrive: false,
    }));
  };

  const handleQuickAccess = (path) => {
    if (!path && !currentPath) {
      fetchDefaultPath();
      return;
    }
    fetchFolders(path);
  };

  const quickAccessItems = [
    {
      icon: <HomeOutlined />,
      title: "此电脑",
      path: "",
    },
    ...Object.entries(specialFolders).map(([name, path]) => ({
      icon: <FolderOutlined />,
      title: name,
      path: path,
    })),
  ];

  const handleFolderClick = (path) => {
    setCurrentPath(path);
    fetchFolders(path);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && activeFolder) {
      handleSelect(activeFolder);
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeFolder]);

  const renderRecentList = () => (
    <List
      className="folder-list-view"
      dataSource={recentFolders}
      locale={{ emptyText: <Empty description="暂无最近访问记录" /> }}
      renderItem={(item) => (
        <List.Item
          actions={[
            <Button
              type="link"
              icon={
                favoriteFolders.some((f) => f.path === item.path) ? (
                  <StarFilled style={{ color: "#faad14" }} />
                ) : (
                  <StarOutlined />
                )
              }
              onClick={() => toggleFavorite(item.path)}
            />,
          ]}
        >
          <List.Item.Meta
            avatar={<FolderOutlined style={{ fontSize: "20px" }} />}
            title={<a onClick={() => fetchFolders(item.path)}>{item.name}</a>}
            description={item.path}
          />
          <div>{new Date(item.timestamp).toLocaleString()}</div>
        </List.Item>
      )}
    />
  );

  const renderFavoriteList = () => (
    <List
      className="folder-list-view"
      dataSource={favoriteFolders}
      locale={{ emptyText: <Empty description="暂无收藏文件夹" /> }}
      renderItem={(item) => (
        <List.Item
          actions={[
            <Button
              type="link"
              icon={<StarFilled style={{ color: "#faad14" }} />}
              onClick={() => toggleFavorite(item.path)}
            />,
          ]}
        >
          <List.Item.Meta
            avatar={<FolderOutlined style={{ fontSize: "20px" }} />}
            title={<a onClick={() => fetchFolders(item.path)}>{item.name}</a>}
            description={item.path}
          />
        </List.Item>
      )}
    />
  );

  const getQuickAccessPath = (folderName) => {
    if (!defaultUserPath) return "";
    return `${defaultUserPath}\\${folderName}`;
  };

  const fetchTreeData = async (path) => {
    try {
      const response = await axios.get(
        `http://localhost:8000/api/files/tree?path=${encodeURIComponent(
          path || ""
        )}&show_hidden=${showHidden}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!path && isWindows()) {
        const recentNodes = recentFolders.slice(0, 5).map((folder, index) => ({
          title: folder.name,
          key: `recent-${folder.path}-${index}`,
          path: folder.path,
          icon: <FolderOutlined />,
          isLeaf: true,
        }));

        const driveNodes = response.data;

        return [
          {
            title: "快速访问",
            key: "quick-access",
            icon: <StarFilled style={{ color: "#faad14" }} />,
            children: [
              {
                title: "最近访问",
                key: "recent",
                icon: <HistoryOutlined />,
                children: recentNodes,
                selectable: false,
              },
            ],
            selectable: false,
          },
          {
            title: "此电脑",
            key: "computer",
            icon: <DesktopOutlined />,
            children: [...quickAccessNodes, ...driveNodes],
            selectable: false,
          },
        ];
      }

      return response.data;
    } catch (error) {
      console.error("获取文件树失败:", error);
      message.error("获取文件树失败");
      return [];
    }
  };

  const onExpand = async (expandedKeys, { node }) => {
    setExpandedKeys(expandedKeys);
    if (node.children.length === 0) {
      const children = await fetchTreeData(node.key);
      const updateTreeData = (list, key, children) => {
        return list.map((node) => {
          if (node.key === key) {
            return { ...node, children };
          }
          if (node.children) {
            return {
              ...node,
              children: updateTreeData(node.children, key, children),
            };
          }
          return node;
        });
      };
      setTreeData((origin) => updateTreeData(origin, node.key, children));
    }
  };

  const onSelect = async (selectedKeys, { node }) => {
    if (!node.isQuickAccess) {
      setSelectedKeys(selectedKeys);
    }
    if (selectedKeys.length > 0) {
      const path = node.isQuickAccess ? node.path : node.key;
      console.log("Selected path:", path);
      console.log("Node:", node);
      if (path) {
        if (node.isQuickAccess && !defaultUserPath) {
          try {
            const response = await axios.get(
              "http://localhost:8000/api/files/default-path",
              {
                headers: {
                  Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
              }
            );
            if (response.data.path) {
              const newPath = `${response.data.path}\\${
                QUICK_ACCESS_ITEMS[node.key.replace("quick-", "")].folderName
              }`;
              const isValid = await validatePath(newPath);
              if (isValid) {
                handleFolderClick(newPath);
              } else {
                message.error("无法访问此路径，可能是路径不存在或无权限访问");
              }
              return;
            }
          } catch (error) {
            console.error("获取默认路径失败:", error);
            message.error("获取默认路径失败");
            return;
          }
        }

        validatePath(path).then((isValid) => {
          console.log("Path validation result:", isValid);
          if (isValid) {
            handleFolderClick(path);
          } else {
            message.error("无法访问此路径，请检查路径是否正确或是否有访问权限");
          }
        });
      }
    }
  };

  useEffect(() => {
    const initTree = async () => {
      const rootData = await fetchTreeData();
      setTreeData(rootData);
    };
    if (isModalVisible) {
      initTree();
    }
  }, [isModalVisible]);

  const updateFolderLists = async (path) => {
    await fetchFolders(path);

    if (expandedKeys.length > 0) {
      const newTreeData = [...treeData];
      for (const key of expandedKeys) {
        const children = await fetchTreeData(key);
        const updateTreeData = (list, key, children) => {
          return list.map((node) => {
            if (node.key === key) {
              return { ...node, children };
            }
            if (node.children) {
              return {
                ...node,
                children: updateTreeData(node.children, key, children),
              };
            }
            return node;
          });
        };
        setTreeData((origin) => updateTreeData(origin, key, children));
      }
    }
  };

  const handleFolderItemClick = (folder) => {
    setSelectedFolder(folder);
    setActiveFolder(folder.path);
    setSelectedFolderName(folder.name);
  };

  const handleFolderItemDoubleClick = (folder) => {
    handleFolderClick(folder.path);
    setSelectedFolderName("");
  };

  const getFilteredAndSortedFolders = () => {
    let result = [...folders];

    if (searchText) {
      result = result.filter((folder) =>
        folder.name.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    result.sort((a, b) => {
      let compareResult = 0;
      switch (sortField) {
        case "name":
          compareResult = a.name.localeCompare(b.name);
          break;
        case "created":
          compareResult = (a.created || 0) - (b.created || 0);
          break;
        case "subfolder_count":
          compareResult = (a.subfolder_count || 0) - (b.subfolder_count || 0);
          break;
      }
      return sortOrder === "ascend" ? compareResult : -compareResult;
    });

    return result;
  };

  const handleGoUp = () => {
    if (parentPath) {
      handleFolderClick(parentPath);
      setSelectedFolderName("");
    }
  };

  return (
    <div className="folder-selector">
      <Input
        value={value}
        placeholder="请选择文件夹"
        readOnly
        style={{ flex: 1 }}
      />
      <Button onClick={() => setIsModalVisible(true)}>浏览...</Button>

      <Modal
        title="选择文件夹"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={900}
        className="folder-modal"
        destroyOnClose
      >
        <div className="folder-browser">
          <div className="folder-breadcrumb">
            <div className="breadcrumb-container">
              <Breadcrumb items={getBreadcrumbItems()} />
              <Space>
                <Button
                  type={showHidden ? "primary" : "default"}
                  onClick={async () => {
                    setShowHidden(!showHidden);
                    await updateFolderLists(currentPath);
                  }}
                >
                  {showHidden ? "隐藏文件夹" : "显示隐藏文件夹"}
                </Button>
              </Space>
            </div>
          </div>
          <div className="folder-content">
            <div className="folder-tree">
              <Tree
                showIcon
                showLine={{ showLeafIcon: false }}
                expandedKeys={expandedKeys}
                selectedKeys={selectedKeys}
                onExpand={onExpand}
                onSelect={onSelect}
                treeData={treeData}
              />
            </div>
            <div className="folder-list">
              <div className="folder-list-header">
                <Space>
                  <Button
                    onClick={handleGoUp}
                    disabled={!parentPath}
                    icon={<VerticalAlignTopOutlined />}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    返回上一级
                  </Button>
                  <Input.Search
                    placeholder="搜索文件夹"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    style={{ width: 200 }}
                  />
                </Space>
                <Space>
                  <span>排序:</span>
                  <Select
                    value={sortField}
                    onChange={setSortField}
                    style={{ width: 120 }}
                  >
                    <Select.Option value="name">名称</Select.Option>
                    <Select.Option value="created">创建日期</Select.Option>
                    <Select.Option value="subfolder_count">
                      子文件夹数量
                    </Select.Option>
                  </Select>
                  <Button
                    icon={
                      sortOrder === "ascend" ? (
                        <SortAscendingOutlined />
                      ) : (
                        <SortDescendingOutlined />
                      )
                    }
                    onClick={() =>
                      setSortOrder((order) =>
                        order === "ascend" ? "descend" : "ascend"
                      )
                    }
                  />
                </Space>
              </div>
              <List
                dataSource={getFilteredAndSortedFolders()}
                renderItem={(folder) => (
                  <List.Item
                    className={`folder-item ${
                      folder.path === activeFolder ? "active" : ""
                    }`}
                    onClick={() => handleFolderItemClick(folder)}
                    onDoubleClick={() => handleFolderItemDoubleClick(folder)}
                  >
                    <div className="folder-item-content">
                      <FolderOutlined style={{ marginRight: 8 }} />
                      <div className="folder-item-info">
                        <div className="folder-item-name">{folder.name}</div>
                        <div className="folder-item-details">
                          <span>
                            创建于:{" "}
                            {new Date(folder.created * 1000).toLocaleString()}
                          </span>
                          <span>子文件夹: {folder.subfolder_count || 0}</span>
                          <span>视频文件: {folder.video_count || 0}</span>
                        </div>
                      </div>
                    </div>
                  </List.Item>
                )}
                locale={{ emptyText: "文件夹为空" }}
              />
            </div>
          </div>
          <div className="folder-toolbar">
            <div className="folder-name-input">
              <span className="folder-name-label">文件夹名:</span>
              <Input
                value={selectedFolderName}
                readOnly
                placeholder="请选择文件夹"
              />
            </div>
            <Space>
              <Button onClick={() => setIsModalVisible(false)}>取消</Button>
              <Button
                type="primary"
                disabled={!selectedFolderName}
                onClick={() =>
                  handleSelect(selectedFolder?.path || currentPath)
                }
              >
                确定
              </Button>
            </Space>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default FolderSelector;
