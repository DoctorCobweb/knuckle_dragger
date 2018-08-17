# KNUCKLE DRAGGER

listen for data coming (node listen.js) in and parse it manually (node parser.js).


## INSTALLATION

**Linux**

to 'npm install' on Linux i had to downgrade node versions (from 10.6.0 to 10.1). otherwise, compiling serialport fails whilst installing subdependency module 'usb'. 
1. make sure Linux has build-essentials and libudev-dev packages installed:

   `sudo apt-get build-essential libudev-dev`
2. use a downgraded version of node:

   `nvm install v10.1i`
3. finally, install node modules:

   `npm install`

**MacOS**

works fine with node 10.6.0.
1. `npm install`

# GOTTCHAS 

1. your need to comment out the console.log('[textualize] text') etc stuff from npos textualize.js file


## RUN

1. make sure rethinkdb is installed on computer and running

  `$> rethinkdb`
2. in root folder run

  `$> node main.js`




## NOTES // TODOS

----------
# Docket headings for each area

**Restaurant Bar**  
ENTREES DINNER  
MAINS DINNER  
CHILDS MENUS - has desserts there. i think there's never entrees or mains for childs here  
CHILDS DESSERT TOPS - things like straw topping  
DESSERT - adult desserts  
ADD MODIFIERS - adult dessert modifiers  
SPECIAL INSTRUCTIONS - call away: kids desserts/mains/etc  


**TAB BAR**  
ENTREES DINNER  
BAR MEALS  
CHILDS MENUS - has desserts there. i think there's never entrees or mains for childs here  
CHILDS DESSERT TOPS - things like straw topping  


**JUKE BAR**  
BAR MEALS  
??? OTHERS  


**GAMING BAR**  
???  


**BOTTLESHOP**  
???  


**OTHER AREAS ???**  



-----------

implementation thoughts.
1. create main.js which starts db/checks its existence (creates it if not present),
   and start listener process from listen.js

   node main.js ---> starts the whole app 


