import uuid

from app.models.events_models import EventVisualSection, Seat


_VISUAL_SECTION_NS = uuid.UUID("a5fd2b62-6877-4e92-b5e8-3baf085314aa")
_SEAT_NS = uuid.UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")


NATIONAL_STADIUM_VISUAL_SECTIONS = [
    {"sectionCode": "308", "label": "308", "dataSection": 308, "x": 2, "y": 48, "w": 64, "h": 50},
    {"sectionCode": "309", "label": "309", "dataSection": 309, "x": 2, "y": 100, "w": 64, "h": 50},
    {"sectionCode": "310", "label": "310", "dataSection": 310, "x": 2, "y": 152, "w": 64, "h": 50},
    {"sectionCode": "311", "label": "311", "dataSection": 311, "x": 2, "y": 204, "w": 64, "h": 50},
    {"sectionCode": "312", "label": "312", "dataSection": 312, "x": 2, "y": 256, "w": 64, "h": 50},
    {"sectionCode": "313", "label": "313", "dataSection": 313, "x": 2, "y": 308, "w": 64, "h": 50},
    {"sectionCode": "314", "label": "314", "dataSection": 314, "x": 2, "y": 360, "w": 64, "h": 50},
    {"sectionCode": "208", "label": "208", "dataSection": 208, "x": 70, "y": 5, "w": 72, "h": 43},
    {"sectionCode": "209", "label": "209", "dataSection": 209, "x": 70, "y": 50, "w": 72, "h": 43},
    {"sectionCode": "210", "label": "210", "dataSection": 210, "x": 70, "y": 95, "w": 72, "h": 43},
    {"sectionCode": "211", "label": "211", "dataSection": 211, "x": 70, "y": 140, "w": 72, "h": 43},
    {"sectionCode": "212", "label": "212", "dataSection": 212, "x": 70, "y": 185, "w": 72, "h": 43},
    {"sectionCode": "213", "label": "213", "dataSection": 213, "x": 70, "y": 230, "w": 72, "h": 43},
    {"sectionCode": "214", "label": "214", "dataSection": 214, "x": 70, "y": 275, "w": 72, "h": 43},
    {"sectionCode": "215", "label": "215", "dataSection": 215, "x": 70, "y": 320, "w": 72, "h": 43},
    {"sectionCode": "216", "label": "216", "dataSection": 216, "x": 70, "y": 365, "w": 72, "h": 43},
    {"sectionCode": "217", "label": "217", "dataSection": 217, "x": 70, "y": 410, "w": 72, "h": 43},
    {"sectionCode": "STD_A", "label": "STANDING\nPEN A", "dataSection": 3001, "x": 147, "y": 67, "w": 112, "h": 125, "multiline": True},
    {"sectionCode": "PA1", "label": "PA1", "dataSection": 2001, "x": 147, "y": 197, "w": 112, "h": 153},
    {"sectionCode": "PB1", "label": "PB1", "dataSection": 1001, "x": 263, "y": 197, "w": 174, "h": 153},
    {"sectionCode": "PC1", "label": "PC1", "dataSection": 2002, "x": 441, "y": 197, "w": 112, "h": 153},
    {"sectionCode": "STD_B", "label": "STANDING\nPEN B", "dataSection": 3002, "x": 441, "y": 67, "w": 112, "h": 125, "multiline": True},
    {"sectionCode": "234", "label": "234", "dataSection": 234, "x": 558, "y": 5, "w": 72, "h": 43},
    {"sectionCode": "233", "label": "233", "dataSection": 233, "x": 558, "y": 50, "w": 72, "h": 43},
    {"sectionCode": "232", "label": "232", "dataSection": 232, "x": 558, "y": 95, "w": 72, "h": 43},
    {"sectionCode": "231", "label": "231", "dataSection": 231, "x": 558, "y": 140, "w": 72, "h": 43},
    {"sectionCode": "230", "label": "230", "dataSection": 230, "x": 558, "y": 185, "w": 72, "h": 43},
    {"sectionCode": "229", "label": "229", "dataSection": 229, "x": 558, "y": 230, "w": 72, "h": 43},
    {"sectionCode": "228", "label": "228", "dataSection": 228, "x": 558, "y": 275, "w": 72, "h": 43},
    {"sectionCode": "227", "label": "227", "dataSection": 227, "x": 558, "y": 320, "w": 72, "h": 43},
    {"sectionCode": "226", "label": "226", "dataSection": 226, "x": 558, "y": 365, "w": 72, "h": 43},
    {"sectionCode": "225", "label": "225", "dataSection": 225, "x": 558, "y": 410, "w": 72, "h": 43},
    {"sectionCode": "334", "label": "334", "dataSection": 334, "x": 634, "y": 48, "w": 64, "h": 50},
    {"sectionCode": "333", "label": "333", "dataSection": 333, "x": 634, "y": 100, "w": 64, "h": 50},
    {"sectionCode": "332", "label": "332", "dataSection": 332, "x": 634, "y": 152, "w": 64, "h": 50},
    {"sectionCode": "331", "label": "331", "dataSection": 331, "x": 634, "y": 204, "w": 64, "h": 50},
    {"sectionCode": "330", "label": "330", "dataSection": 330, "x": 634, "y": 256, "w": 64, "h": 50},
    {"sectionCode": "329", "label": "329", "dataSection": 329, "x": 634, "y": 308, "w": 64, "h": 50},
    {"sectionCode": "328", "label": "328", "dataSection": 328, "x": 634, "y": 360, "w": 64, "h": 50},
    {"sectionCode": "218", "label": "218", "dataSection": 218, "x": 152, "y": 457, "w": 55, "h": 52},
    {"sectionCode": "219", "label": "219", "dataSection": 219, "x": 209, "y": 457, "w": 55, "h": 52},
    {"sectionCode": "220", "label": "220", "dataSection": 220, "x": 266, "y": 457, "w": 55, "h": 52},
    {"sectionCode": "221", "label": "221", "dataSection": 221, "x": 323, "y": 457, "w": 55, "h": 52},
    {"sectionCode": "222", "label": "222", "dataSection": 222, "x": 380, "y": 457, "w": 55, "h": 52},
    {"sectionCode": "223", "label": "223", "dataSection": 223, "x": 437, "y": 457, "w": 55, "h": 52},
    {"sectionCode": "224", "label": "224", "dataSection": 224, "x": 494, "y": 457, "w": 55, "h": 52},
    {"sectionCode": "318", "label": "318", "dataSection": 318, "x": 152, "y": 514, "w": 55, "h": 50},
    {"sectionCode": "319", "label": "319", "dataSection": 319, "x": 209, "y": 514, "w": 55, "h": 50},
    {"sectionCode": "320", "label": "320", "dataSection": 320, "x": 271, "y": 511, "w": 57, "h": 55},
    {"sectionCode": "322", "label": "322", "dataSection": 322, "x": 372, "y": 511, "w": 57, "h": 55},
    {"sectionCode": "323", "label": "323", "dataSection": 323, "x": 436, "y": 514, "w": 55, "h": 50},
    {"sectionCode": "324", "label": "324", "dataSection": 324, "x": 493, "y": 514, "w": 55, "h": 50},
]

DEFAULT_VISUAL_SECTIONS = NATIONAL_STADIUM_VISUAL_SECTIONS

SIS_VISUAL_SECTIONS = [
    {"sectionCode": "301", "label": "301", "dataSection": 301, "x": 2, "y": 68, "w": 52, "h": 72},
    {"sectionCode": "302", "label": "302", "dataSection": 302, "x": 2, "y": 142, "w": 52, "h": 72},
    {"sectionCode": "303", "label": "303", "dataSection": 303, "x": 2, "y": 216, "w": 52, "h": 72},
    {"sectionCode": "304", "label": "304", "dataSection": 304, "x": 2, "y": 290, "w": 52, "h": 72},
    {"sectionCode": "305", "label": "305", "dataSection": 305, "x": 2, "y": 364, "w": 52, "h": 68},
    {"sectionCode": "101", "label": "101", "dataSection": 101, "x": 58, "y": 68, "w": 58, "h": 90},
    {"sectionCode": "102", "label": "102", "dataSection": 102, "x": 58, "y": 160, "w": 58, "h": 90},
    {"sectionCode": "103", "label": "103", "dataSection": 103, "x": 58, "y": 252, "w": 58, "h": 90},
    {"sectionCode": "104", "label": "104", "dataSection": 104, "x": 58, "y": 344, "w": 58, "h": 88},
    {"sectionCode": "FL1", "label": "FL1", "dataSection": 111, "x": 131, "y": 68, "w": 78, "h": 180},
    {"sectionCode": "FL2", "label": "FL2", "dataSection": 112, "x": 131, "y": 252, "w": 78, "h": 180},
    {"sectionCode": "VIP_FLOOR", "label": "VIP\nFLOOR", "dataSection": 120, "x": 214, "y": 68, "w": 272, "h": 364, "multiline": True},
    {"sectionCode": "FR1", "label": "FR1", "dataSection": 121, "x": 491, "y": 68, "w": 78, "h": 180},
    {"sectionCode": "FR2", "label": "FR2", "dataSection": 122, "x": 491, "y": 252, "w": 78, "h": 180},
    {"sectionCode": "205", "label": "205", "dataSection": 205, "x": 584, "y": 68, "w": 58, "h": 90},
    {"sectionCode": "206", "label": "206", "dataSection": 206, "x": 584, "y": 160, "w": 58, "h": 90},
    {"sectionCode": "207", "label": "207", "dataSection": 207, "x": 584, "y": 252, "w": 58, "h": 90},
    {"sectionCode": "208", "label": "208", "dataSection": 208, "x": 584, "y": 344, "w": 58, "h": 88},
    {"sectionCode": "306", "label": "306", "dataSection": 306, "x": 646, "y": 68, "w": 52, "h": 72},
    {"sectionCode": "307", "label": "307", "dataSection": 307, "x": 646, "y": 142, "w": 52, "h": 72},
    {"sectionCode": "308", "label": "308", "dataSection": 308, "x": 646, "y": 216, "w": 52, "h": 72},
    {"sectionCode": "309", "label": "309", "dataSection": 309, "x": 646, "y": 290, "w": 52, "h": 72},
    {"sectionCode": "310", "label": "310", "dataSection": 310, "x": 646, "y": 364, "w": 52, "h": 68},
    {"sectionCode": "401", "label": "401", "dataSection": 401, "x": 136, "y": 442, "w": 68, "h": 46},
    {"sectionCode": "402", "label": "402", "dataSection": 402, "x": 208, "y": 442, "w": 68, "h": 46},
    {"sectionCode": "403", "label": "403", "dataSection": 403, "x": 280, "y": 442, "w": 68, "h": 46},
    {"sectionCode": "404", "label": "404", "dataSection": 404, "x": 352, "y": 442, "w": 68, "h": 46},
    {"sectionCode": "405", "label": "405", "dataSection": 405, "x": 424, "y": 442, "w": 68, "h": 46},
    {"sectionCode": "406", "label": "406", "dataSection": 406, "x": 496, "y": 442, "w": 68, "h": 46},
    {"sectionCode": "501", "label": "501", "dataSection": 501, "x": 58, "y": 492, "w": 81, "h": 46},
    {"sectionCode": "502", "label": "502", "dataSection": 502, "x": 142, "y": 492, "w": 81, "h": 46},
    {"sectionCode": "503", "label": "503", "dataSection": 503, "x": 226, "y": 492, "w": 81, "h": 46},
    {"sectionCode": "504", "label": "504", "dataSection": 504, "x": 310, "y": 492, "w": 81, "h": 46},
    {"sectionCode": "505", "label": "505", "dataSection": 505, "x": 394, "y": 492, "w": 81, "h": 46},
    {"sectionCode": "506", "label": "506", "dataSection": 506, "x": 478, "y": 492, "w": 81, "h": 46},
    {"sectionCode": "507", "label": "507", "dataSection": 507, "x": 562, "y": 492, "w": 81, "h": 46},
]

CAPITOL_VISUAL_SECTIONS = [
    {"sectionCode": "STA", "label": "STANDING\nPEN A", "dataSection": 2001, "x": 220, "y": 88, "w": 260, "h": 65, "multiline": True},
    {"sectionCode": "STB", "label": "STANDING\nPEN B", "dataSection": 3001, "x": 145, "y": 168, "w": 410, "h": 160, "multiline": True},
    {"sectionCode": "201", "label": "201", "dataSection": 201, "shape": "polygon", "pts": [[100, 340], [220, 370], [220, 510], [110, 510]]},
    {"sectionCode": "202", "label": "202", "dataSection": 202, "x": 220, "y": 370, "w": 260, "h": 140},
    {"sectionCode": "203", "label": "203", "dataSection": 203, "shape": "polygon", "pts": [[480, 370], [600, 340], [590, 510], [480, 510]]},
]

MEDIACORP_VISUAL_SECTIONS = [
    {"sectionCode": "101", "label": "101", "dataSection": 101, "shape": "polygon", "pts": [[65, 70], [207, 75], [187, 140], [50, 135]]},
    {"sectionCode": "102", "label": "102", "dataSection": 102, "shape": "polygon", "pts": [[210, 75], [490, 75], [510, 140], [190, 140]]},
    {"sectionCode": "103", "label": "103", "dataSection": 103, "shape": "polygon", "pts": [[493, 75], [634, 70], [653, 135], [512, 140]]},
    {"sectionCode": "104", "label": "104", "dataSection": 104, "shape": "polygon", "pts": [[35, 150], [202, 160], [202, 235], [20, 222]]},
    {"sectionCode": "105", "label": "105", "dataSection": 105, "x": 205, "y": 160, "w": 290, "h": 75},
    {"sectionCode": "106", "label": "106", "dataSection": 106, "shape": "polygon", "pts": [[498, 160], [665, 150], [680, 222], [498, 235]]},
    {"sectionCode": "201", "label": "201", "dataSection": 201, "shape": "polygon", "pts": [[2, 250], [185, 258], [185, 333], [0, 325]]},
    {"sectionCode": "202", "label": "202", "dataSection": 202, "x": 195, "y": 258, "w": 310, "h": 75},
    {"sectionCode": "203", "label": "203", "dataSection": 203, "shape": "polygon", "pts": [[515, 258], [698, 250], [700, 325], [515, 333]]},
    {"sectionCode": "301", "label": "301", "dataSection": 301, "shape": "polygon", "pts": [[2, 350], [190, 358], [175, 438], [0, 430]]},
    {"sectionCode": "302", "label": "302", "dataSection": 302, "shape": "polygon", "pts": [[200, 358], [500, 358], [515, 438], [185, 438]]},
    {"sectionCode": "303", "label": "303", "dataSection": 303, "shape": "polygon", "pts": [[510, 358], [698, 350], [700, 430], [525, 438]]},
]

EXPO_VISUAL_SECTIONS = [
    {"sectionCode": "101", "label": "101", "dataSection": 101, "x": 134, "y": 78, "w": 80, "h": 210},
    {"sectionCode": "102", "label": "102", "dataSection": 102, "x": 222, "y": 78, "w": 80, "h": 210},
    {"sectionCode": "103", "label": "103", "dataSection": 103, "x": 310, "y": 78, "w": 80, "h": 210},
    {"sectionCode": "104", "label": "104", "dataSection": 104, "x": 398, "y": 78, "w": 80, "h": 210},
    {"sectionCode": "105", "label": "105", "dataSection": 105, "x": 486, "y": 78, "w": 80, "h": 210},
    {"sectionCode": "205", "label": "205", "dataSection": 205, "x": 134, "y": 324, "w": 59, "h": 70},
    {"sectionCode": "206", "label": "206", "dataSection": 206, "x": 196, "y": 324, "w": 59, "h": 70},
    {"sectionCode": "207", "label": "207", "dataSection": 207, "x": 258, "y": 324, "w": 59, "h": 70},
    {"sectionCode": "208", "label": "208", "dataSection": 208, "x": 320, "y": 324, "w": 59, "h": 70},
    {"sectionCode": "209", "label": "209", "dataSection": 209, "x": 382, "y": 324, "w": 59, "h": 70},
    {"sectionCode": "210", "label": "210", "dataSection": 210, "x": 444, "y": 324, "w": 59, "h": 70},
    {"sectionCode": "211", "label": "211", "dataSection": 211, "x": 506, "y": 324, "w": 59, "h": 70},
    {"sectionCode": "201", "label": "201", "dataSection": 201, "shape": "polygon", "pts": [[4, 206], [130, 188], [130, 238], [4, 256]]},
    {"sectionCode": "202", "label": "202", "dataSection": 202, "shape": "polygon", "pts": [[4, 261], [130, 243], [130, 293], [4, 311]]},
    {"sectionCode": "203", "label": "203", "dataSection": 203, "shape": "polygon", "pts": [[4, 316], [130, 298], [130, 348], [4, 366]]},
    {"sectionCode": "204", "label": "204", "dataSection": 204, "shape": "polygon", "pts": [[4, 371], [130, 353], [130, 403], [4, 421]]},
    {"sectionCode": "215", "label": "215", "dataSection": 215, "shape": "polygon", "pts": [[570, 188], [696, 206], [696, 256], [570, 238]]},
    {"sectionCode": "214", "label": "214", "dataSection": 214, "shape": "polygon", "pts": [[570, 243], [696, 261], [696, 311], [570, 293]]},
    {"sectionCode": "213", "label": "213", "dataSection": 213, "shape": "polygon", "pts": [[570, 298], [696, 316], [696, 366], [570, 348]]},
    {"sectionCode": "212", "label": "212", "dataSection": 212, "shape": "polygon", "pts": [[570, 353], [696, 371], [696, 421], [570, 403]]},
]

STAR_VISUAL_SECTIONS = [
    {"sectionCode": "VIP", "label": "VIP", "dataSection": 1001, "x": 272, "y": 78, "w": 200, "h": 230},
    {"sectionCode": "101", "label": "101", "dataSection": 101, "shape": "polygon", "pts": [[264, 78], [110, 60], [50, 210], [140, 302], [264, 308]]},
    {"sectionCode": "201", "label": "201", "dataSection": 201, "shape": "polygon", "pts": [[480, 78], [634, 60], [694, 210], [604, 302], [480, 308]]},
    {"sectionCode": "202", "label": "202", "dataSection": 202, "x": 272, "y": 322, "w": 200, "h": 210},
    {"sectionCode": "301", "label": "301", "dataSection": 301, "shape": "polygon", "pts": [[82, 310], [268, 322], [268, 530], [55, 500]]},
    {"sectionCode": "302", "label": "302", "dataSection": 302, "shape": "polygon", "pts": [[476, 322], [668, 310], [695, 500], [476, 530]]},
]

SEAT_TEMPLATES = {
    1: [
        {"tier": "VIP", "sections": [1001], "rows": 6, "seatsPerRow": 12, "basePrice": 350.00},
        {"tier": "CAT1", "sections": [2001, 2002], "rows": 8, "seatsPerRow": 8, "basePrice": 220.00},
        {"tier": "CAT2", "sections": [208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 3001, 3002], "rows": 7, "seatsPerRow": 7, "basePrice": 148.00},
        {"tier": "CAT3", "sections": [308, 309, 310, 311, 312, 313, 314, 318, 319, 320, 322, 323, 324, 328, 329, 330, 331, 332, 333, 334], "rows": 6, "seatsPerRow": 6, "basePrice": 98.00},
    ],
    2: [
        {"tier": "VIP", "sections": [120], "rows": 10, "seatsPerRow": 10, "basePrice": 288.00},
        {"tier": "CAT1", "sections": [111, 112, 121, 122], "rows": 6, "seatsPerRow": 8, "basePrice": 188.00},
        {"tier": "CAT2", "sections": [101, 102, 103, 104, 205, 206, 207, 208], "rows": 5, "seatsPerRow": 6, "basePrice": 128.00},
        {"tier": "CAT3", "sections": [301, 302, 303, 304, 305, 306, 307, 308, 309, 310], "rows": 5, "seatsPerRow": 6, "basePrice": 78.00},
        {"tier": "CAT3", "sections": [401, 402, 403, 404, 405, 406, 501, 502, 503, 504, 505, 506, 507], "rows": 4, "seatsPerRow": 7, "basePrice": 78.00},
    ],
    3: [
        {"tier": "VIP", "sections": [101, 102, 103], "rows": 4, "seatsPerRow": 8, "basePrice": 248.00},
        {"tier": "CAT1", "sections": [104, 105, 106], "rows": 6, "seatsPerRow": 10, "basePrice": 168.00},
        {"tier": "CAT2", "sections": [201, 202, 203], "rows": 7, "seatsPerRow": 12, "basePrice": 118.00},
        {"tier": "CAT3", "sections": [301, 302, 303], "rows": 8, "seatsPerRow": 14, "basePrice": 68.00},
    ],
    4: [
        {"tier": "VIP", "sections": [202], "rows": 4, "seatsPerRow": 8, "basePrice": 258.00},
        {"tier": "CAT1", "sections": [2001], "rows": 6, "seatsPerRow": 10, "basePrice": 178.00},
        {"tier": "CAT2", "sections": [3001], "rows": 7, "seatsPerRow": 12, "basePrice": 128.00},
        {"tier": "CAT3", "sections": [201, 203], "rows": 8, "seatsPerRow": 14, "basePrice": 78.00},
    ],
    5: [
        {"tier": "VIP", "sections": [1001], "rows": 5, "seatsPerRow": 10, "basePrice": 298.00},
        {"tier": "CAT1", "sections": [101, 201], "rows": 7, "seatsPerRow": 12, "basePrice": 198.00},
        {"tier": "CAT2", "sections": [202], "rows": 8, "seatsPerRow": 14, "basePrice": 138.00},
        {"tier": "CAT3", "sections": [301, 302], "rows": 9, "seatsPerRow": 16, "basePrice": 88.00},
    ],
    6: [
        {"tier": "VIP", "sections": [101, 102, 103, 104, 105], "rows": 4, "seatsPerRow": 10, "basePrice": 238.00},
        {"tier": "CAT1", "sections": [205, 206, 207, 208, 209, 210, 211], "rows": 6, "seatsPerRow": 12, "basePrice": 158.00},
        {"tier": "CAT2", "sections": [201, 202, 203, 204], "rows": 7, "seatsPerRow": 14, "basePrice": 108.00},
        {"tier": "CAT3", "sections": [212, 213, 214, 215], "rows": 8, "seatsPerRow": 16, "basePrice": 68.00},
    ],
}

VISUAL_SECTIONS_BY_TEMPLATE = {
    1: NATIONAL_STADIUM_VISUAL_SECTIONS,
    2: SIS_VISUAL_SECTIONS,
    3: MEDIACORP_VISUAL_SECTIONS,
    4: CAPITOL_VISUAL_SECTIONS,
    5: STAR_VISUAL_SECTIONS,
    6: EXPO_VISUAL_SECTIONS,
}


def build_visual_sections(event_id, seatmap_template_id):
    sections = VISUAL_SECTIONS_BY_TEMPLATE.get(seatmap_template_id, DEFAULT_VISUAL_SECTIONS)
    return [
        EventVisualSection(
            visual_section_id=uuid.uuid5(
                _VISUAL_SECTION_NS, f"{event_id}|{seatmap_template_id}|{section['sectionCode']}"
            ),
            event_id=event_id,
            section_code=section["sectionCode"],
            label=section["label"],
            data_section=section["dataSection"],
            x=section["x"],
            y=section["y"],
            w=section["w"],
            h=section["h"],
            multiline=section.get("multiline", False),
            hidden=section.get("hidden", False),
            shape=section.get("shape"),
            pts=section.get("pts"),
        )
        for section in sections
    ]


def generate_event_seats(event_id, seatmap_template_id):
    templates = SEAT_TEMPLATES.get(seatmap_template_id) or SEAT_TEMPLATES[2]
    seats = []

    for template in templates:
        for section_no in template["sections"]:
            for row_no in range(1, template["rows"] + 1):
                for seat_no in range(1, template["seatsPerRow"] + 1):
                    seats.append(
                        Seat(
                            seat_id=uuid.uuid5(
                                _SEAT_NS,
                                f"{event_id}|{template['tier']}|{section_no}|{row_no}|{seat_no}",
                            ),
                            event_id=event_id,
                            tier=template["tier"],
                            section_no=section_no,
                            row_no=row_no,
                            seat_no=seat_no,
                            base_price=template["basePrice"],
                            status="available",
                        )
                    )
    return seats
