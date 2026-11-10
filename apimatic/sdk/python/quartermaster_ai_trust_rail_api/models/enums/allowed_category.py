from enum import Enum
from typing import Annotated, TypeAlias

from ...core import open_enum_validator


class AllowedCategory(str, Enum):
    FOOD_PACKAGING = "food_packaging"
    CLEANING_SUPPLIES = "cleaning_supplies"
    COOKING_INGREDIENTS = "cooking_ingredients"
    BEVERAGES = "beverages"
    KITCHEN_EQUIPMENT = "kitchen_equipment"
    ALCOHOL = "alcohol"
    GIFT_CARDS = "gift_cards"
    SERVICES = "services"

    __str__ = str.__str__


AllowedCategoryOrStr: TypeAlias = Annotated[AllowedCategory | str, open_enum_validator(AllowedCategory)]
