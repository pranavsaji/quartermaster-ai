from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .supplier_dto import SupplierDto, SupplierDtoDict


class SuppliersResponse(SdkBaseModel):
    items: list[SupplierDto]


class SuppliersResponseDict(TypedDict):
    items: list[SupplierDtoDict]
