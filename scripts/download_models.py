import os
from transformers import AutoTokenizer, MarianMTModel
import logging
from dotenv import load_dotenv
import warnings

# 忽略特定的警告
warnings.filterwarnings("ignore", message=".*_pytree._register_pytree_node.*")
warnings.filterwarnings("ignore", message=".*resume_download.*")

# 加载环境变量
load_dotenv("app/.env")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def download_models():
    """下载并缓存所需的模型"""
    try:
        # 设置模型缓存目录
        os.environ['TRANSFORMERS_CACHE'] = './models'
        os.environ['HF_HOME'] = './models'
        os.makedirs('./models', exist_ok=True)
        
        # 下载摘要模型
        logger.info("Downloading summarization model...")
        model_name = "Helsinki-NLP/opus-mt-zh-en"
        
        # 下载并保存tokenizer
        logger.info("Downloading tokenizer...")
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        tokenizer.save_pretrained('./models/summarization')
        
        # 下载并保存模型
        logger.info("Downloading model...")
        model = MarianMTModel.from_pretrained(model_name)
        model.save_pretrained('./models/summarization')
        
        logger.info("Models downloaded successfully!")
        
    except Exception as e:
        logger.error(f"Error downloading models: {str(e)}")
        raise

if __name__ == "__main__":
    download_models() 