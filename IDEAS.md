# IDEAS

## PARSER FOR DOCKET

| PHYSICAL DOCKET                                          |  TOKENIZATION  |
|----------------------------------------------------------|----------------|  
|venue location                                            |  VL            | 
|taken using                                               |  MD            |
|staff mem                                                 |  MD            |
|time                                                      |  MD            |
|[table num]                                               |  TN            |
|[booker name]                                             |  MD            |
|[covers]                                                  |  MD            |
|[space]                                                   |  SP            |  
|[PRINT A/C - YADDA @ 19:11]                               |  MD            |
|[space]                                                   |  SP            |
|course name 1                                             |  CN            |
|[extra variable content: 'add gravy' as a menu item]      |  RC            |
|menu item                                                 |  MI            |
|[menu info a]                                             |  II            |
|[menu info b]                                             |  II            |
|[--------]                                                |  IIS           |
|[...]                                                     |                |
|[menu item]                                               |  MI            |
|[space]                                                   |  SP            |
|[space]                                                   |  SP            |
|course name 2                                             |  CN            |
|[extra variable content: 'for band' as a menu item]       |  RC            |
|menu item                                                 |  MI            |
|[menu info]                                               |  II            |
|[--------]                                                |  IIS           |
|[...]                                                     |                | 
|[menu item]                                               |  MI            |
|[...]                                                     |                |
|--------                                                  |  EOD           |
  
  
// PARSER TOKENS  
VL = Venue Location  
MD = Meta-Data  
TN = Table Number  
SP = SPace
CN = Course Name  
MI = Menu Item  
II = Item Info  
IIS = Item Info Separator  
RC = Random Content
EOD = End Of Docket  
