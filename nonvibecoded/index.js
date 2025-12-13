let color = 000000;
let i;

let redNumber;
let greenNumber;
let blueNumber;

let redNum;
let greenNum;
let blueNum;

let redHex;
let blueHex;
let greenHex;


document.querySelector('button').addEventListener('click', function()
{

    redNumber = Math.floor(Math.random() * 256);
    greenNumber = Math.floor(Math.random() * 256);
    blueNumber = Math.floor(Math.random() * 256);
    
    console.log(redNumber, greenNumber, blueNumber);
  
    
    redHex = ('0' + redNumber.toString(16)).slice(-2);
    greenHex = ('0' + greenNumber.toString(16)).slice(-2);
    blueHex = ('0' + blueNumber.toString(16)).slice(-2);
  
    console.log(redHex, greenHex, blueHex);
    
    color = redHex + greenHex + blueHex ;
    
    console.log(color);
    
    document.querySelector('body').style.background = '#' + color;
    document.getElementById('demo').innerHTML = ('#' + color);
    
});
