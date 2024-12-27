# 部署指南

## 环境准备

### 系统要求

- Linux/Unix 系统
- Python 3.8+
- PostgreSQL 12+
- Node.js 14+
- Nginx

### 安装系统依赖

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install python3-pip python3-venv postgresql nginx

# CentOS/RHEL
sudo yum install python3-pip postgresql-server nginx
```

## 后端部署

### 1. 数据库设置

```bash
# 创建数据库和用户
sudo -u postgres psql

postgres=# CREATE DATABASE summary;
postgres=# CREATE USER summary_user WITH PASSWORD 'your_password';
postgres=# GRANT ALL PRIVILEGES ON DATABASE summary TO summary_user;
```

### 2. 应用部署

```bash
# 克隆代码
git clone https://github.com/your-username/video-summary.git
cd video-summary

# 创建虚拟环境
python3 -m venv venv
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入实际配置

# 数据库迁移
alembic upgrade head

# 使用 gunicorn 运行
pip install gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000
```

### 3. Nginx 配置

```nginx
server {
    listen 80;
    server_name your_domain.com;

    location / {
        root /path/to/video-summary/summary/build;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 前端部署

```bash
cd summary

# 安装依赖
npm install

# 构建生产版本
npm run build

# 将构建文件复制到 Nginx 目录
sudo cp -r build/* /var/www/html/
```

## 使用 Docker 部署

### 1. 安装 Docker 和 Docker Compose

### 2. 构建和运行

```bash
docker-compose up -d
```

## 监控和维护

### 日志

- 应用日志: `/var/log/video-summary/app.log`
- Nginx 日志: `/var/log/nginx/access.log` 和 `/var/log/nginx/error.log`

### 备份

```bash
# 数据库备份
pg_dump -U postgres summary > backup.sql
```

### 更新

```bash
# 拉取最新代码
git pull

# 更新依赖
pip install -r requirements.txt
npm install

# 数据库迁移
alembic upgrade head

# 重新构建前端
npm run build

# 重启服务
sudo systemctl restart video-summary
```
