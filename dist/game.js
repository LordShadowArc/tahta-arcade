/* TAHTA ARCADE — zero dependencies, all gameplay runs locally in Canvas. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const canvas = $('gameCanvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const W = 960, H = 540;
  const held = new Set();
  const pointerKeys = new Map();
  const names = {maze:'NOKTA AVCISI',runner:'PİKSEL KOŞU',snow:'KAR FIRTINASI',corridor:'NEON KORİDOR',snake:'NEON YILAN',space:'UZAY SAVUNMASI',blocks:'BLOK YAĞMURU',bricks:'TUĞLA AVCISI',pong:'RAKET DÜELLOSU',flap:'GÖK SIÇRAYIŞI',racer:'ASFALT KAÇIŞI',dodge:'METEOR KAÇIŞI',bubbles:'BALON PATLAT',mines:'MAYIN TARLASI',custom:'ÖZEL OYUN'};
  const descriptions = {
    maze:'Tüm noktaları topla. Büyük noktalar hayaletleri kısa süreliğine savunmasız bırakır.',
    runner:'Sağa-sola git, zıpla, altınları topla ve bayrağa ulaş.',
    snow:'Kartopu atarak düşmanları dondur. Donmuş düşmana bir kartopu daha at!',
    corridor:'Koridorları keşfet, robotları vur ve 12 bölümlük seferi tamamla.',
    snake:'Yıldız meyveleri toplayıp 25 parçaya ulaş. Kendine çarpma.',
    space:'Üç düşman dalgasını savuştur. Ateş düğmesine basılı tutabilirsin.',
    blocks:'Düşen şekilleri çevir, boşlukları doldur ve satırları temizle.',
    bricks:'Topu sektirerek tüm tuğlaları kır. Başlamak için A tuşuna dokun.',
    pong:'Raketini yukarı-aşağı oynat. Yapay rakibe karşı 7 sayı al.',
    flap:'Tek dokunuşla yüksel, 20 boru arasından geç ve bölümü bitir.',
    racer:'Şeritler arasında ilerle, trafikten kaç ve 2500 metreye ulaş.',
    dodge:'Gökten düşen meteorlardan kaç, yıldızları topla ve süreyi doldur.',
    bubbles:'Balonlara doğrudan oyun ekranında dokun. İstersen yön tuşları ve A ile oyna.',
    mines:'Karelere dokunarak aç. Bayrak modu düğmesiyle mayınları işaretle. İlk açtığın kare güvenlidir.',
    custom:'Atölyede tasarladığın özel mini oyunu oyna.'
  };
  let currentId = null, game = null, status = 'home', lastFrame = 0, soundOn = false, audioCtx = null, generatedSpec = null;
  let lastDir = 'right';
  const rand = (a,b) => a + Math.random()*(b-a);
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const hit = (a,b) => a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
  const dist = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
  const modAngle = a => Math.atan2(Math.sin(a),Math.cos(a));
  function fill(c,x,y,w,h){ctx.fillStyle=c;ctx.fillRect(x,y,w,h)}
  function text(t,x,y,size,color='#fff',align='left',font='monospace') {ctx.fillStyle=color;ctx.font=`900 ${size}px ${font}`;ctx.textAlign=align;ctx.fillText(t,x,y);ctx.textAlign='left'}
  function circle(c,x,y,r){ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()}
  function rr(c,x,y,w,h,r=8){ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.fill()}
  function sound(freq=440,duration=.09,type='square',volume=.04){if(!soundOn)return;try{audioCtx ||= new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.setValueAtTime(freq,audioCtx.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(45,freq*.64),audioCtx.currentTime+duration);g.gain.setValueAtTime(volume,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+duration);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+duration)}catch{}}
  function getBest(id){try{return +(localStorage.getItem('tahtaArcadeBest_'+id)||0)}catch{return 0}}
  function storeBest(){if(!currentId||!game)return;const v=game.score||0;if(v>getBest(currentId)){try{localStorage.setItem('tahtaArcadeBest_'+currentId,String(v))}catch{}}}
  function updateHud(){if(!game)return;const values={score:String(game.score||0).padStart(6,'0'),bestScore:String(Math.max(getBest(currentId),game.score||0)).padStart(6,'0'),extraLabel:game.extraLabel||'CAN',extraValue:game.extraValue||'♥ ♥ ♥'};for(const [id,value] of Object.entries(values)){const node=$(id);if(node.textContent!==value)node.textContent=value}}
  function showOverlay(chip,title,desc,button){$('overlayChip').textContent=chip;$('overlayTitle').textContent=title;$('overlayText').textContent=desc;$('overlayButton').textContent=button;$('gameOverlay').classList.remove('hidden')}
  function hideOverlay(){$('gameOverlay').classList.add('hidden')}
  function clearKeys(){held.clear();pointerKeys.clear();document.querySelectorAll('.pressed').forEach(b=>b.classList.remove('pressed'))}
  function resetGame(){game=factories[currentId]();clearKeys();updateHud()}
  function openGame(id){if(!factories[id])return;currentId=id;status='ready';resetGame();$('home').classList.add('hidden');$('playPage').classList.remove('hidden');$('nowPlaying').textContent=names[id];$('instruction').textContent=descriptions[id];const actual=id==='custom'?generatedSpec?.base:id;const actionNames={maze:'HIZ',runner:'ZIPLA',snow:'KARTOPU',corridor:'ATEŞ',snake:'HIZ',space:'ATEŞ',blocks:'ÇEVİR',bricks:'BAŞLAT',pong:'SERVİS',flap:'ZIPLA',racer:'TURBO',dodge:'KALKAN',bubbles:'PATLAT',mines:'AÇ'};$('actionLabel').textContent=actionNames[actual]||'AKSİYON';$('actionBtn').setAttribute('aria-label', $('actionLabel').textContent);$('actionTip').textContent=actual==='maze'||actual==='snake'?'Basılı tut: daha hızlı git':'Dokun veya basılı tut';const tips={maze:'Yönlere dokunarak ilerle',runner:'▲ zıpla · ▼ hızlı düş',snow:'▲ zıpla · ▼ platformdan in',corridor:'◀ ▶ dön · ▲ ▼ yürü',snake:'Dört yönde dön',space:'◀ ▶ hareket et',blocks:'◀ ▶ kaydır · ▼ hızlı indir',bricks:'◀ ▶ raketi taşı',pong:'▲ ▼ raketi taşı',flap:'A veya ▲ ile sıçra',racer:'◀ ▶ şerit değiştir',dodge:'Dört yönde kaç',bubbles:'Ekrandaki balonlara dokun!',mines:'Kareye dokun · Bayrak modu aşağıda'};$('touchTip').textContent=tips[actual]||'Ekran tuşlarını kullan';$('comboBtn').classList.toggle('hidden',actual!=='runner'&&actual!=='mines');$('comboBtn').innerHTML=actual==='mines'?'⚑<small>BAYRAK MODU</small>':'↗<small>SAĞ + ZIPLA</small>';showOverlay('YENİ OYUN',names[id],descriptions[id],'▶ OYUNA BAŞLA');$('pauseBtn').innerHTML='Ⅱ <span>DURAKLAT</span>';window.scrollTo({top:0,behavior:'instant'});drawGame()}
  function goHome(){if(game)storeBest();currentId=null;game=null;status='home';clearKeys();$('playPage').classList.add('hidden');$('home').classList.remove('hidden');window.scrollTo({top:0,behavior:'instant'})}
  function resume(){if(status==='over'||status==='won')resetGame();status='playing';hideOverlay();$('pauseBtn').innerHTML='Ⅱ <span>DURAKLAT</span>';lastFrame=performance.now();sound(620,.08)}
  function togglePause(){if(status==='playing'){status='paused';clearKeys();showOverlay('MOLA','OYUN DURAKLATILDI','Hazır olduğunda kaldığın yerden devam et.','▶ DEVAM ET');$('pauseBtn').innerHTML='▶ <span>DEVAM</span>'}else if(status==='paused'||status==='ready')resume()}
  function finish(win){if(status!=='playing')return;status=win?'won':'over';clearKeys();storeBest();updateHud();sound(win?860:180,.35);showOverlay(win?'TEBRİKLER!':'OYUN BİTTİ',win?'BÖLÜM TAMAMLANDI!':'TEKRAR DENE',`SKORUN: ${String(game.score).padStart(6,'0')} · Bir tur daha?`,'↻ YENİDEN OYNA')}
  function actionPress(key){if(status!=='playing'||!game)return;if(key==='combo'&&game.combo)game.combo();else if(game.action)game.action()}
  function updateKey(key,down){if(down){if(!held.has(key)){held.add(key);if(['up','down','left','right'].includes(key))lastDir=key;if(key==='action'||key==='combo')actionPress(key);if(key==='up'&&status==='playing'&&game?.jump)game.jump()}}else held.delete(key);document.querySelectorAll(`[data-key="${key}"]`).forEach(b=>b.classList.toggle('pressed',down))}
  function moving(){if(held.has('combo'))return 'right';if(held.has('left')&&!held.has('right'))return 'left';if(held.has('right')&&!held.has('left'))return 'right';return null}
  document.querySelectorAll('[data-game]').forEach(b=>b.addEventListener('click',()=>openGame(b.dataset.game)));
  $('brand').addEventListener('click',e=>{e.preventDefault();goHome()});$('backBtn').addEventListener('click',goHome);
  $('overlayButton').addEventListener('click',resume);$('restartBtn').addEventListener('click',()=>{if(!currentId)return;resetGame();status='ready';drawGame();showOverlay('YENİ TUR',names[currentId],descriptions[currentId],'▶ BAŞLA')});$('pauseBtn').addEventListener('click',togglePause);
  $('fullscreenBtn').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('playPage').requestFullscreen()}catch{/* Some interactive whiteboards do not allow fullscreen. */}});
  $('soundToggle').addEventListener('click',()=>{soundOn=!soundOn;$('soundIcon').textContent=soundOn?'AÇIK':'KAPALI';if(soundOn)sound(660,.09)});
  document.querySelectorAll('[data-key]').forEach(b=>{
    b.addEventListener('pointerdown',e=>{e.preventDefault();try{b.setPointerCapture(e.pointerId)}catch{}pointerKeys.set(e.pointerId,b.dataset.key);updateKey(b.dataset.key,true)});
    const release=e=>{e.preventDefault();const key=pointerKeys.get(e.pointerId);if(key){pointerKeys.delete(e.pointerId);if(![...pointerKeys.values()].includes(key))updateKey(key,false)}};
    b.addEventListener('pointerup',release);b.addEventListener('pointercancel',release);b.addEventListener('lostpointercapture',release);
    b.addEventListener('contextmenu',e=>e.preventDefault());
  });
  canvas.addEventListener('pointerdown',e=>{if(status==='playing'&&game?.tap){e.preventDefault();const rect=canvas.getBoundingClientRect();game.tap((e.clientX-rect.left)*W/rect.width,(e.clientY-rect.top)*H/rect.height)}});
  const keyMap={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',KeyW:'up',KeyS:'down',KeyA:'left',KeyD:'right',Space:'action',Enter:'action'};
  document.addEventListener('keydown',e=>{if(status==='home')return;if(e.code==='Escape'){e.preventDefault();if(!e.repeat)togglePause();return}const k=keyMap[e.code];if(k){e.preventDefault();if(status==='ready'&&!e.repeat){resume();return}if(status==='playing')updateKey(k,true)}});
  document.addEventListener('keyup',e=>{const k=keyMap[e.code];if(k)updateKey(k,false)});
  window.addEventListener('blur',()=>{clearKeys();if(status==='playing')togglePause()});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&status==='playing')togglePause()});

  // GAME 1 — dot-collecting maze
  const MAZE=[
    '#####################',
    '#.........#.........#',
    '#.###.###.#.###.###.#',
    '#o#.....#...#.....#o#',
    '#.#.###.#####.###.#.#',
    '#...#...........#...#',
    '###.#.###...###.#.###',
    '#.....#...#...#.....#',
    '#.###.#.#.#.#.#.###.#',
    '#.#...#.#...#.#...#.#',
    '#.#.###.#####.###.#.#',
    '#.........#.........#',
    '#####################'
  ];
  function makeMaze(){
    const tiles=MAZE.map(row=>row.split(''));const open=(x,y)=>tiles[y]?.[x]!==undefined&&tiles[y][x]!=='#';
    const p={x:1,y:1,dir:'right',mouth:0}, ghostStart=[[9,5],[11,5],[10,6]];
    const ghosts=ghostStart.map(([x,y],i)=>({x,y,dir:['left','right','up'][i],startX:x,startY:y,color:['#ff6ea9','#79e1ff','#f9b963'][i]}));
    let pellets=tiles.flat().filter(c=>c==='.'||c==='o').length, timer=0, tick=0, power=0, invulnerable=1.8;
    const dirs={left:[-1,0],right:[1,0],up:[0,-1],down:[0,1]};
    const g={score:0,lives:3,extraLabel:'CAN',get extraValue(){return '♥ '.repeat(this.lives).trim()},action(){/* Maze is played using only four directions. */},
      update(dt){timer+=dt;power=Math.max(0,power-dt);invulnerable=Math.max(0,invulnerable-dt);tick+=dt;if(tick<(held.has('action') ? 0.075 : 0.118))return;tick=0;
        const desired=['up','left','down','right'].find(d=>held.has(d))||lastDir;
        if(open(p.x+dirs[desired][0],p.y+dirs[desired][1]))p.dir=desired;
        const [dx,dy]=dirs[p.dir];if(open(p.x+dx,p.y+dy)){p.x+=dx;p.y+=dy}
        p.mouth=(p.mouth+1)%2;
        const cell=tiles[p.y][p.x];if(cell==='.'||cell==='o'){tiles[p.y][p.x]=' ';pellets--;g.score+=cell==='o'?50:10;sound(cell==='o'?700:390,.035,'square',.014);if(cell==='o')power=7;if(pellets===0){finish(true);return}}
        ghosts.forEach((ghost,i)=>{if((Math.floor(timer*9)+i)%2===0)return;const possible=Object.keys(dirs).filter(d=>open(ghost.x+dirs[d][0],ghost.y+dirs[d][1]));let choices=possible.filter(d=>!((dirs[d][0]===-dirs[ghost.dir][0])&&(dirs[d][1]===-dirs[ghost.dir][1])));if(!choices.length)choices=possible;
          if(choices.length){let chosen=choices[Math.floor(Math.random()*choices.length)];if(Math.random()<.38){choices.sort((a,b)=>(Math.abs(ghost.x+dirs[a][0]-p.x)+Math.abs(ghost.y+dirs[a][1]-p.y))-(Math.abs(ghost.x+dirs[b][0]-p.x)+Math.abs(ghost.y+dirs[b][1]-p.y)));chosen=power?choices[choices.length-1]:choices[0]}ghost.dir=chosen;ghost.x+=dirs[chosen][0];ghost.y+=dirs[chosen][1]}
        });
        ghosts.forEach(ghost=>{if(ghost.x===p.x&&ghost.y===p.y){if(power>0){g.score+=200;ghost.x=ghost.startX;ghost.y=ghost.startY;sound(830,.13)}else if(invulnerable===0){g.lives--;invulnerable=2.0;p.x=1;p.y=1;p.dir='right';sound(180,.21);if(g.lives<=0)finish(false)}}});
      },
      draw(){fill('#101428',0,0,W,H);for(let i=0;i<30;i++){fill('#191e38',(i*121)%W,(i*79)%H,2,2)}const sz=37, ox=Math.round((W-21*sz)/2),oy=Math.round((H-13*sz)/2);
        for(let y=0;y<13;y++)for(let x=0;x<21;x++){let xx=ox+x*sz,yy=oy+y*sz,c=tiles[y][x];if(c==='#'){rr('#253e89',xx+1,yy+1,sz-2,sz-2,7);rr('#1a2859',xx+5,yy+5,sz-10,sz-10,5)}else if(c==='.')circle('#ffe5af',xx+sz/2,yy+sz/2,3.4);else if(c==='o')circle('#ffcf69',xx+sz/2,yy+sz/2,7+Math.sin(timer*7)*1.3)}
        ghosts.forEach(ghost=>{const x=ox+(ghost.x+.5)*sz,y=oy+(ghost.y+.5)*sz,color=power?'#698ee5':ghost.color;ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y+1,14,Math.PI,0);ctx.lineTo(x+14,y+13);ctx.lineTo(x+7,y+8);ctx.lineTo(x,y+13);ctx.lineTo(x-7,y+8);ctx.lineTo(x-14,y+13);ctx.closePath();ctx.fill();circle('#fff',x-5,y,5);circle('#fff',x+5,y,5);circle('#273255',x-4,y+1,2.6);circle('#273255',x+6,y+1,2.6)});
        const angle={right:0,down:Math.PI/2,left:Math.PI,up:Math.PI*1.5}[p.dir], px=ox+(p.x+.5)*sz,py=oy+(p.y+.5)*sz;ctx.globalAlpha=invulnerable>0&&Math.floor(timer*9)%2?.42:1;ctx.fillStyle='#ffdf50';ctx.beginPath();ctx.moveTo(px,py);ctx.arc(px,py,15,angle+(p.mouth?.35:.07),angle+Math.PI*2-(p.mouth?.35:.07));ctx.closePath();ctx.fill();ctx.globalAlpha=1;
        if(power>0){text('POWER MODE',W/2,H-8,17,'#d9ecff','center')} }
    };return g;
  }

  // GAME 2 — scrolling platform runner
  function makeRunner(){
    const platforms=[{x:0,y:495,w:745,h:65},{x:840,y:495,w:825,h:65},{x:1750,y:495,w:1250,h:65},{x:240,y:395,w:180,h:24},{x:520,y:320,w:190,h:24},{x:965,y:410,w:180,h:24},{x:1240,y:345,w:190,h:24},{x:1510,y:385,w:125,h:24},{x:1890,y:395,w:205,h:24},{x:2180,y:330,w:210,h:24},{x:2490,y:385,w:180,h:24}];
    const coins=[];for(let x=210;x<2690;x+=130)coins.push({x,y:295+(Math.sin(x*.015)*65),taken:false});
    const enemies=[{x:595,y:463,min:530,max:705,dir:-1},{x:1100,y:463,min:900,max:1430,dir:1},{x:1910,y:463,min:1790,max:2100,dir:1},{x:2440,y:463,min:2360,max:2710,dir:-1}].map(e=>({...e,w:32,h:32,alive:true}));
    const p={x:74,y:430,w:34,h:45,vx:0,vy:0,grounded:false,face:1,inv:0};let camera=0,time=0,checkpoint=74;
    const g={score:0,lives:3,extraLabel:'CAN',get extraValue(){return '♥ '.repeat(this.lives).trim()},action(){if(p.grounded){p.vy=-685;p.grounded=false;sound(490,.12)}},jump(){this.action()},
      damage(){if(p.inv>0)return;this.lives--;p.inv=1.6;sound(170,.2);if(this.lives<=0){finish(false);return}p.x=checkpoint;p.y=360;p.vy=0},
      update(dt){time+=dt;p.inv=Math.max(0,p.inv-dt);const direction=moving();p.vx=direction==='right'?300:direction==='left'?-300:0;if(p.vx)p.face=Math.sign(p.vx);p.x=clamp(p.x+p.vx*dt,0,2890);const prevBottom=p.y+p.h;p.vy+=1700*dt;if(held.has('down')&&!p.grounded)p.vy=Math.max(440,p.vy);p.y+=p.vy*dt;p.grounded=false;
        for(const a of platforms){if(p.x+p.w>a.x+5&&p.x<a.x+a.w-5&&prevBottom<=a.y+15&&p.y+p.h>=a.y&&p.vy>=0){p.y=a.y-p.h;p.vy=0;p.grounded=true}}
        if(p.y>H+60){this.damage();if(status!=='playing')return;p.y=350}
        coins.forEach(c=>{if(!c.taken&&Math.hypot(p.x+p.w/2-c.x,p.y+p.h/2-c.y)<34){c.taken=true;this.score+=50;sound(850,.07)}});
        enemies.forEach(e=>{if(!e.alive)return;e.x+=e.dir*80*dt;if(e.x<e.min||e.x>e.max)e.dir*=-1;if(hit(p,e)&&p.inv===0){if(p.vy>90&&prevBottom<e.y+14){e.alive=false;p.vy=-420;this.score+=100;sound(540,.1)}else this.damage()}});
        if(p.x>1170)checkpoint=890;if(p.x>2000)checkpoint=1790;if(p.x>=2790){this.score+=500;finish(true)}camera=clamp(p.x-330,0,2040);
      },
      draw(){const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#33356b');sky.addColorStop(1,'#8c7ac0');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);circle('#ffe4a3',800-camera*.035,100,48);
        for(let i=0;i<16;i++){const x=((i*220-camera*.19)%1350+1350)%1350-160;rr('#8e86bb',x,260+(i%3)*32,145,230,65);rr('#6c6ea6',x+32,325+(i%2)*20,112,180,55)}
        for(let i=0;i<12;i++){const x=((i*345-camera*.08)%1250+1250)%1250-140;rr('#e4c3da',x,95+(i%3)*51,80,24,13);rr('#e4c3da',x+25,84+(i%3)*51,60,30,16)}
        ctx.save();ctx.translate(-Math.floor(camera),0);
        platforms.forEach(a=>{fill('#6d4a80',a.x,a.y,a.w,a.h);fill('#e9b06b',a.x,a.y,a.w,12);for(let i=0;i<a.w;i+=48)fill('#a77572',a.x+i,a.y+17,3,20)});
        coins.forEach((c,i)=>{if(c.taken)return;const y=c.y+Math.sin(time*5+i)*4;circle('#fff0af',c.x,y,13);circle('#e3a642',c.x,y,9);text('★',c.x,y+5,15,'#ffdf6c','center')});
        enemies.forEach(e=>{if(!e.alive)return;rr('#a85eaa',e.x,e.y,e.w,e.h,8);fill('#efb0e8',e.x+6,e.y+8,7,7);fill('#efb0e8',e.x+19,e.y+8,7,7);fill('#32264d',e.x+9,e.y+10,3,4);fill('#32264d',e.x+21,e.y+10,3,4)});
        fill('#eeeded',2820,343,8,152);fill('#caff5a',2828,345,70,44);text('GO!',2863,374,21,'#1e263a','center');
        ctx.globalAlpha=p.inv>0&&Math.floor(time*12)%2?.35:1;rr('#302b5c',p.x+2,p.y+37,31,8,3);fill('#e8f5f9',p.x+6,p.y+9,24,28);fill('#5cdacf',p.x+1,p.y,34,16);fill('#4a3760',p.x+(p.face>0?21:8),p.y+17,6,7);fill('#6c577d',p.x+5,p.y+37,9,8);fill('#6c577d',p.x+22,p.y+37,9,8);ctx.globalAlpha=1;ctx.restore();
        text('→  HEDEFE ULAŞ',W-20,34,16,'#fff1cb','right')}
    };return g;
  }

  // GAME 3 — original snowy one-screen arcade
  function makeSnow(){
    const platforms=[{x:125,y:382,w:210,h:20},{x:625,y:382,w:210,h:20},{x:350,y:285,w:255,h:20},{x:35,y:215,w:190,h:20},{x:735,y:205,w:180,h:20}];
    const enemies=Array.from({length:8},(_,i)=>({x:rand(350,880),y:454,w:34,h:34,vx:(i%2?-1:1)*rand(36,68),vy:0,grounded:false,frozen:0,alive:true,blink:i}));
    const balls=[];const p={x:62,y:400,w:35,h:45,vx:0,vy:0,grounded:false,face:1,inv:1.2};let time=0,shotWait=0,remaining=enemies.length;
    const solids=[...platforms,{x:0,y:490,w:960,h:50}];
    function fall(o,dt){const old=o.y+o.h;o.vy+=1500*dt;o.y+=o.vy*dt;o.grounded=false;for(const a of solids){if(o===p&&held.has('down')&&a.y<490)continue;if(o.x+o.w>a.x+4&&o.x<a.x+a.w-4&&old<=a.y+13&&o.y+o.h>=a.y&&o.vy>=0){o.y=a.y-o.h;o.vy=0;o.grounded=true}}if(o.y>600){o.y=150;o.vy=0}}
    const g={score:0,lives:3,extraLabel:'KALAN / CAN',get extraValue(){return remaining+' / '+'♥'.repeat(this.lives)},jump(){if(p.grounded){p.vy=-590;p.grounded=false;sound(390,.08)}},
      action(){if(shotWait>0)return;shotWait=.25;balls.push({x:p.x+p.w/2+p.face*20,y:p.y+19,vx:p.face*510,r:11,age:0});sound(590,.075,'triangle')},
      update(dt){time+=dt;shotWait=Math.max(0,shotWait-dt);p.inv=Math.max(0,p.inv-dt);const move=moving();p.vx=move==='left'?-255:move==='right'?255:0;if(p.vx)p.face=Math.sign(p.vx);p.x=clamp(p.x+p.vx*dt,4,921);fall(p,dt);
        // Up or down is also a jump for boards where vertical keys feel natural.
        if(held.has('up')&&p.grounded)g.jump();
        if(held.has('action')&&shotWait===0)g.action();
        for(const e of enemies){if(!e.alive)continue;e.frozen=Math.max(0,e.frozen-dt);if(e.frozen>0)continue;e.x+=e.vx*dt;if(e.x<8||e.x>918)e.vx*=-1;fall(e,dt);if(hit(p,e)&&p.inv===0){p.inv=1.8;g.lives--;sound(170,.18);if(g.lives<=0){finish(false);return}}}
        for(let i=balls.length-1;i>=0;i--){const b=balls[i];b.x+=b.vx*dt;b.age+=dt;if(b.x<-30||b.x>990||b.age>1.5){balls.splice(i,1);continue}let consumed=false;
          for(const e of enemies){if(!e.alive||Math.hypot(b.x-(e.x+17),b.y-(e.y+17))>27)continue;
            if(e.frozen>0){e.alive=false;remaining--;g.score+=150;sound(970,.18);if(remaining===0){g.score+=500;finish(true)}}else{e.frozen=6;g.score+=25;sound(740,.15)}consumed=true;break}
          if(consumed)balls.splice(i,1)}
      },
      draw(){const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#253f77');sky.addColorStop(.85,'#647eb2');sky.addColorStop(1,'#c4e8ec');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
        for(let i=0;i<45;i++){const sx=(i*137+53)%W,sy=(i*91+time*(17+i%3*9))%H;circle('#d8f8ff',sx,sy,1.7+i%3)}
        circle('#ffedbc',830,94,37);for(let i=0;i<10;i++){const x=i*130-50;rr('#384e80',x,250+(i%3)*30,140,260,70);rr('#4f6593',x+20,286+(i%2)*25,120,230,60)}
        fill('#b3e1f2',0,488,960,52);fill('#ecfbff',0,483,960,12);
        platforms.forEach(a=>{rr('#6182ad',a.x,a.y,a.w,a.h,6);rr('#e6fbff',a.x-2,a.y-5,a.w+4,11,6);for(let i=25;i<a.w;i+=35)circle('#bce6f8',a.x+i,a.y+14,3)});
        balls.forEach(b=>{circle('#bad9fa',b.x+3,b.y+3,b.r+2);circle('#ffffff',b.x,b.y,b.r);circle('#b4daf7',b.x-3,b.y-3,3)});
        enemies.forEach(e=>{if(!e.alive)return;const cx=e.x+17,cy=e.y+16;if(e.frozen>0){circle('#b8faff',cx,cy,27);circle('#86ccea',cx,cy,22)}else{rr('#f18da1',e.x,e.y,e.w,e.h,10);rr('#e4b0d1',e.x+5,e.y+8,24,9,4)}circle('#fff',cx-7,cy-3,5);circle('#fff',cx+7,cy-3,5);circle('#26375a',cx-6,cy-2,2.5);circle('#26375a',cx+8,cy-2,2.5)});
        ctx.globalAlpha=p.inv>0&&Math.floor(time*11)%2?.4:1;rr('#e6f7ff',p.x+3,p.y+13,29,31,9);rr('#ff91be',p.x+1,p.y+1,33,19,7);fill('#ffdce8',p.x+5,p.y+14,26,5);circle('#252c57',p.x+(p.face===1?24:12),p.y+23,3);fill('#5979a6',p.x+5,p.y+39,12,6);fill('#5979a6',p.x+22,p.y+39,10,6);ctx.globalAlpha=1;
        text('DONDU / VUR / KAZAN',30,38,17,'#e8faff')}
    };return g;
  }

  // GAME 4 — efficient grid-based raycaster, no WebGL or assets
  const WALLS=[
    '1111111111111111',
    '1000000000000001',
    '1011100111000101',
    '1000100001000001',
    '1000110101011001',
    '1000000100000001',
    '1011000000110001',
    '1000001100001001',
    '1011000000100001',
    '1000000100000001',
    '1001100000110001',
    '1000000100000001',
    '1010000000101001',
    '1000000000000001',
    '1000000000000001',
    '1111111111111111'
  ];
  function makeCorridor(){
    const p={x:2.5,y:1.5,angle:0,hp:100};const targets=[[8.5,1.5],[6.5,5.5],[13.5,9.5],[4.5,11.5],[12.5,13.5],[11.5,3.5]].map(([x,y],i)=>({x,y,alive:true,hitAt:0,index:i}));
    const wall=(x,y)=>WALLS[Math.floor(y)]?.[Math.floor(x)]!=='0';
    function canWalk(x,y){const r=.21;return !wall(x-r,y-r)&&!wall(x+r,y-r)&&!wall(x-r,y+r)&&!wall(x+r,y+r)}
    function sight(x1,y1,x2,y2){const len=Math.hypot(x2-x1,y2-y1);for(let d=.12;d<len-.25;d+=.12)if(wall(x1+(x2-x1)*d/len,y1+(y2-y1)*d/len))return false;return true}
    let time=0,shotWait=0,flash=0,kills=0;
    const g={score:0,extraLabel:'ENERJİ / ROBOT',get extraValue(){return p.hp+'% / '+(targets.length-kills)},
      action(){if(shotWait>0)return;shotWait=.32;flash=.10;sound(180,.16,'sawtooth',.08);let pick=null,min=Infinity;
        for(const e of targets){if(!e.alive)continue;const d=dist(e,p),a=Math.abs(modAngle(Math.atan2(e.y-p.y,e.x-p.x)-p.angle));if(a<.11&&d<10&&d<min&&sight(p.x,p.y,e.x,e.y)){pick=e;min=d}}
        if(pick){pick.alive=false;kills++;g.score+=250;pick.hitAt=time;sound(890,.13,'square');if(kills===targets.length){g.score+=1000;finish(true)}}},
      update(dt){time+=dt;shotWait=Math.max(0,shotWait-dt);flash=Math.max(0,flash-dt);const turn=(held.has('right')?1:0)-(held.has('left')?1:0);p.angle=modAngle(p.angle+turn*2.3*dt);const move=(held.has('up')?1:0)-(held.has('down')?1:0);
        if(move){const sx=Math.cos(p.angle)*move*2.55*dt,sy=Math.sin(p.angle)*move*2.55*dt;if(canWalk(p.x+sx,p.y))p.x+=sx;if(canWalk(p.x,p.y+sy))p.y+=sy}
        if(held.has('action')&&shotWait<=0)g.action();
        for(const e of targets){if(!e.alive)continue;const d=dist(e,p);if(d<6.5&&d>.58&&sight(e.x,e.y,p.x,p.y)){const dx=(p.x-e.x)/d*.42*dt,dy=(p.y-e.y)/d*.42*dt;if(canWalk(e.x+dx,e.y))e.x+=dx;if(canWalk(e.x,e.y+dy))e.y+=dy}if(d<.75&&Math.floor(time*2)!==Math.floor((time-dt)*2)){p.hp=Math.max(0,p.hp-9);sound(135,.08);if(p.hp<=0){finish(false);return}}}
      },
      draw(){const horizon=H/2;const ceil=ctx.createLinearGradient(0,0,0,horizon);ceil.addColorStop(0,'#15172f');ceil.addColorStop(1,'#3a3666');ctx.fillStyle=ceil;ctx.fillRect(0,0,W,horizon);const floor=ctx.createLinearGradient(0,horizon,0,H);floor.addColorStop(0,'#3d304c');floor.addColorStop(1,'#151421');ctx.fillStyle=floor;ctx.fillRect(0,horizon,W,H-horizon);
        for(let y=0;y<10;y++){const fy=horizon+(H/2)*(1-1/(1+(y+1)*.45));fill('#46415b',0,fy,W,1)}
        const fov=Math.PI/2.9,strip=3,columns=W/strip,zBuffer=new Float32Array(columns);
        for(let i=0;i<columns;i++){const cam=(2*(i+.5)/columns-1)*Math.tan(fov/2),rayAngle=p.angle+Math.atan(cam),rx=Math.cos(rayAngle),ry=Math.sin(rayAngle);let mx=Math.floor(p.x),my=Math.floor(p.y),sideX,sideY;const deltaX=Math.abs(1/rx),deltaY=Math.abs(1/ry);let stepX,stepY;
          if(rx<0){stepX=-1;sideX=(p.x-mx)*deltaX}else{stepX=1;sideX=(mx+1-p.x)*deltaX}if(ry<0){stepY=-1;sideY=(p.y-my)*deltaY}else{stepY=1;sideY=(my+1-p.y)*deltaY}
          let side=0;for(let s=0;s<22;s++){if(sideX<sideY){sideX+=deltaX;mx+=stepX;side=0}else{sideY+=deltaY;my+=stepY;side=1}if(WALLS[my]?.[mx]!=='0')break}
          const rawDist=side===0?sideX-deltaX:sideY-deltaY,perp=Math.max(.1,rawDist*Math.cos(rayAngle-p.angle)),height=Math.min(1000,H/perp*.78),top=horizon-height/2;zBuffer[i]=rawDist;
          const wallX=side===0?p.y+rawDist*ry:p.x+rawDist*rx;const pattern=Math.floor((wallX-Math.floor(wallX))*4);const brightness=clamp(1-perp/16,.19,1)*(side?.72:1),r=Math.floor((74+pattern*5)*brightness),g=Math.floor((91+pattern*5)*brightness),b=Math.floor((160+pattern*8)*brightness);
          fill(`rgb(${r},${g},${b})`,i*strip,top,strip+1,height);fill(`rgba(190,230,255,${.13*brightness})`,i*strip,top,strip+1,Math.max(2,height*.035));if(pattern===0)fill(`rgba(9,13,27,${.22*brightness})`,i*strip,top,strip,Math.max(1,height));
        }
        const visible=targets.filter(e=>e.alive).map(e=>({...e,d:dist(e,p),angle:modAngle(Math.atan2(e.y-p.y,e.x-p.x)-p.angle)})).sort((a,b)=>b.d-a.d);
        visible.forEach(e=>{if(Math.abs(e.angle)>fov*.7||e.d<.2)return;const correct=e.d*Math.cos(e.angle),size=Math.min(H, H/correct*.67),sx=W/2+(Math.tan(e.angle)/Math.tan(fov/2))*W/2,sy=H/2-size*.5;const idx=clamp(Math.floor(sx/strip),0,columns-1);if(e.d>zBuffer[idx]+.25)return;rr('#1a1029',sx-size*.29+3,sy+size*.17,size*.58,size*.72,size*.08);rr('#f25e9a',sx-size*.27,sy+size*.12,size*.54,size*.65,size*.09);rr('#ffabd0',sx-size*.2,sy+size*.22,size*.4,size*.24,size*.05);circle('#241d45',sx-size*.09,sy+size*.33,size*.04);circle('#241d45',sx+size*.09,sy+size*.33,size*.04);fill('#ff8abe',sx-size*.19,sy+size*.79,size*.12,size*.14);fill('#ff8abe',sx+size*.07,sy+size*.79,size*.12,size*.14)});
        fill('#e6eeff',W/2-13,H/2,8,2);fill('#e6eeff',W/2+5,H/2,8,2);fill('#e6eeff',W/2,H/2-13,2,8);fill('#e6eeff',W/2,H/2+5,2,8);
        rr('#262332',W/2-70,H-47,140,80,24);rr(flash>0?'#ffe1ad':'#6a7998',W/2-34,H-68,68,85,9);fill('#26324c',W/2-17,H-78,34,24);
        if(flash>0){circle('rgba(255,224,130,.66)',W/2,H-102,39);circle('#fff4d1',W/2,H-102,18)}
        rr('#151b32',22,21,205,31,7);rr(p.hp>30?'#caff5a':'#ff6680',26,25,197*p.hp/100,23,5);text('ENERJİ  '+p.hp+'%',32,43,16,'#202233');
        text('HEDEF: '+(targets.length-kills)+' ROBOT',W-25,40,17,'#f1dfff','right')}
    };return g;
  }

  // 12-stage complete FPS campaign with deterministic generated maps and checkpoints.
  function makeCampaign(){
    const TOTAL=12,SIZE=17;let saved=null;try{saved=JSON.parse(localStorage.getItem('tahtaCampaign')||'null')}catch{}
    let stage=clamp(saved?.stage||1,1,TOTAL),hp=clamp(saved?.hp||100,25,100),map=[],enemies=[],medkits=[],exit={x:15.5,y:15.5},p={x:1.5,y:1.5,angle:0};
    let shots=0,flash=0,time=0,damageFlash=0;
    const g={score:saved?.score||0,extraLabel:'BÖLÜM / ENERJİ',get extraValue(){return stage+'/12 · '+hp+'%'},
      action(){if(shots>0)return;shots=.25;flash=.09;sound(160,.15,'sawtooth',.07);let chosen=null,best=99;
        for(const e of enemies){if(!e.alive)continue;const d=dist(e,p),a=Math.abs(modAngle(Math.atan2(e.y-p.y,e.x-p.x)-p.angle));if(a<.13&&d<9&&d<best&&sight(p.x,p.y,e.x,e.y)){chosen=e;best=d}}
        if(chosen){chosen.hp--;chosen.hitAt=time;sound(920,.1);if(chosen.hp<=0){chosen.alive=false;g.score+=200}}},
      update(dt){time+=dt;shots=Math.max(0,shots-dt);flash=Math.max(0,flash-dt);damageFlash=Math.max(0,damageFlash-dt);
        const turn=(held.has('right')?1:0)-(held.has('left')?1:0);p.angle=modAngle(p.angle+turn*2.65*dt);const move=(held.has('up')?1:0)-(held.has('down')?1:0);
        if(move){const dx=Math.cos(p.angle)*move*2.85*dt,dy=Math.sin(p.angle)*move*2.85*dt;if(canWalk(p.x+dx,p.y))p.x+=dx;if(canWalk(p.x,p.y+dy))p.y+=dy}
        if(held.has('action')&&shots===0)g.action();
        for(const e of enemies){if(!e.alive)continue;const d=dist(e,p);e.cooldown=Math.max(0,e.cooldown-dt);
          if(d<4.4&&d>.65&&sight(e.x,e.y,p.x,p.y)){const dx=(p.x-e.x)/d*(.26+stage*.017)*dt,dy=(p.y-e.y)/d*(.26+stage*.017)*dt;if(canWalk(e.x+dx,e.y))e.x+=dx;if(canWalk(e.x,e.y+dy))e.y+=dy}
          if(d<.8&&e.cooldown===0){e.cooldown=1;hp=Math.max(0,hp-(5+Math.floor(stage/4)));damageFlash=.18;sound(140,.08);if(hp===0){finish(false);return}}}
        for(const m of medkits){if(!m.used&&dist(m,p)<.5){m.used=true;hp=Math.min(100,hp+25);g.score+=30;sound(750,.13)}}
        if(enemies.every(e=>!e.alive)&&dist(exit,p)<.65){g.score+=600+stage*80;if(stage===TOTAL){try{localStorage.removeItem('tahtaCampaign')}catch{}finish(true)}else{stage++;hp=Math.min(100,hp+22);persist();build(stage);status='ready';clearKeys();showOverlay('BÖLÜM TAMAMLANDI',`BÖLÜM ${stage} / ${TOTAL}`,`Yeni harita hazır! Enerjin ${hp}%. Robotları temizleyip yeşil çıkışa ulaş.`,'▶ DEVAM ET');sound(870,.26)} }
      },
      draw(){render();}
    };
    function seeded(s){let n=s>>>0;return()=>{n=(n*1664525+1013904223)>>>0;return n/4294967296}}
    function open(x,y){return map[Math.floor(y)]?.[Math.floor(x)]==='0'}
    function wall(x,y){return !open(x,y)}
    function canWalk(x,y){const r=.2;return !wall(x-r,y-r)&&!wall(x+r,y-r)&&!wall(x-r,y+r)&&!wall(x+r,y+r)}
    function sight(x1,y1,x2,y2){const len=Math.hypot(x2-x1,y2-y1);for(let d=.15;d<len-.23;d+=.15)if(wall(x1+(x2-x1)*d/len,y1+(y2-y1)*d/len))return false;return true}
    function persist(){try{localStorage.setItem('tahtaCampaign',JSON.stringify({stage,hp,score:g.score}))}catch{}}
    function build(n){const R=seeded(7861+n*9527),grid=Array.from({length:SIZE},()=>Array(SIZE).fill('1'));
      function carve(x,y){grid[y][x]='0';const dirs=[[2,0],[-2,0],[0,2],[0,-2]];for(let i=dirs.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[dirs[i],dirs[j]]=[dirs[j],dirs[i]]}for(const [dx,dy] of dirs){const xx=x+dx,yy=y+dy;if(xx>0&&yy>0&&xx<SIZE-1&&yy<SIZE-1&&grid[yy][xx]==='1'){grid[y+dy/2][x+dx/2]='0';carve(xx,yy)}}}carve(1,1);
      let opened=0;for(let i=0;i<260&&opened<12+n*2;i++){const x=1+Math.floor(R()*(SIZE-2)),y=1+Math.floor(R()*(SIZE-2));if(grid[y][x]==='1'&&((grid[y][x-1]==='0'&&grid[y][x+1]==='0')||(grid[y-1][x]==='0'&&grid[y+1][x]==='0'))){grid[y][x]='0';opened++}}
      map=grid.map(row=>row.join(''));p={x:1.5,y:1.5,angle:0};
      const queue=[[1,1,0]],visited=new Set(['1,1']);for(let i=0;i<queue.length;i++){const [x,y,d]=queue[i];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=nx+','+ny;if(grid[ny]?.[nx]==='0'&&!visited.has(k)){visited.add(k);queue.push([nx,ny,d+1])}}}
      const sorted=queue.slice().sort((a,b)=>b[2]-a[2]);exit={x:sorted[0][0]+.5,y:sorted[0][1]+.5};const far=queue.filter(c=>c[2]>7);const count=Math.min(10,3+Math.ceil(n*.55));enemies=[];
      for(let i=0;i<count;i++){let point=far[Math.floor((i+.4)*far.length/count)]||sorted[i+1]||sorted[0];enemies.push({x:point[0]+.5,y:point[1]+.5,hp:n>8?2:1,alive:true,cooldown:0,hitAt:-10})}
      medkits=[];for(let i=0;i<2+Math.floor(n/4);i++){const point=far[Math.floor(R()*far.length)]||sorted[0];medkits.push({x:point[0]+.5,y:point[1]+.5,used:false})}
    }
    function render(){const horizon=H*.52;const sky=ctx.createLinearGradient(0,0,0,horizon);sky.addColorStop(0,'#17142e');sky.addColorStop(1,stage%3===0?'#583950':'#37365f');ctx.fillStyle=sky;ctx.fillRect(0,0,W,horizon);
      const floor=ctx.createLinearGradient(0,horizon,0,H);floor.addColorStop(0,'#43334e');floor.addColorStop(1,'#171525');ctx.fillStyle=floor;ctx.fillRect(0,horizon,W,H-horizon);for(let i=0;i<7;i++){const y=horizon+(H-horizon)*(1-1/(1+(i+1)*.4));fill('#ffffff0b',0,y,W,1)}
      const columns=320,strip=W/columns,fov=Math.PI/2.9,zbuf=new Float32Array(columns);
      for(let i=0;i<columns;i++){const cam=(2*(i+.5)/columns-1)*Math.tan(fov/2),a=p.angle+Math.atan(cam),rx=Math.cos(a),ry=Math.sin(a);let mx=Math.floor(p.x),my=Math.floor(p.y),sx,sy,dx=Math.abs(1/rx),dy=Math.abs(1/ry),stepX,stepY;
        if(rx<0){stepX=-1;sx=(p.x-mx)*dx}else{stepX=1;sx=(mx+1-p.x)*dx}if(ry<0){stepY=-1;sy=(p.y-my)*dy}else{stepY=1;sy=(my+1-p.y)*dy}
        let side=0;for(let s=0;s<26;s++){if(sx<sy){sx+=dx;mx+=stepX;side=0}else{sy+=dy;my+=stepY;side=1}if(map[my]?.[mx]!=='0')break}
        const depth=side===0?sx-dx:sy-dy,perp=Math.max(.12,depth*Math.cos(a-p.angle)),h=Math.min(1200,H/perp*.83),top=horizon-h/2;zbuf[i]=depth;
        const edge=side===0?p.y+depth*ry:p.x+depth*rx,pattern=Math.floor((edge-Math.floor(edge))*5),brightness=clamp(1-perp/13,.18,1)*(side?.74:1),base=stage%3;
        const r=Math.floor((base===1?95:66)*brightness),g=Math.floor((base===2?125:87)*brightness),b=Math.floor((base===0?185:146)*brightness);
        fill(`rgb(${r+pattern*2},${g+pattern*2},${b+pattern*2})`,i*strip,top,strip+1,h);fill(`rgba(190,220,255,${brightness*.14})`,i*strip,top,strip+1,Math.max(2,h*.025));if(pattern===0)fill('#11152636',i*strip,top,strip,h)
      }
      const objects=[...enemies.filter(e=>e.alive).map(e=>({...e,type:'enemy'})),...medkits.filter(m=>!m.used).map(m=>({...m,type:'med'})),{...exit,type:'exit'}].map(e=>({...e,d:dist(e,p),a:modAngle(Math.atan2(e.y-p.y,e.x-p.x)-p.angle)})).sort((a,b)=>b.d-a.d);
      for(const e of objects){if(Math.abs(e.a)>fov*.7||e.d<.25)continue;const effective=e.d*Math.cos(e.a),size=Math.min(570,H/effective*(e.type==='exit'?.82:.60)),sx=W/2+Math.tan(e.a)/Math.tan(fov/2)*W/2,sy=horizon-size*.52,idx=clamp(Math.floor(sx/strip),0,columns-1);if(e.d>zbuf[idx]+.2)continue;
        if(e.type==='enemy'){rr('#191629',sx-size*.25+3,sy+size*.16,size*.5,size*.73,size*.08);rr(time-e.hitAt<.15?'#fff2cf':'#f577ac',sx-size*.24,sy+size*.12,size*.48,size*.65,size*.06);rr('#fbb7d5',sx-size*.19,sy+size*.24,size*.38,size*.17,size*.04);circle('#25243b',sx-size*.08,sy+size*.32,size*.038);circle('#25243b',sx+size*.08,sy+size*.32,size*.038);fill('#ec7fa9',sx-size*.18,sy+size*.77,size*.1,size*.12);fill('#ec7fa9',sx+size*.08,sy+size*.77,size*.1,size*.12)}
        else if(e.type==='med'){rr('#eff7ff',sx-size*.20,sy+size*.35,size*.4,size*.3,size*.04);fill('#6cdb9d',sx-size*.045,sy+size*.39,size*.09,size*.22);fill('#6cdb9d',sx-size*.12,sy+size*.45,size*.24,size*.09)}
        else{const free=enemies.every(a=>!a.alive);rr(free?'#caff5a':'#e77da4',sx-size*.25,sy,size*.5,size*.98,size*.07);rr(free?'#31535d':'#4d284a',sx-size*.2,sy+size*.08,size*.4,size*.86,size*.04);text(free?'ÇIKIŞ':'KİLİTLİ',sx,sy+size*.45,Math.max(10,size*.12),'#fff','center')}
      }
      fill('#f4f8ff',W/2-14,horizon,9,2);fill('#f4f8ff',W/2+5,horizon,9,2);fill('#f4f8ff',W/2,horizon-14,2,9);fill('#f4f8ff',W/2,horizon+5,2,9);
      rr('#262334',W/2-67,H-45,134,80,22);rr(flash>0?'#ffe6ad':'#6d82a5',W/2-33,H-67,66,88,9);fill('#29344c',W/2-16,H-79,32,23);if(flash>0){circle('#ffde9985',W/2,H-103,40);circle('#fff4d9',W/2,H-103,16)}if(damageFlash>0)fill('#ff1e3226',0,0,W,H);
      rr('#161a2b',18,17,240,69,9);text('BÖLÜM '+stage+' / '+TOTAL,29,42,20,'#f4e7ff');fill('#4a3548',30,58,213,14);fill(hp>30?'#caff5a':'#ff779b',30,58,213*hp/100,14);
      const remaining=enemies.filter(e=>e.alive).length;text(remaining?'ROBOT: '+remaining:'ÇIKIŞ AÇILDI!',W-189,35,16,remaining?'#f8d0e2':'#caff5a','center');
      const m=9,mx=W-SIZE*m-18,my=49;rr('#101723d9',mx-7,my-7,SIZE*m+14,SIZE*m+14,8);for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++)fill(map[y][x]==='1'?'#43517a':'#18273c',mx+x*m,my+y*m,m-1,m-1);
      circle(enemies.every(e=>!e.alive)?'#caff5a':'#ff7799',mx+exit.x*m,my+exit.y*m,3.5);for(const e of enemies)if(e.alive)circle('#ff89b2',mx+e.x*m,my+e.y*m,2.7);for(const a of medkits)if(!a.used)circle('#98eac8',mx+a.x*m,my+a.y*m,2.5);circle('#fff7dc',mx+p.x*m,my+p.y*m,4);fill('#f6f7ff',mx+p.x*m+Math.cos(p.angle)*4,my+p.y*m+Math.sin(p.angle)*4,3,3);
      text('BÖLÜMÜ BİTİR: ROBOTLAR → ÇIKIŞ',25,H-23,15,'#c6c6df')
    }
    build(stage);return g;
  }

  const extra=window.TahtaExtra({ctx,W,H,fill,text,circle,rr,held,rand,clamp,hit,sound,finish,moving,getLastDir:()=>lastDir});
  const factories={maze:makeMaze,runner:makeRunner,snow:makeSnow,corridor:makeCampaign,...extra.factories,custom:()=>extra.create(generatedSpec||{base:'dodge',theme:'space',difficulty:'normal'})};
  $('makeBtn').addEventListener('click',async()=>{
    const prompt=$('gamePrompt').value.trim();if(!prompt){$('gamePrompt').focus();$('gamePrompt').placeholder='Önce oyun fikrini yaz, sonra tekrar dene!';return}
    const idea=prompt.toLocaleLowerCase('tr-TR');
    const match=(expr)=>expr.test(idea);
    let base='dodge';if(match(/mayın|tarlası|minesweeper/))base='mines';else if(match(/balon|patlat/))base='bubbles';else if(match(/yılan|snake|solucan/))base='snake';else if(match(/tetris|blok|bulmaca|parça yerleştir/))base='blocks';else if(match(/araba|yarış|trafik|asfalt|aracım/))base='racer';else if(match(/tenis|raket|pong|masa tenisi/))base='pong';else if(match(/kuş|kanat|uçuş|flappy|uçarak|uçan/))base='flap';else if(match(/tuğla|duvar kır|top sektir|brick/))base='bricks';else if(match(/silah|ateş|saldır|uzay savaşı|uzaylı vur|gemimle savaş/))base='space';
    let theme=$('gameTheme').value;if(theme==='auto'){theme=match(/deniz|okyanus|balık|su altı|mercan/)?'ocean':match(/orman|ağaç|yeşil|doğa|çiçek/)?'forest':match(/şeker|pembe|pasta|şirin|tatlı/)?'candy':'space'}
    let diff=$('gameDifficulty').value;if(diff==='normal'&&match(/çok zor|zor olsun|hızlı|çılgın|imkansız/))diff='hard';else if(diff==='normal'&&match(/kolay|yavaş|rahat|çocuk/))diff='easy';
    const themeNames={space:'KOZMİK',ocean:'DERİN MAVİ',forest:'YEŞİL',candy:'ŞEKER'};
    const baseNames={dodge:'KAÇIŞ',snake:'YILAN',space:'SAVUNMA',blocks:'BLOKLAR',bricks:'TUĞLALAR',pong:'DÜELLO',flap:'UÇUŞ',racer:'YARIŞ',bubbles:'BALONLAR',mines:'MAYIN TARLASI'};
    const icons={dodge:'☄',snake:'🐍',space:'🚀',blocks:'▦',bricks:'⬡',pong:'●',flap:'✦',racer:'🏎',bubbles:'🎈',mines:'⚑'};
    let source='local';
    generatedSpec={base,theme,difficulty:diff,duration:diff==='hard'?55:diff==='easy'?35:45,title:themeNames[theme]+' '+baseNames[base]};
    const makerStatus=$('makerStatus');
    const makerButton=$('makeBtn');
    if($('aiMode').checked){
      makerStatus.textContent='Yapay zekâ sunucusuna bağlanılıyor…';makerButton.disabled=true;
      const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),12000);
      try{
        const response=await fetch('/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt,difficulty:diff,theme:$('gameTheme').value}),signal:controller.signal});
        if(!response.ok)throw Error('Yapay zekâ hazır değil');
        const result=await response.json(),candidate=result.spec;
        if(!candidate||!Object.hasOwn(baseNames,candidate.base)||!Object.hasOwn(themeNames,candidate.theme)||!['easy','normal','hard'].includes(candidate.difficulty))throw Error('Beklenmeyen oyun planı');
        generatedSpec={base:candidate.base,theme:candidate.theme,difficulty:candidate.difficulty,duration:Math.max(20,Math.min(90,Number(candidate.duration)||45)),title:typeof candidate.title==='string'?candidate.title.replace(/[^\p{L}\p{N} !?-]/gu,'').slice(0,32):themeNames[candidate.theme]+' '+baseNames[candidate.base]};
        if(!generatedSpec.title)generatedSpec.title=themeNames[candidate.theme]+' '+baseNames[candidate.base];
        base=generatedSpec.base;theme=generatedSpec.theme;diff=generatedSpec.difficulty;source='model';
      }catch{source='fallback'}finally{clearTimeout(timeout);makerButton.disabled=false}
    }
    makerStatus.textContent=source==='model'?'✓ Yapay zekâ oyun planını oluşturdu; güvenli oyun motoru hazır.':source==='fallback'?'ℹ Yapay zekâ sunucusu kullanılamadı. Oyunun yerel üreticiyle hazırlandı.':'✓ Oyun, ücretsiz yerel üreticiyle hazırlandı.';
    names.custom=generatedSpec.title;descriptions.custom=`Sana özel ${baseNames[base].toLocaleLowerCase('tr-TR')} oyunu · ${diff==='hard'?'Zor':diff==='easy'?'Kolay':'Normal'} seviye · ${themeNames[theme]} tema.`;
    const artColors={space:'#8cb7ff',ocean:'#69e7eb',forest:'#a6ef9c',candy:'#ffa4da'};
    $('makerResult').innerHTML=`<div class="created-result"><div class="generated-art" style="--accent:${artColors[theme]}">${icons[base]}</div><div class="generated-caption"><div><strong class="generated-title"></strong><small>${source==='model'?'YAPAY ZEKÂ PLANI':'YEREL OYUN PLANI'} · DOKUNMATİK HAZIR</small></div><span>✦</span></div><div class="generated-steps"><span>✓ FİKİR</span><span>✓ KURALLAR</span><span>✓ GÖRSELLER</span><span>✓ OYNANIŞ</span></div><button class="created-play" id="playCreated">▶ OYUNUMU OYNA</button></div>`;
    $('makerResult').querySelector('.generated-title').textContent=generatedSpec.title;
    $('playCreated').addEventListener('click',()=>openGame('custom'));sound(880,.14);
  });
  function drawGame(){if(!game)return;try{game.draw();updateHud()}catch(err){console.error('Game render error:',err);status='paused';showOverlay('BİR ŞEY OLDU','OYUN DURDU','Yeniden başlatarak devam edebilirsin.','↻ YENİDEN DENE')}}
  function frame(now){const dt=clamp((now-lastFrame)/1000||0,0,.035);lastFrame=now;if(status==='playing'&&game){game.update(dt);drawGame()}requestAnimationFrame(frame)}
  requestAnimationFrame(frame);

  // Miniature illustrations for the game selection cards (drawn once, no image downloads).
  function drawPreviews(){
    document.querySelectorAll('[data-preview]').forEach(c=>{const x=c.getContext('2d'),id=c.dataset.preview,w=c.width,h=c.height;
      const r=(color,xx,yy,ww,hh)=>{x.fillStyle=color;x.fillRect(xx,yy,ww,hh)};const ball=(color,xx,yy,rad)=>{x.fillStyle=color;x.beginPath();x.arc(xx,yy,rad,0,Math.PI*2);x.fill()};
      if(id==='maze'){r('#151b43',0,0,w,h);for(let i=0;i<9;i++){r('#3857a4',i*57-8,21,26,110);r('#3857a4',i*57-8,157,26,100)}for(let i=0;i<16;i++)ball('#ffdc91',i*36+10,135,4);ball('#ffe465',177,136,41);x.fillStyle='#151b43';x.beginPath();x.moveTo(177,136);x.lineTo(215,110);x.lineTo(215,162);x.fill();for(let i=0;i<2;i++){let xx=313+i*76;x.fillStyle=i?'#7de5fd':'#ff81b9';x.beginPath();x.arc(xx,125,26,Math.PI,0);x.lineTo(xx+26,160);x.lineTo(xx-26,160);x.fill();ball('white',xx-9,127,8);ball('white',xx+9,127,8);ball('#25254a',xx-7,130,4);ball('#25254a',xx+11,130,4)}}
      else if(id==='runner'){r('#5e6daa',0,0,w,h);ball('#ffe4aa',395,57,38);for(let i=0;i<6;i++){ball('#838fc1',i*102,211,85)}r('#8f5c83',0,225,w,45);r('#f3bf79',0,215,w,16);r('#b17181',85,146,130,18);r('#f3bf79',85,140,130,9);for(let i=0;i<5;i++){ball('#ffe27b',185+i*51,75+(i%2)*31,13);ball('#c99348',185+i*51,75+(i%2)*31,8)}r('#e6f7ff',97,173,34,43);r('#65dfc8',90,164,49,17);r('#423b70',117,189,8,8);r('#4d4670',98,210,12,13);r('#4d4670',122,210,12,13)}
      else if(id==='snow'){r('#3c6099',0,0,w,h);for(let i=0;i<50;i++)ball('#b7e5f5',(i*79)%w,(i*47)%h,2+(i%3));r('#b2e2ed',0,226,w,44);r('#e8f9fa',0,220,w,10);r('#7ea9c7',100,147,225,17);r('#e9faff',99,141,227,9);ball('#b3edff',308,177,52);ball('#78c8e8',308,177,40);ball('#fff',291,172,11);ball('#fff',325,172,11);ball('#263c62',295,174,5);ball('#263c62',328,174,5);r('#f8faff',94,183,49,44);r('#fa86b1',89,178,61,22);ball('#263450',132,205,5);ball('#fff',203,194,17);ball('#d2f2ff',198,190,8)}
      else if(id==='snake'){r('#19274a',0,0,w,h);for(let i=0;i<15;i++)for(let j=0;j<9;j++)r('#24345d',i*32,j*32,30,30);for(let i=0;i<8;i++){const px=85+i*28,py=i<4?155:155-(i-3)*28;r(i===7?'#caff5a':'#88d3ff',px,py,26,26)}ball('#ff92b6',350,126,17)}
      else if(id==='space'){r('#0e1636',0,0,w,h);for(let i=0;i<60;i++)ball('#b3c3f5',(i*71)%w,(i*119)%h,i%3+1);for(let j=0;j<3;j++)for(let i=0;i<7;i++){const xx=70+i*55,yy=44+j*48;r('#af98ed',xx,yy,30,24);r('#f5e3ff',xx+6,yy+8,5,5);r('#f5e3ff',xx+19,yy+8,5,5)}x.fillStyle='#a4ebdc';x.beginPath();x.moveTo(240,181);x.lineTo(289,257);x.lineTo(191,257);x.fill();r('#caff5a',236,155,7,35)}
      else if(id==='blocks'){r('#1b2441',0,0,w,h);const cs=['#8ee6fa','#fbdc8b','#a6f0b9','#b7a0ff','#ff9cc0'];for(let i=0;i<8;i++)for(let j=0;j<5;j++){if((i*3+j*7)%5>0)r(cs[(i+j)%5],114+j*49,240-i*32,45,28)}r('#c9f9a4',215,34,46,34);r('#c9f9a4',264,34,46,34);r('#c9f9a4',215,70,46,34);r('#c9f9a4',264,70,46,34)}
      else if(id==='bricks'){r('#1c2541',0,0,w,h);for(let j=0;j<5;j++)for(let i=0;i<8;i++)r(['#ff9ac8','#ffdb86','#a6d9ef','#a6efb5','#b8a4fa'][j],29+i*54,29+j*35,49,29);r('#d4ff76',190,244,115,12);ball('#fff8e5',250,213,13)}
      else if(id==='pong'){r('#10182e',0,0,w,h);for(let i=0;i<8;i++)r('#3e456e',238,i*36,5,22);r('#caff5a',63,99,14,85);r('#ff99ca',403,77,14,85);ball('#faf8ed',232,140,17);r('#f1f4ff',218,43,46,3)}
      else if(id==='flap'){r('#536f9e',0,0,w,h);for(let i=0;i<6;i++)ball('#a2bbde',i*110,220,85);r('#8ce2d3',75,0,74,77);r('#8ce2d3',75,201,74,70);r('#8ce2d3',330,0,74,131);r('#8ce2d3',330,254,74,40);ball('#ffdc79',236,144,28);ball('#fff',248,135,9);ball('#293451',250,135,4);r('#ffa789',252,152,25,8)}
      else if(id==='racer'){r('#35555a',0,0,w,h);r('#29313e',99,0,282,h);r('#efe8cf',98,0,5,h);r('#efe8cf',380,0,5,h);for(let i=0;i<8;i++){r('#d9d2b8',193,i*40,4,25);r('#d9d2b8',286,i*40,4,25)}r('#a9eadf',215,147,55,97);r('#324c65',226,166,33,27);r('#ff9bc8',320,53,46,84);r('#ffe08b',109,104,52,90)}
      else if(id==='dodge'){r('#19254a',0,0,w,h);for(let i=0;i<60;i++)ball('#a2b5e6',(i*119)%w,(i*71)%h,2);for(let i=0;i<8;i++){const xx=35+i*62,yy=44+(i%3)*53;r('#f58ba8',xx,yy,40,40);r('#ffbece',xx+7,yy+7,26,26)}ball('#caff5a',231,213,26);ball('#ffdf80',318,201,19)}
      else if(id==='bubbles'){r('#292a50',0,0,w,h);for(let i=0;i<19;i++){const colors=['#ffa3cf','#95e8f2','#c3a4fa','#d3fb8b','#ffdd95'],xx=(i*137+29)%w,yy=(i*79+32)%h,rad=21+i%4*7;ball(colors[i%5],xx,yy,rad);ball('#ffffff88',xx-rad*.3,yy-rad*.35,rad*.21)}x.strokeStyle='#fff';x.lineWidth=3;x.beginPath();x.arc(235,135,37,0,Math.PI*2);x.stroke()}
      else if(id==='mines'){r('#1a2640',0,0,w,h);for(let row=0;row<5;row++)for(let col=0;col<9;col++){const xx=42+col*45,yy=24+row*45;r((row+col)%4===0?'#344762':'#5d77ab',xx,yy,40,40);if((row===1&&col===3)||(row===3&&col===6)){x.fillStyle='#ffd788';x.font='bold 29px sans-serif';x.fillText('⚑',xx+8,yy+31)}else if((row+col)%5===0){x.fillStyle='#a3e6fa';x.font='bold 24px monospace';x.fillText(String(1+(row%3)),xx+12,yy+29)}}}
      else{r('#18152e',0,0,w,h);r('#382b59',0,135,w,135);x.fillStyle='#5d548d';x.beginPath();x.moveTo(0,0);x.lineTo(197,91);x.lineTo(197,178);x.lineTo(0,270);x.closePath();x.fill();x.fillStyle='#51466f';x.beginPath();x.moveTo(w,0);x.lineTo(283,91);x.lineTo(283,178);x.lineTo(w,270);x.closePath();x.fill();r('#1a1d3d',197,91,86,87);for(let i=0;i<5;i++){r('#8f80b0',0,i*54,110-i*17,3);r('#8f80b0',w-110+i*17,i*54,110-i*17,3)}r('#fb76ae',225,125,29,39);r('#ffc2d8',229,134,21,11);r('#22243e',235,137,5,5);r('#22243e',244,137,5,5);r('#a6a5d4',229,163,7,9);r('#a6a5d4',245,163,7,9);r('#d0f8dc',240,102,2,32);r('#d0f8dc',225,116,30,2)}
    });
  }
  drawPreviews();
})();
