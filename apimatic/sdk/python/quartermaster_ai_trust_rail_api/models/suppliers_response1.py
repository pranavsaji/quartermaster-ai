from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .supplier_detail_dto import SupplierDetailDto, SupplierDetailDtoDict


class SuppliersResponse1(SdkBaseModel):
    supplier: SupplierDetailDto
    """A supplier with its catalog."""


class SuppliersResponse1Dict(TypedDict):
    supplier: SupplierDetailDtoDict
