import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Card,
  Button,
  Typography,
  message,
  Tabs,
  List,
  Spin,
  Alert,
  Progress,
  Modal,
  Switch,
  Select,
  Radio,
} from "antd";
import { ArrowLeftOutlined, FileTextOutlined } from "@ant-design/icons";
import { useLocation, useNavigate } from "react-router-dom";
import request from "../../utils/request";
import "./index.css";
import axios from "axios";

const VideoPlayer = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { videoPath, videoName, sourceId, sourcePath } = location.state || {};
  const [videoObjectUrl, setVideoObjectUrl] = useState(null);
  const videoRef = useRef(null);
  const [relatedVideos, setRelatedVideos] = useState([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [summary, setSummary] = useState(null);
  const [activeTab, setActiveTab] = useState("related");
  const [transcriptStatus, setTranscriptStatus] = useState({
    taskId: null,
    status: "idle", // idle, processing, success, error
    text: null,
    segments: [],
    error: null,
    progress: 0,
  });
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [videoError, setVideoError] = useState(null);
  const abortControllerRef = useRef(null);
  const [videoLoading, setVideoLoading] = useState(true);
  const [pollingCount, setPollingCount] = useState(0);
  const MAX_POLLING_ATTEMPTS = 120; // 最轮询2小时
  const POLLING_INTERVAL = 5000; // 每5秒轮询一次
  const [transcriptionStartTime, setTranscriptionStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const elapsedTimeRef = useRef(null);
  const [currentSubtitle, setCurrentSubtitle] = useState("");
  const [showSubtitle, setShowSubtitle] = useState(true);
  const [transcriptLanguage, setTranscriptLanguage] = useState("zh");
  const [transcriptView, setTranscriptView] = useState("segments"); // 'segments' 或 'full'
  const [modal, contextHolder] = Modal.useModal();
  const [selectedModel, setSelectedModel] = useState("distil-large-v3");

  // 获取相对路径
  const getRelativePath = (fullPath, sourcePath) => {
    try {
      const normalizedFullPath = fullPath.replace(/\\/g, "/");
      const normalizedSourcePath = sourcePath.replace(/\\/g, "/");
      return normalizedFullPath
        .replace(normalizedSourcePath, "")
        .replace(/^[/\\]+/, "");
    } catch (error) {
      console.error("Error getting relative path:", error);
      return "";
    }
  };

  // 加载视频
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadVideo = async () => {
      if (!videoPath) {
        navigate("/videos");
        return;
      }

      try {
        const relativePath = getRelativePath(videoPath, sourcePath);
        const response = await request.get(
          `/api/videos/stream/${sourceId}/${relativePath}`,
          {
            responseType: "blob",
            signal: controller.signal,
          }
        );

        if (isMounted) {
          const url = URL.createObjectURL(response.data);
          setVideoObjectUrl(url);
        }
      } catch (error) {
        if (isMounted && !axios.isCancel(error)) {
          console.error("视频加载错误:", error);
          message.error("视频加载失败");
        }
      }
    };

    loadVideo();

    return () => {
      isMounted = false;
      controller.abort();
      if (videoObjectUrl) {
        URL.revokeObjectURL(videoObjectUrl);
      }
    };
  }, [videoPath, sourceId, sourcePath, navigate]);

  // 加载相关视频
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadRelatedVideos = async () => {
      if (!sourcePath || !videoPath) return;

      try {
        setLoadingVideos(true);
        const relativePath = getRelativePath(videoPath, sourcePath);
        const response = await request.get(
          `/api/videos/related/${sourceId}/${relativePath}`,
          { signal: controller.signal }
        );

        if (isMounted) {
          setRelatedVideos(response.data);
        }
      } catch (error) {
        if (isMounted && !axios.isCancel(error)) {
          console.error("加载相关视频错误:", error);
          message.error("加载相关视频失败");
        }
      } finally {
        if (isMounted) {
          setLoadingVideos(false);
        }
      }
    };

    loadRelatedVideos();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [sourcePath, videoPath, sourceId]);

  // 更新已用时间
  useEffect(() => {
    if (transcriptionStartTime && transcriptStatus.status === "processing") {
      elapsedTimeRef.current = setInterval(() => {
        const elapsed = Math.floor(
          (Date.now() - transcriptionStartTime) / 1000
        );
        setElapsedTime(elapsed);
      }, 1000);
    }

    return () => {
      if (elapsedTimeRef.current) {
        clearInterval(elapsedTimeRef.current);
      }
    };
  }, [transcriptionStartTime, transcriptStatus.status]);

  // 格式化已用时间
  const formatElapsedTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}分${remainingSeconds}秒`;
  };

  // 开始转录任务
  const startTranscription = () => {
    console.log("开始转录，当前状态:", transcriptStatus);

    // 如果已有转录文本（无论来源），弹出确认框
    if (
      transcriptStatus.status === "success" ||
      (transcriptStatus.segments && transcriptStatus.segments.length > 0)
    ) {
      console.log("显示确认框，当前转录状态:", transcriptStatus);
      modal.confirm({
        title: "重新转录确认",
        content: "已存在转录文稿，是否要重新获取？",
        okText: "确定",
        cancelText: "取消",
        onOk: async () => {
          console.log("用户确认重新��录");
          // 用户点击确定后，重置状态并开始新的转录
          setTranscriptStatus({
            taskId: null,
            status: "idle",
            text: null,
            segments: [],
            error: null,
            progress: 0,
          });
          await startTranscriptionProcess();
        },
        onCancel: () => {
          console.log("用户取消重新转录");
        },
      });
    } else {
      console.log("直接开始转录");
      startTranscriptionProcess();
    }
  };

  // 转录处理过程
  const startTranscriptionProcess = async () => {
    try {
      setTranscriptLoading(true);
      setTranscriptionStartTime(Date.now());
      setElapsedTime(0);
      setPollingCount(0);

      // 获取相对路径
      const relativePath = getRelativePath(videoPath, sourcePath);

      // 发送转录请求
      const response = await request.post("/api/videos/transcribe", {
        sourceId: sourceId,
        relativePath: relativePath,
        language: transcriptLanguage,
        force: true,
        model: selectedModel,
      });

      if (response.data.taskId) {
        setTranscriptStatus({
          taskId: response.data.taskId,
          status: "processing",
          text: null,
          segments: [],
          error: null,
          progress: 0,
        });
        pollTranscriptionStatus(response.data.taskId);
      }
    } catch (error) {
      console.error("转录失败:", error);
      message.error(
        "开始转录失败：" + (error.response?.data?.detail || "未知错误")
      );
      setTranscriptStatus((prev) => ({
        ...prev,
        status: "error",
        error: error.response?.data?.detail || "转录失败",
      }));
    } finally {
      setTranscriptLoading(false);
    }
  };

  // 轮询转录任务状态
  const pollTranscriptionStatus = async (taskId) => {
    try {
      const response = await request.get(`/api/videos/transcript/${taskId}`, {
        timeout: 10000,
      });

      const data = response.data;
      console.log("转录状态数据:", data);

      // 更新转录状态
      setTranscriptStatus((prev) => {
        const newState = {
          ...prev,
          taskId: data.taskId,
          status: data.status,
          text: data.text,
          segments: data.segments,
          error: data.error,
          progress: data.progress || 0,
        };
        console.log("更新后的转录状态:", newState);
        return newState;
      });

      // 根据状态处理
      if (data.status === "processing") {
        if (pollingCount < MAX_POLLING_ATTEMPTS) {
          setPollingCount((prev) => prev + 1);
          // 使用 setTimeout 而不是立即调用，避免请求过于频繁
          setTimeout(() => pollTranscriptionStatus(taskId), POLLING_INTERVAL);
        } else {
          message.error("转录任务超时，请稍后重试");
          setTranscriptStatus((prev) => ({
            ...prev,
            status: "error",
            error: "任务超时",
          }));
        }
      } else if (data.status === "success") {
        message.success("转录完成！");
        // 清除计时器
        if (elapsedTimeRef.current) {
          clearInterval(elapsedTimeRef.current);
        }
      } else if (data.status === "error") {
        message.error("转录失败：" + data.error);
      }
    } catch (error) {
      console.error("轮询错误详情:", error);
      if (
        error.code === "ECONNABORTED" &&
        pollingCount < MAX_POLLING_ATTEMPTS
      ) {
        console.log("Polling timeout, retrying...");
        setPollingCount((prev) => prev + 1);
        setTimeout(() => pollTranscriptionStatus(taskId), POLLING_INTERVAL);
      } else {
        message.error("获取转录状态失败");
        setTranscriptStatus((prev) => ({
          ...prev,
          status: "error",
          error: "获取转录状态失败",
        }));
      }
    }
  };

  // 格式化时间
  const formatTime = (seconds) => {
    const pad = (num) => String(num).padStart(2, "0");
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${pad(minutes)}:${pad(remainingSeconds)}`;
  };

  // 渲染转录控制
  const renderTranscriptControls = () => {
    return (
      <div className="transcript-controls">
        {/* 模型和语言选择 */}
        <div className="transcript-settings">
          <Switch
            checked={showSubtitle}
            onChange={setShowSubtitle}
            checkedChildren="显示字幕"
            unCheckedChildren="隐藏字幕"
          />
          <Select
            value={selectedModel}
            onChange={setSelectedModel}
            style={{ width: 180, marginRight: 8 }}
            options={[
              {
                value: "base",
                label: "Base (标准)",
                title: "标准模型，性能和速度均衡",
              },
              {
                value: "distil-large-v3",
                label: "Distil-Large-v3 (推荐)",
                title: "专为 faster-whisper 优化的模型，性能和速度平衡",
              },
              {
                value: "large-v3",
                label: "Large-v3 (高精度)",
                title: "最新的标准模型，准确度最高但速度较慢",
              },
              {
                value: "turbo",
                label: "Turbo (快速)",
                title: "速度最快的模型，适合实时转录",
              },
            ]}
          />
          <Select
            value={transcriptLanguage}
            onChange={setTranscriptLanguage}
            style={{ width: 120 }}
            options={[
              { value: "zh", label: "中文" },
              { value: "en", label: "英文" },
              { value: "ja", label: "日文" },
              { value: "ko", label: "韩文" },
              { value: "auto", label: "自���检测" },
            ]}
          />
        </div>

        {/* 转录进度和时间 */}
        {transcriptStatus.status === "processing" && (
          <div className="transcript-progress">
            <Progress
              type="circle"
              percent={transcriptStatus.progress}
              size={60}
            />
            <span className="elapsed-time">
              已用时间: {formatElapsedTime(elapsedTime)}
            </span>
          </div>
        )}

        {/* 转录按钮 */}
        <Button
          type="primary"
          onClick={startTranscription}
          loading={transcriptLoading}
          className="transcript-button"
          style={{
            backgroundColor: "#db7026",
            borderColor: "#db7026",
            fontWeight: "bold",
          }}
          block
        >
          {transcriptStatus.status === "success" ? "重新转录" : "开始转录"}
        </Button>

        {/* 字幕和视图控制 */}
        <div className="view-controls">
          <Radio.Group
            value={transcriptView}
            onChange={(e) => setTranscriptView(e.target.value)}
            optionType="button"
            buttonStyle="solid"
          >
            <Radio.Button value="segments">分段显示</Radio.Button>
            <Radio.Button value="full">完整文本</Radio.Button>
          </Radio.Group>
        </div>
      </div>
    );
  };

  // 渲染转录内容
  const renderTranscriptContent = () => {
    return (
      <div className="transcript-container">
        {renderTranscriptControls()}

        <div className="transcript-body">
          {transcriptStatus.status === "processing" && (
            <div className="transcript-loading">
              <Spin>
                <div className="loading-content">
                  <div className="loading-text">
                    正在转录中 ({transcriptStatus.progress}%)
                  </div>
                </div>
              </Spin>
            </div>
          )}

          {transcriptStatus.status === "error" && (
            <Alert
              type="error"
              message="转录失败"
              description={transcriptStatus.error}
              className="transcript-error"
            />
          )}

          {transcriptStatus.status === "success" &&
            transcriptStatus.segments && (
              <>
                {transcriptView === "segments" ? (
                  <div className="transcript-content">
                    {Array.isArray(transcriptStatus.segments) &&
                      transcriptStatus.segments.map((segment, index) => (
                        <div
                          key={index}
                          className="transcript-segment"
                          onClick={() => {
                            if (videoRef.current) {
                              videoRef.current.currentTime = segment.start;
                              videoRef.current.play();
                            }
                          }}
                        >
                          <div className="segment-time">
                            {formatTime(segment.start)} -{" "}
                            {formatTime(segment.end)}
                          </div>
                          <div className="segment-text">{segment.text}</div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="transcript-full-text">
                    {transcriptStatus.segments
                      .map((segment) => segment.text)
                      .join("\n")}
                  </div>
                )}
              </>
            )}
        </div>
      </div>
    );
  };

  // 处理视频点击
  const handleVideoClick = useCallback(
    (video) => {
      navigate("/videos/play", {
        state: {
          videoPath: video.path,
          videoName: video.name,
          sourceId,
          sourcePath,
        },
      });
    },
    [navigate, sourceId, sourcePath]
  );

  // 在组件加载时检查是否有未完成的转录任务
  useEffect(() => {
    const checkTranscriptionStatus = async () => {
      if (transcriptStatus.taskId) {
        try {
          const response = await request.get(
            `/api/videos/transcript/${transcriptStatus.taskId}`
          );
          if (response.data.status === "processing") {
            pollTranscriptionStatus(transcriptStatus.taskId);
          } else {
            setTranscriptStatus((prev) => ({
              ...prev,
              ...response.data,
            }));
          }
        } catch (error) {
          console.error("检查转录状态失败:", error);
        }
      }
    };

    checkTranscriptionStatus();
  }, []);

  // 检查是否有已存在的转录结果
  useEffect(() => {
    const checkExistingTranscript = async () => {
      if (!sourceId || !videoPath || !sourcePath) return;

      try {
        const relativePath = getRelativePath(videoPath, sourcePath);
        const encodedPath = encodeURIComponent(
          relativePath.replace(/\\/g, "/")
        );

        console.log("检查转录记录路径:", encodedPath);

        const response = await request.get(
          `/api/videos/transcript/exists/${sourceId}/${encodedPath}`
        );

        console.log("检查已有转录结果:", response.data);

        if (
          response.data &&
          (response.data.text || response.data.segments?.length > 0)
        ) {
          setTranscriptStatus({
            taskId: null,
            status: "success",
            text: response.data.text || "",
            segments: response.data.segments || [],
            error: null,
            progress: 100,
          });
        } else {
          setTranscriptStatus({
            taskId: null,
            status: "idle",
            text: null,
            segments: [],
            error: null,
            progress: 0,
          });
        }
      } catch (error) {
        console.error("检查转录记录失败:", error);
        setTranscriptStatus({
          taskId: null,
          status: "idle",
          text: null,
          segments: [],
          error: null,
          progress: 0,
        });
      }
    };

    checkExistingTranscript();
  }, [sourceId, videoPath, sourcePath]);

  // 更新当前字幕
  useEffect(() => {
    if (videoRef.current && transcriptStatus.segments) {
      const updateSubtitle = () => {
        const currentTime = videoRef.current.currentTime;
        const currentSegment = transcriptStatus.segments.find(
          (segment) =>
            currentTime >= segment.start && currentTime <= segment.end
        );
        setCurrentSubtitle(currentSegment?.text || "");
      };

      const video = videoRef.current;
      video.addEventListener("timeupdate", updateSubtitle);
      return () => video.removeEventListener("timeupdate", updateSubtitle);
    }
  }, [transcriptStatus.segments]);

  return (
    <div className="video-player">
      <Card
        title={
          <div className="video-player-header">
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
              返回
            </Button>
            <span className="video-name">{videoName}</span>
          </div>
        }
        style={{ background: "#fff" }}
        bordered={false}
      >
        {contextHolder}
        <div className="video-content">
          <div className="video-main">
            {videoPath ? (
              <div className="video-container">
                {videoLoading && (
                  <div className="video-loading">
                    <div className="loading-content">
                      <Spin size="large" />
                      <div className="loading-text">视频加载中...</div>
                    </div>
                  </div>
                )}
                <video
                  ref={videoRef}
                  controls
                  className="video-element"
                  src={videoObjectUrl}
                  onLoadStart={() => setVideoLoading(true)}
                  onCanPlay={() => setVideoLoading(false)}
                  onError={(e) => {
                    console.error("Video error:", e);
                    setVideoLoading(false);
                    setVideoError("视频加载失败，请稍后重试");
                    message.error("视频加载失败，请稍后重试");
                  }}
                >
                  {videoObjectUrl && (
                    <source src={videoObjectUrl} type="video/mp4" />
                  )}
                  您的浏览器不支持视频播放。
                </video>
                {showSubtitle && currentSubtitle && (
                  <div className="video-subtitle">{currentSubtitle}</div>
                )}
              </div>
            ) : (
              <div>无效的视频路径</div>
            )}
          </div>

          <div className="video-sidebar">
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={[
                {
                  key: "related",
                  label: "相关视频",
                  children: (
                    <List
                      loading={loadingVideos}
                      dataSource={relatedVideos}
                      renderItem={(video) => (
                        <List.Item onClick={() => handleVideoClick(video)}>
                          <div className="video-thumbnail">
                            {video.thumbnail ? (
                              <img src={video.thumbnail} alt={video.name} />
                            ) : (
                              <div className="thumbnail-placeholder" />
                            )}
                          </div>
                          <div className="video-info">
                            <div className="video-title">{video.name}</div>
                            <div className="video-meta">
                              修改时间：
                              {new Date(video.modified_time).toLocaleString()}
                            </div>
                          </div>
                        </List.Item>
                      )}
                    />
                  ),
                },
                {
                  key: "transcript",
                  label: "转录文本",
                  children: renderTranscriptContent(),
                },
              ]}
            />
          </div>
        </div>
      </Card>
    </div>
  );
};

export default VideoPlayer;
