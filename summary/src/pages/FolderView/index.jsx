import React, { useState, useEffect } from "react";
import {
  Card,
  Button,
  Space,
  Radio,
  Breadcrumb,
  List,
  message,
  Empty,
  Table,
  Spin,
} from "antd";
import {
  UnorderedListOutlined,
  AppstoreOutlined,
  FolderOutlined,
  PlaySquareOutlined,
  ArrowLeftOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import request from "../../utils/request";
import "./index.css";
import InfiniteScroll from "react-infinite-scroll-component";

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (!bytes) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  // 根据大小决定小数位数
  const decimals = unitIndex === 0 ? 0 : size >= 100 ? 1 : 2;
  return `${size.toFixed(decimals)} ${units[unitIndex]}`;
};

const FolderView = () => {
  const { sourceId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState("grid"); // 'list' or 'grid'
  const [currentPath, setCurrentPath] = useState(location.state?.path || "");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 50,
    total: 0,
  });
  const [hasMore, setHasMore] = useState(true);
  const [gridItems, setGridItems] = useState([]);
  const [gridPage, setGridPage] = useState(1);
  const gridPageSize = 50; // 每次加载的数量

  // 对列表项进行排序的函数
  const getSortedItems = (itemsToSort) => {
    return [...itemsToSort].sort((a, b) => {
      // 首先按类型排序（文件夹在前）
      if (a.type !== b.type) {
        return a.type === "folder" ? -1 : 1;
      }
      // 同类型按名称排序
      return a.name.localeCompare(b.name);
    });
  };

  // 获取文件夹内容
  const fetchFolderContents = async () => {
    try {
      setLoading(true);
      const params = {
        path: currentPath,
        page: viewMode === "list" ? pagination.current : 1,
        page_size: viewMode === "list" ? pagination.pageSize : gridPageSize,
      };

      const response = await request.get(
        `/api/videos/sources/${sourceId}/contents`,
        { params }
      );

      if (viewMode === "list") {
        // 对列表数据进行排序
        const sortedItems = getSortedItems(response.data.items);
        setItems(sortedItems);
        setPagination((prev) => ({
          ...prev,
          total: response.data.total,
        }));
      } else {
        // 对网格视图数据进行排序
        const sortedItems = getSortedItems(response.data.items);
        if (gridPage === 1) {
          setGridItems(sortedItems);
        } else {
          setGridItems((prev) => [...prev, ...sortedItems]);
        }
        setHasMore(
          response.data.total > gridItems.length + response.data.items.length
        );
      }
    } catch (error) {
      message.error("获取文件夹内容失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 切换视图模式或路径时重置状态
    if (viewMode === "list") {
      setPagination((prev) => ({ ...prev, current: 1 }));
    } else {
      setGridPage(1);
      setGridItems([]);
    }
    fetchFolderContents();
  }, [currentPath, sourceId, viewMode]);

  // 分页变化时只在列表模式下重新获取数据
  useEffect(() => {
    if (viewMode === "list") {
      fetchFolderContents();
    }
  }, [pagination.current, pagination.pageSize, viewMode === "list"]);

  // 加载更多网格项
  const loadMoreGrid = () => {
    if (loading) return;

    const nextPage = gridPage + 1;
    setGridPage(nextPage);
    fetchFolderContents();
  };

  // 获取相对路径
  const getRelativePath = (fullPath) => {
    const sourcePath = location.state?.path || "";
    try {
      // 确保使用正确的路径分隔符
      const normalizedFullPath = fullPath.replace(/\\/g, "/");
      const normalizedSourcePath = sourcePath.replace(/\\/g, "/");
      return normalizedFullPath
        .replace(normalizedSourcePath, "")
        .replace(/^[/\\]+/, "");
    } catch {
      return "";
    }
  };

  // 处理文件夹点击
  const handleFolderClick = (folderPath) => {
    const sourcePath = location.state?.path || "";
    // 如果是点击根目录
    if (folderPath === sourcePath) {
      setCurrentPath(sourcePath);
      return;
    }
    // 否则使用相对路径
    const relativePath = getRelativePath(folderPath);
    setCurrentPath(`${sourcePath}/${relativePath}`);
  };

  // 处理视频点击
  const handleVideoClick = (video) => {
    console.log("Video click:", {
      video,
      sourceId,
      sourcePath: location.state?.path,
      currentPath,
    });

    navigate(`/videos/play`, {
      state: {
        videoPath: video.path,
        videoName: video.name,
        sourceId: sourceId,
        sourcePath: location.state?.path,
        returnPath: currentPath,
      },
    });
  };

  // 渲染面包屑导航
  const renderBreadcrumb = () => {
    const basePath = location.state?.path || "";
    const relativePath = getRelativePath(currentPath);
    const paths = relativePath.split(/[/\\]/).filter(Boolean);

    const breadcrumbItems = [
      {
        key: basePath,
        title: (
          <div
            className="breadcrumb-home"
            onClick={() => setCurrentPath(basePath)}
          >
            <HomeOutlined /> {location.state?.name}
          </div>
        ),
      },
    ];

    let currentFullPath = basePath;
    paths.forEach((path, index) => {
      // 构建相对路径
      const relativeSegments = paths.slice(0, index + 1);
      const relativePath = relativeSegments.join("/");
      currentFullPath = `${basePath}/${relativePath}`;

      breadcrumbItems.push({
        key: currentFullPath,
        title: (
          <div
            className="breadcrumb-item"
            onClick={() => setCurrentPath(currentFullPath)}
          >
            {path}
          </div>
        ),
      });
    });

    return (
      <div className="folder-breadcrumb">
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate("/videos")}
        >
          返回
        </Button>
        <Breadcrumb items={breadcrumbItems} />
      </div>
    );
  };

  // 渲染列表项
  const renderItem = (item) => {
    const isFolder = item.type === "folder";
    const Icon = isFolder ? FolderOutlined : PlaySquareOutlined;
    const fileSize = formatFileSize(item.size);
    const duration = item.duration
      ? `${Math.floor(item.duration / 60)}:${(item.duration % 60)
          .toString()
          .padStart(2, "0")}`
      : "-";
    const modifiedTime = new Date(item.modified_time).toLocaleString();

    if (viewMode === "list") {
      return (
        <List.Item
          className="folder-list-item"
          onClick={() => isFolder && handleFolderClick(item.path)}
        >
          <Space>
            <Icon
              style={{
                fontSize: "16px",
                color: isFolder ? "#1890ff" : "#ff4d4f",
              }}
            />
            <span>{item.name}</span>
            {!isFolder && (
              <>
                <span style={{ color: "#999" }}>{fileSize}</span>
                <span style={{ color: "#999" }}>{duration}</span>
              </>
            )}
            <span style={{ color: "#999" }}>{modifiedTime}</span>
          </Space>
        </List.Item>
      );
    }

    return (
      <div
        className="folder-grid-item"
        onClick={() =>
          isFolder ? handleFolderClick(item.path) : handleVideoClick(item)
        }
        style={{ cursor: "pointer" }}
      >
        {isFolder ? (
          <div className="item-icon-wrapper folder">
            <Icon />
          </div>
        ) : item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt={item.name}
            className="video-thumbnail"
          />
        ) : (
          <div className="item-icon-wrapper video">
            <PlaySquareOutlined style={{ color: "#ff4d4f" }} />
          </div>
        )}
        <div className="folder-grid-item-name">{item.name}</div>
        {!isFolder && (
          <div className="folder-grid-item-info">
            <span>{fileSize}</span>
            {duration !== "-" && <span> • {duration}</span>}
          </div>
        )}
      </div>
    );
  };

  const columns = [
    {
      title: "名称",
      dataIndex: "name",
      key: "name",
      render: (text, record) => (
        <Space>
          {record.type === "folder" ? (
            <FolderOutlined style={{ color: "#1890ff" }} />
          ) : (
            <PlaySquareOutlined style={{ color: "#52c41a" }} />
          )}
          <span>{text}</span>
        </Space>
      ),
      sorter: (a, b) => {
        // 首先按类型排序
        if (a.type !== b.type) {
          return a.type === "folder" ? -1 : 1;
        }
        // 同类型按名称排序
        return a.name.localeCompare(b.name);
      },
      sortDirections: ["ascend", "descend"],
      defaultSortOrder: "ascend",
    },
    {
      title: "大小",
      dataIndex: "size",
      key: "size",
      render: (text) => formatFileSize(text),
      sorter: (a, b) => a.size - b.size,
    },
    {
      title: "修改时间",
      dataIndex: "modified_time",
      key: "modified_time",
      render: (text) => new Date(text).toLocaleString(),
      sorter: (a, b) => new Date(a.modified_time) - new Date(b.modified_time),
    },
  ];

  // 处理分页变化
  const handlePageChange = (page, pageSize) => {
    setPagination((prev) => ({
      ...prev,
      current: page,
      pageSize: pageSize,
    }));
  };

  return (
    <div className="folder-view">
      <Card
        title={renderBreadcrumb()}
        extra={
          <Radio.Group
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
          >
            <Radio.Button value="list">
              <UnorderedListOutlined /> 列表
            </Radio.Button>
            <Radio.Button value="grid">
              <AppstoreOutlined /> 图标
            </Radio.Button>
          </Radio.Group>
        }
        styles={{
          body: {
            padding: viewMode === "grid" ? "16px" : "0",
          },
        }}
      >
        {viewMode === "list" ? (
          <Table
            loading={loading}
            columns={columns}
            dataSource={items}
            rowKey="path"
            onRow={(record) => ({
              onClick: () =>
                record.type === "folder"
                  ? handleFolderClick(record.path)
                  : handleVideoClick(record),
              style: { cursor: "pointer" },
            })}
            locale={{ emptyText: <Empty description="文件夹为空" /> }}
            pagination={{
              ...pagination,
              onChange: handlePageChange,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 项`,
            }}
          />
        ) : (
          <div className="grid-container" id="scrollableDiv">
            <InfiniteScroll
              dataLength={gridItems.length}
              next={loadMoreGrid}
              hasMore={hasMore}
              loader={
                <div className="loading-more">
                  <Spin>
                    <div className="loading-text">加载更多...</div>
                  </Spin>
                </div>
              }
              scrollableTarget="scrollableDiv"
              endMessage={
                <div className="loading-more">
                  <span>没有更多了</span>
                </div>
              }
            >
              <div className="folder-grid-view">
                {gridItems.map((item, index) => (
                  <div key={index} className="folder-grid-item-wrapper">
                    {renderItem(item)}
                  </div>
                ))}
              </div>
            </InfiniteScroll>
          </div>
        )}
      </Card>
    </div>
  );
};

export default FolderView;
