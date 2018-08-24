'use strict';

const variableContentKeys = [
  "NAME:",
  "TABLE NO",
  "ORDER NUMBER",
  "COVERS:",
];

const docketStartFields = [
  "RESTAURANT BAR",
  "TAB BAR",
  "JUKE BAR",
  "GAMING BAR",
  "SPORTS BAR",
];

const courseFields = [
  "ENTREES DINNER",
  "MAINS DINNER",
  "MAINS LUNCH",
  "BAR MEALS",
  "CHILDS MENUS",
  "CHILDS DESSERT TOPS",
  "DESSERT",
  "ADD MODIFIERS",
  "SPECIAL INSTRUCTIONS",
];

const menuItems = [
   // ANOMALOUS CONTENT ==> this is a worry.
  "for the band",
  "add gravy",

  //normal items
  "AFFOGATO",
  "ARANCINI",
  "BARRAMUNDI",
  "BEEF BURGER",
  "BEEF SLIDERS",
  "BIRYANI CURRY",
  "BRISKET SAND",
  "BRUSCHETTA",
  "BRUSCHETTA TOMAT",
  "CAKE DISPLAY",
  "CALAMARI",
  "CALL AWAY",
  "CARAMEL TOPPING",
  "CAULIFLOWER ALM",
  "CHICK RIBS",
  "CHICKEN BURGER",
  "CHEESE CAKE",
  "CHILDS BOLOG",
  "CHILDS BURGER",
  "CHILDS FISH",
  "CHILDS FROG POND",
  "CHILDS HAMBURGER",
  "CHILDS ICE CREAM",
  "CHILDS MOUSSE",
  "CHILDS PARMI",
  "CHILDS RICE",
  "CHILDS ROAST",
  "CHILDS SNIT",
  "CHILDS STEAK",
  "CHILLI CALAMARI",
  "CHOCO TOPPING",
  "CHURROS",
  "CIGAR",
  "CREME CARAMEL",
  "CRISPY CHIPS",
  "CRUMBED PRAWNS",
  "CUMIN CARROTS",
  "DUCK",
  "DUMPLINGS",
  "DESSERT SPEC",
  "EXTRA ICECREAM",
  "EYE FILLET 250GM",
  "FELAFEL SMALL",
  "FELAFEL LARGE",
  "FONDANT",
  "FREEKAH FALAFEL",
  "FRIES",
  "GARLIC CHATS",
  "GARDEN SALAD",
  "GARLIC BREAD",
  "GNOCCHI",
  "HAKE",
  "HANGER 200",
  "HANGER 400",
  "KIDS EXTRA DESS",
  "LOADED FRIES",
  "MAIN SPECIALS",
  "MARINATED CHIC",
  "NACHOS",
  "NASI",
  "NO TOPPING",
  "OPEN FOOD",
  "OYSTERS KIL 1",
  "OYSTERS NAT 1",
  "PAPPADELLE LAMB",
  "PAPPARDELL LAMB",
  "PARMA",
  "PARMIGIANA",
  "POPCORN CHICK",
  "PORK BELLY",
  "PORK CUTLET",
  "PORK SLIDERS",
  "PORK TERRINE",
  "PORTER",
  "PORTERHOUSE 300",
  "PRAWN RISOTTO",
  "QUINOA SALAD",
  "ROAST",
  "ROAST VEG",
  "SALMON",
  "SALMON SALAD",
  "SCOTCH FILLET",
  "SCHNITZEL",
  "SEN GARL BREAD",
  "SENIOR FISH CHIP",
  "SENIOR MOUSSE",
  "SENIOR PUDDING",
  "SENIOR ROAST",
  "SENIOR SNIT",
  "SENIOR SOUP",
  "SENIOR SORBETS",
  "SHARE JUKE ONE",
  "SHARE MEMBER TWO",
  "SOUP OF THE DAY",
  "SOUP",
  "SPINKLES ONLY",
  "STICKY DATE PUDD",
  "STRAWB TOPPING",
  "SWEET POT FRIES",
  "TACOS",
  "TEXAN",
  "WAGU RUMP",
  "WEDGES",
  "WHITING",
  "WINTER GREENS",
  "WRAP"
];

// ----------------------------------------
exports.menuItems = menuItems;
exports.courseFields = courseFields;
exports.docketStartFields = docketStartFields;
exports.variableContentKeys = variableContentKeys;
// ----------------------------------------
