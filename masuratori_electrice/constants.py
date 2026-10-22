"""PXR register addresses, in PDU (zero-based) form.

The manual writes holding registers as 4xxxx. Subtract 400001 to get the
address pymodbus puts on the wire: 404497 -> 4496.
"""

DEVICE_NAME_ADDRESS = 4496  # 404497, "EATON PXR20" / "EATON PXR25"
DEVICE_NAME_COUNT = 8  # 16 ASCII characters

PRODUCT_ID_ADDRESS = 4606  # 404607
PRODUCT_ID_COUNT = 2

# Currents, IEEE float, two registers each.
CURRENT_L1_ADDRESS = 4610  # 404611
CURRENT_L2_ADDRESS = 4612  # 404613
CURRENT_L3_ADDRESS = 4614  # 404615
CURRENT_COUNT = 2

# Phase-to-neutral voltages, IEEE float, two registers each.
VOLTAGE_L1_ADDRESS = 4630  # 404631, U_L1-N
VOLTAGE_L2_ADDRESS = 4632  # 404633, U_L2-N
VOLTAGE_L3_ADDRESS = 4634  # 404635, U_L3-N
VOLTAGE_COUNT = 2

# Active energy combined (forward + reverse), fixed point, four registers.
# The kWh object has no IEEE float variant; it is fixed point only.
ACTIVE_ENERGY_COMBINED_ADDRESS = 6262  # 406263
ACTIVE_ENERGY_COMBINED_COUNT = 4

# The manual's default for register 402002 is "low-order word first".
FLOAT_LOW_WORD_FIRST = True
