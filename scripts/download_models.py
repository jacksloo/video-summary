import os
from huggingface_hub import snapshot_download

def download_models():
    # 创建模型目录
    os.makedirs("models", exist_ok=True)
    
    # 下载模型
    snapshot_download(
        repo_id="Systran/faster-whisper-base",
        local_dir="models/models--Systran--faster-whisper-base",
        local_dir_use_symlinks=False
    )

if __name__ == "__main__":
    download_models() 