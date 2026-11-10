from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from ..core import UrlTemplate
from .environment import Environment


class HostedConfig(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")
    base_url: str = "https://quartermaster-web-o0df.onrender.com/api/v1"


class LocalConfig(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")
    base_url: str = "http://localhost:4000/api/v1"


class ServerConfig(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")
    hosted: HostedConfig = Field(default_factory=HostedConfig)
    local: LocalConfig = Field(default_factory=LocalConfig)

    def resolve(self, environment: Environment, path: str) -> UrlTemplate:
        variant = self.hosted if environment == "hosted" else self.local
        return UrlTemplate(base_url=variant.base_url, path=path)
