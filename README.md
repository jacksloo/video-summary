# Video Summary Assistant (视频摘要助手)

一个帮助用户管理和处理视频内容的工具，支持本地视频、云存储和网络视频源。

## 功能特点

- 多源支持：本地文件夹、云存储(阿里云 OSS/腾讯云 COS/华为云 OBS)、网络链接
- 用户系统：支持多用户管理，每个用户管理自己的视频源
- 安全性：JWT 认证，密码加密存储
- 现代化界面：基于 React 和 Ant Design 的响应式界面

## 技术栈

### 后端

- FastAPI
- SQLAlchemy
- PostgreSQL
- Alembic (数据库迁移)
- JWT 认证

### 前端

- React
- Ant Design
- Axios
- React Router

## 快速开始

### 环境要求

- Python 3.8+
- Node.js 14+
- PostgreSQL 12+

### 后端设置

1. 创建虚拟环境：

```bash
python -m venv venv
source venv/bin/activate # Linux/Mac
venv\Scripts\activate # Windows
```

2. 安装依赖：

```bash
pip install -r requirements.txt
```

3. 配置环境变量：
   复制 `.env.example` 到 `.env` 并修改配置：

```bash
cp .env.example .env
```

4. 初始化数据库：

```bash
alembic upgrade head
```

5. 运行 �� 发服务器：

```bash
uvicorn app.main:app --reload
```

### 前端设置

1. 进入前端目录：

```bash
cd summary
```

2. 安装依赖：

```bash
npm install
```

3. 运行开发服务器：

```bash
npm start
```

## 部署

### 使用 Docker（推荐）

```bash
docker-compose up -d
```

### 手动部署

参考 `deployment.md` 文件

## API 文档

启动服务后访问：

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 模型文件

由于模型文件较大，未包含在代码仓库中。请按以下步骤获取模型：

## 模型安装

1. 安装依赖：

```bash
pip install huggingface_hub
```

2. 运行下载脚本：

```bash
python scripts/download_models.py
```

或者手动下载：

1. 创建模型目录：

```bash
mkdir -p models
```

2. 从 HuggingFace 下载 [faster-whisper-base](https://huggingface.co/Systran/faster-whisper-base) 模型
3. 将下载的文件放置在 models 目录下

## 贡献指南

1. Fork 本仓库
2. 创建特性分支：`git checkout -b feature/AmazingFeature`
3. 提交改动：`git commit -m 'Add some AmazingFeature'`
4. 推送分支：`git push origin feature/AmazingFeature`
5. 提交 Pull Request

## 许可证

[MIT License](LICENSE)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.8+-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104.1+-blue.svg)
![React](https://img.shields.io/badge/react-18.2.0+-blue.svg)
