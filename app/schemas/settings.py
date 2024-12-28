from pydantic import BaseModel
from typing import Optional

class ThemeSettings(BaseModel):
    mode: str = "light"
    primaryColor: str = "#1890ff"
    compactMode: bool = False

class TranscriptionSettings(BaseModel):
    model: str = "distil-large-v3"
    language: str = "zh"
    autoStart: bool = True
    chunkSize: int = 30

class SummarySettings(BaseModel):
    model: str = "gpt-3.5-turbo"
    maxLength: int = 500
    style: str = "concise"
    autoSummarize: bool = True

class SystemSettings(BaseModel):
    autoSave: bool = True
    saveInterval: int = 5
    notifications: bool = True
    defaultVideoPath: str = ""

class Settings(BaseModel):
    theme: ThemeSettings = ThemeSettings()
    transcription: TranscriptionSettings = TranscriptionSettings()
    summary: SummarySettings = SummarySettings()
    system: SystemSettings = SystemSettings()

class SettingsUpdate(Settings):
    pass 