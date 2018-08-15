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

## COMMENTS

1. comment out the console.log('[textualize] text') etc stuff from npos textualize.js file


## NOTES

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

