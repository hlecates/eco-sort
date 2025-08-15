from enum import IntEnum

class WasteClass(IntEnum):
    GLASS = 0
    PAPER = 1
    CARDBOARD = 2
    PLASTIC = 3
    METAL = 4
    TRASH = 5

ID2CLASS = [c.name.lower() for c in WasteClass]  
NUM_MATERIALS = len(ID2CLASS)

class Bin(IntEnum):
    COMPOST  = 0
    RECYCLE  = 1
    LANDFILL = 2

ID2BIN = [b.name.lower() for b in Bin]       

# Material -> Bin
MATERIAL2BIN = {
    WasteClass.GLASS: Bin.RECYCLE,
    WasteClass.PAPER: Bin.RECYCLE,
    WasteClass.CARDBOARD: Bin.RECYCLE,
    WasteClass.PLASTIC: Bin.RECYCLE,  
    WasteClass.METAL: Bin.RECYCLE,
    WasteClass.TRASH: Bin.LANDFILL,
}
MATERIAL2BIN_ID = [int(MATERIAL2BIN[WasteClass(i)]) for i in range(NUM_MATERIALS)]
