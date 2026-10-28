/* More original microgames. Shared rendering/input loop lives in game.js. */
window.TahtaExtra = function(api){
  'use strict';
  const {ctx,W,H,fill,text,circle,rr,held,rand,clamp,hit,sound,finish,moving,getLastDir}=api;
  const themes={space:['#0c1430','#8cb7ff','#caff5a'],ocean:['#092c3c','#69e7eb','#ffe0a7'],forest:['#152c2b','#a6ef9c','#ffe0a0'],candy:['#382342','#ffa4da','#ffdf79']};
  const palette=spec=>themes[spec?.theme]||themes.space;
  const difficulty=spec=>spec?.difficulty==='hard'?1.35:spec?.difficulty==='easy'?.78:1;
  function backdrop(spec,stars=36){const [bg,accent]=palette(spec);fill(bg,0,0,W,H);for(let i=0;i<stars;i++){const x=(i*177+31)%W,y=(i*127+71)%H;circle(accent,x,y,1+i%2*.5)}}

  function snake(spec={}){
    const cells=25,rows=15,sz=30,ox=(W-cells*sz)/2,oy=(H-rows*sz)/2;
    const parts=[{x:7,y:7},{x:6,y:7},{x:5,y:7},{x:4,y:7}];let direction='right',next='right',food={x:17,y:7},tick=0,elapsed=0;
    const vectors={left:[-1,0],right:[1,0],up:[0,-1],down:[0,1]},opposite={left:'right',right:'left',up:'down',down:'up'};
    const g={score:0,extraLabel:'UZUNLUK',get extraValue(){return String(parts.length)},action(){},update(dt){elapsed+=dt;const wanted=['up','down','left','right'].find(k=>held.has(k))||getLastDir();if(wanted&&wanted!==opposite[direction])next=wanted;tick+=dt;const interval=(held.has('action')?.075:.14)/difficulty(spec);if(tick<interval)return;tick=0;direction=next;
      const d=vectors[direction],head={x:parts[0].x+d[0],y:parts[0].y+d[1]};const ate=head.x===food.x&&head.y===food.y;
      if(head.x<0||head.x>=cells||head.y<0||head.y>=rows||parts.slice(0,ate?undefined:-1).some(p=>p.x===head.x&&p.y===head.y)){finish(false);return}
      parts.unshift(head);if(ate){g.score+=100;sound(820,.07);let tries=0;do{food={x:Math.floor(rand(0,cells)),y:Math.floor(rand(0,rows))};tries++}while(parts.some(p=>p.x===food.x&&p.y===food.y)&&tries<200);if(parts.length>=25){g.score+=500;finish(true)}}else parts.pop();
    },draw(){backdrop(spec,26);rr('#1d2741',ox-10,oy-10,cells*sz+20,rows*sz+20,13);for(let y=0;y<rows;y++)for(let x=0;x<cells;x++)if((x+y)%2===0)fill('#1e2c4e',ox+x*sz,oy+y*sz,sz,sz);
      parts.forEach((p,i)=>{rr(i===0?palette(spec)[2]:palette(spec)[1],ox+p.x*sz+2,oy+p.y*sz+2,sz-4,sz-4,6);if(i===0){circle('#16233d',ox+p.x*sz+10,oy+p.y*sz+12,3);circle('#16233d',ox+p.x*sz+21,oy+p.y*sz+12,3)}});circle('#ff88a9',ox+(food.x+.5)*sz,oy+(food.y+.5)*sz,12);circle('#fff1c3',ox+(food.x+.5)*sz-3,oy+(food.y+.5)*sz-4,4);text('25 PARÇAYA ULAŞ = KAZAN',W/2,29,17,'#c7d5ff','center')}
    };return g;
  }

  function space(spec={}){
    let wave=1,travel=0,shotWait=0,enemyShot=0,elapsed=0;const p={x:W/2,y:467,w:44,h:38,inv:0};let bullets=[],enemyBullets=[],enemies=[];
    function spawn(){enemies=[];for(let y=0;y<3+Math.min(2,wave-1);y++)for(let x=0;x<8;x++)enemies.push({x:118+x*88,y:74+y*55,w:38,h:28,alive:true,phase:x+y});travel=0}
    spawn();
    const g={score:0,lives:3,extraLabel:'DALGA / CAN',get extraValue(){return wave+' / '+'♥'.repeat(this.lives)},action(){if(shotWait>0)return;shotWait=.17;bullets.push({x:p.x+21,y:p.y-5,vy:-650});sound(610,.06,'square',.02)},
      update(dt){elapsed+=dt;shotWait=Math.max(0,shotWait-dt);p.inv=Math.max(0,p.inv-dt);const d=moving();p.x=clamp(p.x+(d==='left'?-1:d==='right'?1:0)*470*dt,20,W-62);if(held.has('action'))this.action();travel+=dt*(.7+wave*.12)*difficulty(spec);let count=0;
        for(const e of enemies){if(!e.alive)continue;count++;e.x+=Math.sin(travel)*.48;e.y+=.22*dt*(wave+1);if(e.y>410){finish(false);return}}
        for(let i=bullets.length-1;i>=0;i--){const b=bullets[i];b.y+=b.vy*dt;if(b.y<0){bullets.splice(i,1);continue}const e=enemies.find(e=>e.alive&&b.x>e.x&&b.x<e.x+e.w&&b.y>e.y&&b.y<e.y+e.h);if(e){e.alive=false;count--;bullets.splice(i,1);g.score+=30;sound(840,.05,'triangle',.025)}}
        enemyShot+=dt;if(enemyShot>1.1/difficulty(spec)){enemyShot=0;const alive=enemies.filter(e=>e.alive);if(alive.length){const e=alive[Math.floor(rand(0,alive.length))];enemyBullets.push({x:e.x+18,y:e.y+28,vy:220+wave*40})}}
        for(let i=enemyBullets.length-1;i>=0;i--){const b=enemyBullets[i];b.y+=b.vy*dt;if(b.y>H){enemyBullets.splice(i,1);continue}if(p.inv===0&&b.x>p.x&&b.x<p.x+p.w&&b.y>p.y&&b.y<p.y+p.h){enemyBullets.splice(i,1);p.inv=1.3;g.lives--;sound(160,.17);if(g.lives<=0){finish(false);return}}}
        if(count===0){if(wave===3){g.score+=750;finish(true)}else{wave++;g.score+=200;enemyBullets=[];spawn();sound(970,.25)}}
      },draw(){backdrop(spec,80);fill('#1a2350',0,H-65,W,65);for(let i=0;i<14;i++)fill('#4a5b89',i*74+25,H-58,4,52);
        enemies.forEach(e=>{if(!e.alive)return;rr('#9a86e7',e.x,e.y,e.w,e.h,7);fill('#e7dcff',e.x+6,e.y+9,8,8);fill('#e7dcff',e.x+24,e.y+9,8,8);fill('#2b2750',e.x+11,e.y+13,4,4);fill('#2b2750',e.x+28,e.y+13,4,4);fill('#6b53bc',e.x+7,e.y+24,6,8);fill('#6b53bc',e.x+26,e.y+24,6,8)});
        bullets.forEach(b=>rr('#caff5a',b.x-4,b.y-18,8,23,2));enemyBullets.forEach(b=>rr('#ff79b4',b.x-4,b.y,8,19,3));ctx.globalAlpha=p.inv>0&&Math.floor(elapsed*11)%2?.3:1;ctx.fillStyle=palette(spec)[1];ctx.beginPath();ctx.moveTo(p.x+22,p.y);ctx.lineTo(p.x+43,p.y+37);ctx.lineTo(p.x+2,p.y+37);ctx.fill();fill('#ffdb8a',p.x+17,p.y+26,10,16);ctx.globalAlpha=1;
        text('DALGA '+wave+'/3',W/2,35,21,'#e6edff','center')}
    };return g;
  }

  function blocks(spec={}){
    const BW=10,BH=18,S=27,X=345,Y=20,colors=['#76d9f1','#f6d575','#b99bff','#a8ee8c','#f597b6','#94a7ff','#ffad79'];
    const shapes=[[[0,1],[1,1],[2,1],[3,1]],[[0,0],[0,1],[1,1],[2,1]],[[2,0],[0,1],[1,1],[2,1]],[[1,0],[2,0],[1,1],[2,1]],[[1,0],[2,0],[0,1],[1,1]],[[1,0],[0,1],[1,1],[2,1]],[[0,0],[1,0],[1,1],[2,1]]];
    const grid=Array.from({length:BH},()=>Array(BW).fill(-1));let piece=null,fallTime=0,moveTime=0,lines=0;
    const makePiece=()=>{const index=Math.floor(rand(0,shapes.length));return{x:3,y:-1,pts:shapes[index].map(a=>a.slice()),color:index}};
    function valid(shape,ox,oy){return shape.every(([x,y])=>{const a=ox+x,b=oy+y;return a>=0&&a<BW&&b<BH&&(b<0||grid[b][a]===-1)})}
    function spawn(){piece=makePiece();if(!valid(piece.pts,piece.x,piece.y))finish(false)}
    function lock(g){piece.pts.forEach(([x,y])=>{const yy=piece.y+y,xx=piece.x+x;if(yy>=0&&yy<BH)grid[yy][xx]=piece.color});let cleared=0;for(let row=BH-1;row>=0;row--){if(grid[row].every(x=>x>=0)){grid.splice(row,1);grid.unshift(Array(BW).fill(-1));cleared++;row++}}if(cleared){lines+=cleared;g.score+=cleared*cleared*100;sound(950,.16)}spawn()}
    piece=makePiece();
    const g={score:0,extraLabel:'SATIR',get extraValue(){return String(lines)},action(){const rotated=piece.pts.map(([x,y])=>[3-y,x]);for(const dx of [0,-1,1,-2,2]){if(valid(rotated,piece.x+dx,piece.y)){piece.pts=rotated;piece.x+=dx;sound(500,.05);return}}},
      update(dt){if(!piece)return;moveTime+=dt;if(moveTime>.09){const d=moving();if(d&&valid(piece.pts,piece.x+(d==='left'?-1:1),piece.y))piece.x+=d==='left'?-1:1;moveTime=0}if(held.has('up')){this.action();held.delete('up')}
        fallTime+=dt;const threshold=(held.has('down')?.045:.55)/difficulty(spec);if(fallTime<threshold)return;fallTime=0;if(valid(piece.pts,piece.x,piece.y+1))piece.y++;else lock(this)},
      draw(){backdrop(spec,45);rr('#171d35',X-16,Y-12,BW*S+32,BH*S+25,12);for(let y=0;y<BH;y++)for(let x=0;x<BW;x++){fill('#252d48',X+x*S+1,Y+y*S+1,S-2,S-2);const c=grid[y][x];if(c>=0)rr(colors[c],X+x*S+2,Y+y*S+2,S-4,S-4,4)}if(piece)piece.pts.forEach(([x,y])=>{if(piece.y+y>=0)rr(colors[piece.color],X+(piece.x+x)*S+2,Y+(piece.y+y)*S+2,S-4,S-4,4)});
        text('BLOK YAĞMURU',40,99,28,'#d7d5ff');text('◀ ▶  HAREKET',40,155,17,'#9b9fb9');text('A / ▲  ÇEVİR',40,191,17,'#9b9fb9');text('▼  HIZLI İNDİR',40,227,17,'#9b9fb9');text('SATIR: '+lines,680,126,28,'#caff5a')}
    };return g;
  }

  function bricks(spec={}){
    const paddle={x:W/2-70,y:485,w:140,h:15};const ball={x:W/2,y:467,vx:230,vy:-285,r:10};let launched=false,blocksLeft=0,elapsed=0;const bricks=[];const rows=spec?.difficulty==='hard'?7:5;
    for(let y=0;y<rows;y++)for(let x=0;x<12;x++){bricks.push({x:75+x*68,y:68+y*39,w:61,h:30,color:['#ff9bc7','#f5c86f','#a0e0ef','#a7efad','#ad9ff3'][y%5],alive:true});blocksLeft++}
    const g={score:0,lives:3,extraLabel:'CAN / TUĞLA',get extraValue(){return this.lives+' / '+blocksLeft},action(){if(!launched){launched=true;sound(580,.08)}},
      update(dt){elapsed+=dt;const d=moving();paddle.x=clamp(paddle.x+(d==='left'?-1:d==='right'?1:0)*565*dt,15,W-paddle.w-15);if(!launched){ball.x=paddle.x+paddle.w/2;ball.y=paddle.y-14;return}
        const prevY=ball.y;ball.x+=ball.vx*dt* difficulty(spec);ball.y+=ball.vy*dt*difficulty(spec);
        if(ball.x<ball.r||ball.x>W-ball.r){ball.vx*=-1;ball.x=clamp(ball.x,ball.r,W-ball.r)}if(ball.y<ball.r){ball.vy=Math.abs(ball.vy);ball.y=ball.r}
        if(ball.vy>0&&prevY+ball.r<=paddle.y+7&&ball.y+ball.r>=paddle.y&&ball.x>paddle.x&&ball.x<paddle.x+paddle.w){ball.vy=-Math.abs(ball.vy);ball.vx=clamp((ball.x-(paddle.x+paddle.w/2))*5,-370,370);sound(430,.06)}
        for(const b of bricks){if(!b.alive)continue;if(ball.x+ball.r>b.x&&ball.x-ball.r<b.x+b.w&&ball.y+ball.r>b.y&&ball.y-ball.r<b.y+b.h){b.alive=false;blocksLeft--;g.score+=40;ball.vy*=-1;sound(820,.04);break}}
        if(ball.y>H+20){g.lives--;launched=false;ball.vx=rand(-290,290);ball.vy=-300;sound(140,.13);if(g.lives<=0)finish(false)}if(blocksLeft===0){g.score+=600;finish(true)}
      },draw(){backdrop(spec,35);rr('#1b2843',34,38,W-68,H-32,10);for(const b of bricks)if(b.alive){rr('#242b40',b.x+3,b.y+4,b.w,b.h,5);rr(b.color,b.x,b.y,b.w,b.h,5);fill('#ffffff50',b.x+5,b.y+5,b.w-10,3)}rr('#caff5a',paddle.x,paddle.y,paddle.w,paddle.h,7);circle('#fff8dc',ball.x,ball.y,ball.r);circle('#9db8fc',ball.x-3,ball.y-3,3);if(!launched)text('A İLE TOPU BAŞLAT',W/2,440,22,'#e6dfff','center')}
    };return g;
  }

  function pong(spec={}){
    const p={x:54,y:210,w:19,h:113},cpu={x:885,y:210,w:19,h:113},ball={x:W/2,y:H/2,vx:340,vy:110,r:11};let playerPoints=0,cpuPoints=0,launched=false,elapsed=0;
    function serve(toward=1){launched=false;ball.x=W/2;ball.y=H/2;ball.vx=320*toward;ball.vy=rand(-175,175)}
    const g={score:0,extraLabel:'SAYI',get extraValue(){return playerPoints+' — '+cpuPoints},action(){if(!launched){launched=true;sound(550,.08)}},
      update(dt){elapsed+=dt;const u=(held.has('up')?-1:0)+(held.has('down')?1:0);p.y=clamp(p.y+u*475*dt,15,H-p.h-15);cpu.y=clamp(cpu.y+clamp(ball.y-(cpu.y+cpu.h/2),-1,1)*(launched?290:180)*difficulty(spec)*dt,15,H-cpu.h-15);if(!launched)return;
        ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;if(ball.y<ball.r||ball.y>H-ball.r){ball.vy*=-1;ball.y=clamp(ball.y,ball.r,H-ball.r);sound(310,.05)}
        for(const [pad,dir] of [[p,1],[cpu,-1]]){if(ball.x+ball.r>pad.x&&ball.x-ball.r<pad.x+pad.w&&ball.y+ball.r>pad.y&&ball.y-ball.r<pad.y+pad.h&&ball.vx*dir<0){ball.vx=dir*Math.min(720,Math.abs(ball.vx)+28);ball.vy=clamp((ball.y-(pad.y+pad.h/2))*6,-430,430);sound(450,.07)}}
        if(ball.x<0){cpuPoints++;sound(140,.2);if(cpuPoints>=7)finish(false);else serve(1)}if(ball.x>W){playerPoints++;g.score+=100;sound(790,.15);if(playerPoints>=7){g.score+=700;finish(true)}else serve(-1)}
      },draw(){fill('#111627',0,0,W,H);for(let y=8;y<H;y+=36)fill('#343b60',W/2-3,y,6,20);rr('#caff5a',p.x,p.y,p.w,p.h,7);rr('#fc93c4',cpu.x,cpu.y,cpu.w,cpu.h,7);circle('#f4f0e7',ball.x,ball.y,ball.r);text(String(playerPoints),350,95,58,'#caff5a','center');text(String(cpuPoints),610,95,58,'#ff9acb','center');text('İLK 7 SAYI KAZANIR',W/2,H-22,17,'#a4b0ce','center');if(!launched)text('A İLE SERVİS',W/2,H/2-30,23,'#f5eefe','center')}
    };return g;
  }

  function flap(spec={}){
    const p={x:235,y:245,vy:0,r:20};const pipes=[];let elapsed=0,spawn=0,passed=0;const gap=(spec.difficulty==='hard'?155:spec.difficulty==='easy'?230:190);
    const g={score:0,extraLabel:'KAPI',get extraValue(){return passed+' / 20'},action(){p.vy=-385;sound(490,.08,'triangle')},jump(){this.action()},update(dt){elapsed+=dt;p.vy+=1040*dt;p.y+=p.vy*dt;spawn+=dt;
      if(spawn>1.55/difficulty(spec)){spawn=0;pipes.push({x:W+90,top:rand(85,H-gap-90),w:80,passed:false})}
      for(let i=pipes.length-1;i>=0;i--){const z=pipes[i];z.x-=225*dt*difficulty(spec);if(!z.passed&&z.x+z.w<p.x){z.passed=true;passed++;g.score+=80;sound(820,.06);if(passed>=20){g.score+=500;finish(true);return}}if(z.x+z.w<-10)pipes.splice(i,1);if(p.x+p.r>z.x&&p.x-p.r<z.x+z.w&&(p.y-p.r<z.top||p.y+p.r>z.top+gap)){finish(false);return}}
      if(p.y-p.r<0||p.y+p.r>H-35)finish(false)
    },draw(){const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,palette(spec)[0]);sky.addColorStop(1,'#5c759a');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);for(let i=0;i<8;i++){const x=((i*180-elapsed*25)%1200+1200)%1200-100;rr('#afc5df55',x,100+i%3*95,155,45,26)}
      pipes.forEach(z=>{rr('#355b63',z.x+4,0,z.w,z.top,7);rr(palette(spec)[1],z.x,0,z.w,z.top,7);rr('#355b63',z.x+4,z.top+gap,z.w,H,7);rr(palette(spec)[1],z.x,z.top+gap,z.w,H,7);fill('#ffffff55',z.x+9,0,5,z.top);fill('#ffffff55',z.x+9,z.top+gap,5,H)});
      fill('#c7e8d5',0,H-35,W,35);circle('#ffdf79',p.x,p.y,p.r);circle('#fff',p.x+8,p.y-7,7);circle('#23344c',p.x+10,p.y-7,3);rr('#ffac89',p.x+11,p.y+2,20,8,3);text('A / ▲  ZIPLA',22,36,20,'#faf8d7')}
    };return g;
  }

  function racer(spec={}){
    const cars=[];const p={x:460,y:406,w:50,h:84,inv:0};let distance=0,spawn=0,time=0,boost=0,boostCooldown=0;
    const g={score:0,lives:3,extraLabel:'MESAFE / CAN',get extraValue(){return Math.min(2500,Math.floor(distance))+'m / '+'♥'.repeat(this.lives)},action(){if(boostCooldown===0){boost=1.2;boostCooldown=4;sound(760,.2,'sawtooth')}},
      update(dt){time+=dt;p.inv=Math.max(0,p.inv-dt);boost=Math.max(0,boost-dt);boostCooldown=Math.max(0,boostCooldown-dt);const d=moving();p.x=clamp(p.x+(d==='left'?-1:d==='right'?1:0)*395*dt,305,655);const speed=(held.has('down')?150:held.has('up')?340:260)*(boost>0?1.65:1)*difficulty(spec);distance+=speed*dt*.11;g.score=Math.floor(distance)*2;if(distance>=2500){g.score+=750;finish(true);return}
        spawn+=dt;if(spawn>.85/difficulty(spec)){spawn=0;const lanes=[325,420,515,610];const lane=lanes[Math.floor(rand(0,lanes.length))];cars.push({x:lane,y:-110,w:52,h:80,v:rand(95,165),color:['#fb7baf','#9eacff','#ffe084'][Math.floor(rand(0,3))]})}
        for(let i=cars.length-1;i>=0;i--){const c=cars[i];c.y+=(speed*.8+c.v)*dt;if(c.y>H+110){cars.splice(i,1);continue}if(p.inv===0&&hit(p,c)){g.lives--;p.inv=1.6;cars.splice(i,1);sound(145,.22);if(g.lives<=0){finish(false);return}}}
      },draw(){fill('#34515b',0,0,W,H);fill('#29313c',285,0,390,H);fill('#faf3df',283,0,6,H);fill('#faf3df',674,0,6,H);for(let y=-80;y<H+80;y+=95){const shift=(time*200)%95;for(let x of [381,477,573])fill('#d6d0b2',x,y+shift,5,51)}for(let i=0;i<10;i++){const y=((i*90+time*125)%700)-90;rr('#32634e',165+(i%2)*590,y,60,90,23)}
        cars.forEach(c=>{rr('#111a28',c.x+4,c.y+5,c.w,c.h,8);rr(c.color,c.x,c.y,c.w,c.h,8);rr('#1c304c',c.x+9,c.y+15,c.w-18,21,5);fill('#fff3b0',c.x+6,c.y+c.h-9,12,6);fill('#fff3b0',c.x+c.w-18,c.y+c.h-9,12,6)});
        ctx.globalAlpha=p.inv>0&&Math.floor(time*12)%2?.45:1;rr('#0d1424',p.x+3,p.y+7,p.w,p.h,9);rr(boost>0?'#eaff97':'#95e7db',p.x,p.y,p.w,p.h,9);rr('#203953',p.x+8,p.y+16,p.w-16,23,5);fill('#fdf4b4',p.x+5,p.y+6,12,8);fill('#fdf4b4',p.x+p.w-17,p.y+6,12,8);ctx.globalAlpha=1;
        rr('#151927',23,24,205,36,8);fill('#caff5a',28,29,195*Math.min(distance/2500,1),26);text(Math.floor(distance)+' / 2500m',34,49,16,'#e5ecff');text('A = TURBO',W-25,34,17,'#f4e7c5','right')}
    };return g;
  }

  function dodge(spec={}){
    const p={x:W/2,y:H-94,r:20,inv:0};const hazards=[],stars=[];let time=0,spawn=0,starSpawn=0,collected=0;const duration=spec.duration||45,mult=difficulty(spec);const [bg,accent,shine]=palette(spec);
    const g={score:0,lives:3,extraLabel:'SÜRE / CAN',get extraValue(){return Math.max(0,Math.ceil(duration-time))+'s / '+'♥'.repeat(this.lives)},action(){if(p.inv>0)return;p.inv=.28;sound(640,.07)},
      update(dt){time+=dt;p.inv=Math.max(0,p.inv-dt);const ux=(held.has('right')?1:0)-(held.has('left')?1:0),uy=(held.has('down')?1:0)-(held.has('up')?1:0),l=Math.hypot(ux,uy)||1;p.x=clamp(p.x+ux/l*340*dt,35,W-35);p.y=clamp(p.y+uy/l*340*dt,55,H-42);
        spawn+=dt;starSpawn+=dt;if(spawn>.52/mult){spawn=0;hazards.push({x:rand(30,W-30),y:-30,r:rand(18,30),vy:rand(220,320)*mult,angle:rand(0,6)})}if(starSpawn>1.4){starSpawn=0;stars.push({x:rand(45,W-45),y:rand(75,H-90),r:13,age:0})}
        for(let i=hazards.length-1;i>=0;i--){const a=hazards[i];a.y+=a.vy*dt;a.angle+=dt;if(a.y>H+40){hazards.splice(i,1);continue}if(p.inv===0&&Math.hypot(p.x-a.x,p.y-a.y)<p.r+a.r*.8){hazards.splice(i,1);p.inv=1.6;g.lives--;sound(150,.22);if(g.lives<=0){finish(false);return}}}
        for(let i=stars.length-1;i>=0;i--){const a=stars[i];a.age+=dt;if(a.age>7){stars.splice(i,1);continue}if(Math.hypot(p.x-a.x,p.y-a.y)<p.r+a.r){stars.splice(i,1);collected++;g.score+=100;sound(830,.06)}}
        if(time>=duration){g.score+=600;finish(true)}
      },draw(){fill(bg,0,0,W,H);for(let i=0;i<46;i++){const x=(i*177+41)%W,y=(i*91+time*(8+i%3*7))%H;circle(accent,x,y,1+i%3)}for(let y=50;y<H;y+=55)fill('#ffffff10',25,y,W-50,1);
        stars.forEach(a=>{circle('#ffe59a',a.x,a.y,a.r);text('★',a.x,a.y+6,20,'#b7773a','center')});hazards.forEach(a=>{ctx.save();ctx.translate(a.x,a.y);ctx.rotate(a.angle);rr('#a65075',-a.r,-a.r,a.r*2,a.r*2,5);rr('#f390a5',-a.r+5,-a.r+5,a.r*2-10,a.r*2-10,4);fill('#ffd0dc',-4,-4,8,8);ctx.restore()});
        ctx.globalAlpha=p.inv>0&&Math.floor(time*10)%2?.45:1;circle(shine,p.x,p.y,p.r+4);circle(accent,p.x,p.y,p.r);circle(bg,p.x+7,p.y-6,4);ctx.globalAlpha=1;
        text('YILDIZ: '+collected,25,38,20,shine);text('HEDEF: '+duration+'s',W-25,38,20,shine,'right')}
    };return g;
  }

  function bubbles(spec={}){
    const cursor={x:W/2,y:H/2};let time=0,popped=0,cooldown=0;const target=spec?.difficulty==='hard'?60:spec?.difficulty==='easy'?30:40;const balloons=[];
    const colors=['#ff98c8','#80dcf3','#c5a2ff','#caff83','#ffdd82'];
    function makeBalloon(){return{x:rand(55,W-55),y:rand(65,H-75),vx:rand(-55,55),vy:rand(-45,45),r:rand(20,35),color:colors[Math.floor(rand(0,colors.length))]}}
    for(let i=0;i<18;i++)balloons.push(makeBalloon());
    const g={score:0,extraLabel:'BALON / SÜRE',get extraValue(){return popped+'/'+target+' · '+Math.ceil(60-time)+'s'},
      tap(x,y){let chosen=-1,nearest=999;for(let i=0;i<balloons.length;i++){const b=balloons[i],d=Math.hypot(x-b.x,y-b.y);if(d<b.r+5&&d<nearest){nearest=d;chosen=i}}
        if(chosen>=0){balloons[chosen]=makeBalloon();popped++;this.score+=100;sound(550+Math.floor(rand(0,4))*150,.065,'sine');if(popped>=target){this.score+=500;finish(true)}}},
      action(){this.tap(cursor.x,cursor.y)},
      update(dt){time+=dt;cooldown=Math.max(0,cooldown-dt);const dx=(held.has('right')?1:0)-(held.has('left')?1:0),dy=(held.has('down')?1:0)-(held.has('up')?1:0);cursor.x=clamp(cursor.x+dx*400*dt,25,W-25);cursor.y=clamp(cursor.y+dy*400*dt,25,H-25);
        for(const b of balloons){b.x+=b.vx*dt*difficulty(spec);b.y+=b.vy*dt*difficulty(spec);if(b.x<b.r||b.x>W-b.r)b.vx*=-1;if(b.y<b.r||b.y>H-b.r)b.vy*=-1}if(time>=60)finish(false)
      },draw(){fill('#222542',0,0,W,H);for(let i=0;i<50;i++)circle('#616896',(i*71+23)%W,(i*101+37)%H,1+i%3);for(const b of balloons){circle('#181a2d',b.x+3,b.y+5,b.r+1);circle(b.color,b.x,b.y,b.r);circle('#ffffff99',b.x-b.r*.30,b.y-b.r*.35,b.r*.25);fill('#b4a5b7',b.x-1,b.y+b.r,2,18)}ctx.strokeStyle='#e5ffe7';ctx.lineWidth=3;ctx.beginPath();ctx.arc(cursor.x,cursor.y,21,0,Math.PI*2);ctx.moveTo(cursor.x-29,cursor.y);ctx.lineTo(cursor.x-15,cursor.y);ctx.moveTo(cursor.x+15,cursor.y);ctx.lineTo(cursor.x+29,cursor.y);ctx.stroke();text('DOKUN VEYA A İLE PATLAT',W/2,39,20,'#e9e0ff','center')}
    };return g;
  }

  function mines(spec={}){
    const cols=12,rows=8,sz=54,ox=(W-cols*sz)/2,oy=(H-rows*sz)/2;
    const count=spec?.difficulty==='hard'?24:spec?.difficulty==='easy'?12:18;
    const tiles=Array.from({length:rows},()=>Array.from({length:cols},()=>({mine:false,near:0,revealed:false,flag:false})));
    let started=false,flags=0,revealed=0,lost=false,elapsed=0,flagMode=false,moveTime=0;
    const selected={x:0,y:0};
    function eachNeighbor(x,y,fn){for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const xx=x+dx,yy=y+dy;if(xx>=0&&xx<cols&&yy>=0&&yy<rows)fn(xx,yy)}}
    function plant(sx,sy){const cells=[];for(let y=0;y<rows;y++)for(let x=0;x<cols;x++)if(Math.abs(x-sx)>1||Math.abs(y-sy)>1)cells.push([x,y]);
      for(let i=cells.length-1;i>0;i--){const j=Math.floor(rand(0,i+1));[cells[i],cells[j]]=[cells[j],cells[i]]}
      for(const [x,y] of cells.slice(0,count))tiles[y][x].mine=true;
      for(let y=0;y<rows;y++)for(let x=0;x<cols;x++)if(!tiles[y][x].mine)eachNeighbor(x,y,(a,b)=>{if(tiles[b][a].mine)tiles[y][x].near++});started=true;
    }
    function reveal(x,y,g){const tile=tiles[y][x];if(tile.flag||tile.revealed)return;if(!started)plant(x,y);
      if(tile.mine){lost=true;for(const row of tiles)for(const t of row)if(t.mine)t.revealed=true;sound(150,.3);finish(false);return}
      const queue=[[x,y]],seen=new Set();for(let i=0;i<queue.length;i++){const [cx,cy]=queue[i],k=cx+','+cy;if(seen.has(k))continue;seen.add(k);const t=tiles[cy][cx];if(t.revealed||t.flag||t.mine)continue;t.revealed=true;revealed++;g.score+=10;if(t.near===0)eachNeighbor(cx,cy,(nx,ny)=>queue.push([nx,ny]))}
      sound(640,.04,'sine',.016);if(revealed===cols*rows-count){g.score+=1000;finish(true)}
    }
    function setFlag(x,y){const t=tiles[y][x];if(t.revealed)return;t.flag=!t.flag;flags+=t.flag?1:-1;sound(t.flag?580:400,.055)}
    const g={score:0,extraLabel:'AÇIK / BAYRAK',get extraValue(){return revealed+'/'+(cols*rows-count)+' · ⚑'+flags},
      action(){reveal(selected.x,selected.y,this)},combo(){flagMode=!flagMode;sound(flagMode?770:430,.08)},
      tap(x,y){const cx=Math.floor((x-ox)/sz),cy=Math.floor((y-oy)/sz);if(cx<0||cy<0||cx>=cols||cy>=rows)return;selected.x=cx;selected.y=cy;if(flagMode)setFlag(cx,cy);else reveal(cx,cy,this)},
      update(dt){elapsed+=dt;moveTime+=dt;if(moveTime<.16)return;const dx=(held.has('right')?1:0)-(held.has('left')?1:0),dy=(held.has('down')?1:0)-(held.has('up')?1:0);if(dx||dy){selected.x=clamp(selected.x+dx,0,cols-1);selected.y=clamp(selected.y+dy,0,rows-1);moveTime=0}},
      draw(){fill('#18233d',0,0,W,H);for(let i=0;i<50;i++)circle('#3f5680',(i*133)%W,(i*91)%H,1+i%2);
        const numberColors=['','#6fddff','#8feaae','#ffb684','#ff7c9b','#d0adff','#f6e092','#e6f5fb','#ffffff'];
        for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const t=tiles[y][x],xx=ox+x*sz,yy=oy+y*sz;
          rr(t.revealed?'#2b3955':'#637bac',xx+2,yy+2,sz-4,sz-4,7);if(!t.revealed)fill('#ffffff20',xx+7,yy+7,sz-14,5);
          if(t.flag){text('⚑',xx+sz/2,yy+sz*.72,33,'#ffdb83','center')}else if(t.revealed&&t.mine){circle('#ff799e',xx+sz/2,yy+sz/2,17);circle('#26324d',xx+sz/2,yy+sz/2,7)}else if(t.revealed&&t.near){text(String(t.near),xx+sz/2,yy+sz*.73,30,numberColors[t.near],'center')}
          if(selected.x===x&&selected.y===y){ctx.strokeStyle='#caff5a';ctx.lineWidth=3;ctx.strokeRect(xx+3,yy+3,sz-6,sz-6)}}
        rr(flagMode?'#ffe1ac':'#caff5a',15,18,195,39,7);text(flagMode?'⚑ BAYRAK MODU':'◉ AÇMA MODU',25,45,19,'#23283a');text('İLK DOKUNUŞ GÜVENLİ',W-19,40,16,'#d7eaff','right')}
    };return g;
  }

  const factories={snake,space,blocks,bricks,pong,flap,racer,dodge,bubbles,mines};
  const create=(spec)=>({snake,space,blocks,bricks,pong,flap,racer,dodge,bubbles,mines}[spec.base]||dodge)(spec);
  return {factories,create};
};
