import React, { useState, useEffect } from "react";
import { Select, Button, message } from "antd";
import { FileTextOutlined } from "@ant-design/icons";
import axios from "axios";
import styles from "./index.css";

const { Option } = Select;

const SummaryTypes = {
  GENERAL: "GENERAL",
  DETAILED: "DETAILED",
  BULLET_POINTS: "BULLET_POINTS",
};

const VideoSummary = ({ transcriptId, transcriptText }) => {
  const [summaryType, setSummaryType] = useState(SummaryTypes.GENERAL);
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(false);

  // 加载已有摘要
  useEffect(() => {
    if (transcriptId) {
      loadSummaries();
    }
  }, [transcriptId]);

  const loadSummaries = async () => {
    try {
      const { data } = await axios.get(`/api/summaries/${transcriptId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setSummaries(data);
    } catch (err) {
      console.error("加载摘要失败:", err);
    }
  };

  const handleGenerateSummary = async () => {
    if (!transcriptId || !transcriptText) {
      message.error("请先完成视频转录");
      return;
    }

    // 检查是否已存在相同类型的摘要
    const existingSummary = summaries.find(
      (s) => s.summary_type === summaryType
    );
    if (existingSummary) {
      message.info("该类型的摘要已存在");
      return;
    }

    setLoading(true);
    try {
      const { data } = await axios.post(
        `/api/summaries/${transcriptId}`,
        {},
        {
          params: {
            summary_type: summaryType,
          },
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      setSummaries([...summaries, data]);
      message.success("摘要生成成功");
    } catch (err) {
      console.error("生成摘要失败:", err);
      message.error(err.response?.data?.detail || "生成摘要失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.summaryContainer}>
      <div className={styles.summaryControls}>
        <Select
          value={summaryType}
          onChange={setSummaryType}
          style={{ width: "100%", marginBottom: 16 }}
          disabled={loading}
        >
          <Option value={SummaryTypes.GENERAL}>一般摘要</Option>
          <Option value={SummaryTypes.DETAILED}>详细摘要</Option>
          <Option value={SummaryTypes.BULLET_POINTS}>要点摘要</Option>
        </Select>
        <Button
          type="primary"
          onClick={handleGenerateSummary}
          loading={loading}
          block
        >
          生成摘要
        </Button>
      </div>

      <div className={styles.summaryList}>
        {summaries.map((summary, index) => (
          <div key={summary.id || index} className={styles.summaryItem}>
            <h4>{summary.title || `${summary.summary_type} 摘要`}</h4>
            <div className={styles.summaryContent}>{summary.summary}</div>
            {summary.key_points && summary.key_points.length > 0 && (
              <div className={styles.keyPoints}>
                <h5>关键点：</h5>
                <ul>
                  {summary.key_points.map((point, idx) => (
                    <li key={idx}>{point}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className={styles.summaryMeta}>
              创建时间：{new Date(summary.created_at).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VideoSummary;
