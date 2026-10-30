/* molecules.js — the 10 presets, unchanged chemistry.
   Coordinates, atoms and bonds are copied verbatim from the original
   single-file Avogadro Simple export, so formulas and valences do not
   change. Depends on A() and Bd() from chemistry.js.
   In Node, `module.exports` is set at the bottom for validation only;
   in the browser this file just defines PRESETS globally. */
function methane(){var s=0.629;return {name:"Methane",atoms:[A("C",0,0,0),A("H",s,s,s),A("H",-s,-s,s),A("H",-s,s,-s),A("H",s,-s,-s)],bonds:[Bd(0,1),Bd(0,2),Bd(0,3),Bd(0,4)]};}
function ammonia(){return {name:"Ammonia",atoms:[A("N",0,0,0.25),A("H",0.94,0,-0.33),A("H",-0.47,0.81,-0.33),A("H",-0.47,-0.81,-0.33)],bonds:[Bd(0,1),Bd(0,2),Bd(0,3)]};}
function co2(){return {name:"Carbon dioxide",atoms:[A("C",0,0,0),A("O",1.16,0,0),A("O",-1.16,0,0)],bonds:[Bd(0,1,2),Bd(0,2,2)]};}
function ethane(){var at=[A("C",-0.77,0,0),A("C",0.77,0,0)];var h1=[[ -1.13,1.03,0],[-1.13,-0.51,0.89],[-1.13,-0.51,-0.89]];var h2=[[1.13,-1.03,0],[1.13,0.51,-0.89],[1.13,0.51,0.89]];h1.concat(h2).forEach(function(p){at.push(A("H",p[0],p[1],p[2]));});return {name:"Ethane",atoms:at,bonds:[Bd(0,1),Bd(0,2),Bd(0,3),Bd(0,4),Bd(1,5),Bd(1,6),Bd(1,7)]};}
function ethanol(){var at=[A("C",-1.35,0.15,0),A("C",0.05,-0.35,0.2),A("O",1.05,0.55,-0.35),A("H",-1.45,1.22,0.1),A("H",-1.9,-0.35,0.75),A("H",-1.75,-0.25,-0.9),A("H",0.3,-1.3,0.65),A("H",0.15,-0.55,-0.85),A("H",1.9,0.25,-0.15)];return {name:"Ethanol",atoms:at,bonds:[Bd(0,1),Bd(1,2),Bd(0,3),Bd(0,4),Bd(0,5),Bd(1,6),Bd(1,7),Bd(2,8)]};}
function benzene(){var at=[],bd=[];for(var i=0;i<6;i++){var t=i*Math.PI/3;at.push(A("C",1.40*Math.cos(t),1.40*Math.sin(t),0));}for(var j=0;j<6;j++){var t2=j*Math.PI/3;at.push(A("H",2.48*Math.cos(t2),2.48*Math.sin(t2),0));bd.push(Bd(j,(j+1)%6,(j%2===0)?2:1));bd.push(Bd(j,6+j));}return {name:"Benzene",atoms:at,bonds:bd};}
function glucose(){ /* open-chain glucose HOCH2-(CHOH)4-CHO, zig-zag */
 var at=[A("C",-3.7,0.8,0),A("O",-4.35,1.7,0),A("H",-4.05,-0.15,0),
 A("C",-2.25,0.15,0.3),A("O",-2.3,0.35,1.55),A("H",-1.8,-0.5,-0.35),A("H",-2.75,1.15,1.7),
 A("C",-0.8,0.8,-0.3),A("O",-0.75,0.55,-1.55),A("H",-1.35,1.65,0.05),A("H",-0.2,1.25,-1.7),
 A("C",0.65,0.15,0.3),A("O",0.7,0.35,1.55),A("H",1.2,-0.5,-0.35),A("H",0.15,1.15,1.7),
 A("C",2.1,0.8,-0.3),A("O",2.15,0.55,-1.55),A("H",1.55,1.65,0.05),A("H",2.7,1.25,-1.7),
 A("C",3.55,0.15,0.3),A("O",4.4,0.9,-0.35),A("H",3.85,-0.85,-0.25),A("H",3.3,0.35,1.35),A("H",5.05,0.35,-0.8)];
 var bd=[Bd(0,1,2),Bd(0,2),Bd(0,3),Bd(3,4),Bd(3,5),Bd(4,6),Bd(3,7),Bd(7,8),Bd(7,9),Bd(8,10),Bd(7,11),Bd(11,12),Bd(11,13),Bd(12,14),Bd(11,15),Bd(15,16),Bd(15,17),Bd(16,18),Bd(15,19),Bd(19,20),Bd(19,21),Bd(19,22),Bd(20,23)];
 return {name:"Glucose",atoms:at,bonds:bd};}
function caffeine(){
 var at=[A("N",-1.9,0.7,0),A("C",-0.95,1.55,0),A("N",0.35,1.25,0),A("C",0.75,0.0,0),A("C",-0.15,-1.0,0),A("C",-1.65,-0.55,0),
 A("N",0.35,-2.1,0),A("C",1.65,-1.65,0),A("N",1.75,-0.35,0),A("O",-1.25,2.7,0),A("O",-2.35,-1.45,0),
 A("C",-3.3,1.15,0),A("C",1.15,2.35,0),A("C",-0.15,-3.45,0),A("H",2.45,-2.3,0),
 A("H",-3.6,2.2,0),A("H",-3.75,0.7,0.85),A("H",-3.75,0.7,-0.85),A("H",0.75,3.35,0),A("H",1.7,2.05,0.85),A("H",1.7,2.05,-0.85),
 A("H",-1.2,-3.75,0),A("H",0.35,-3.85,0.85),A("H",0.35,-3.85,-0.85)];
 var bd=[Bd(0,1),Bd(1,2),Bd(2,3),Bd(3,4,2),Bd(4,5),Bd(5,0),Bd(1,9,2),Bd(5,10,2),Bd(0,11),Bd(2,12),Bd(4,6),Bd(6,7),Bd(7,8,2),Bd(8,3),Bd(6,13),Bd(7,14),Bd(11,15),Bd(11,16),Bd(11,17),Bd(12,18),Bd(12,19),Bd(12,20),Bd(13,21),Bd(13,22),Bd(13,23)];
 return {name:"Caffeine",atoms:at,bonds:bd};}
function aspirin(){
 var at=[],bd=[],i,t;
 for(i=0;i<6;i++){t=i*Math.PI/3+0.3;at.push(A("C",1.40*Math.cos(t),1.40*Math.sin(t),0));}
 for(i=0;i<6;i++){bd.push(Bd(i,(i+1)%6,(i%2===0)?2:1));}
 /* ring H on carbons 2,3,4,5 -> atom idx 6,7,8,9 */
 [2,3,4,5].forEach(function(ci){var a=at[ci];var L=Math.hypot(a.x,a.y);at.push(A("H",a.x/L*2.48,a.y/L*2.48,0));});
 bd.push(Bd(2,6),Bd(3,7),Bd(4,8),Bd(5,9));
 /* carboxyl on ring C0: C idx10, =O idx11, -O- idx12, H idx13 */
 var c0=at[0],L0=Math.hypot(c0.x,c0.y),ux=c0.x/L0,uy=c0.y/L0;
 at.push(A("C",ux*2.85,uy*2.85,0)); at.push(A("O",ux*3.45,uy*3.45,0.8)); at.push(A("O",ux*3.5,uy*3.5,-0.85)); at.push(A("H",ux*4.3,uy*4.3,-1.1));
 bd.push(Bd(0,10),Bd(10,11,2),Bd(10,12),Bd(12,13));
 /* ester on ring C1: O idx14, carbonyl C idx15, =O idx16, methyl C idx17, H idx18-20 */
 var c1=at[1],L1=Math.hypot(c1.x,c1.y),vx=c1.x/L1,vy=c1.y/L1;
 at.push(A("O",vx*2.6,vy*2.6,0)); at.push(A("C",vx*3.5,vy*3.5,0.9)); at.push(A("O",vx*3.95,vy*3.95,2.0)); at.push(A("C",vx*4.55,vy*4.55,0.15));
 at.push(A("H",vx*5.6,vy*5.6,0.45)); at.push(A("H",vx*4.4,vy*4.4,-0.85)); at.push(A("H",vx*4.4,vy*4.4,1.15));
 bd.push(Bd(1,14),Bd(14,15),Bd(15,16,2),Bd(15,17),Bd(17,18),Bd(17,19),Bd(17,20));
 return {name:"Aspirin",atoms:at,bonds:bd};}
function water(){return {name:"Water",atoms:[A("O",0,0,0),A("H",0.757,0.586,0),A("H",-0.757,0.586,0)],bonds:[Bd(0,1),Bd(0,2)]};}
var PRESETS=[water(),methane(),ammonia(),co2(),ethane(),ethanol(),benzene(),glucose(),caffeine(),aspirin()];

if (typeof module !== "undefined" && module.exports) {
  module.exports = { PRESETS: PRESETS };
}
