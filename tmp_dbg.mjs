const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const H={Accept:'*/*','Accept-Language':'ru-RU,ru;q=0.9',Referer:'https://www.wildberries.ru/','User-Agent':UA};
const su='https://search.wb.ru/exactmatch/ru/common/v13/search?appType=1&curr=rub&dest=-1257786&lang=ru&page=1&query='+encodeURIComponent('наушники')+'&resultset=catalog&sort=popular&spp=30&suppressSpellcheck=false';
const r=await fetch(su,{headers:H}); const t=await r.text();
console.log('search bytes',t.length);
// why JSON.parse fails:
try{JSON.parse(t);console.log('parse OK full');}catch(e){console.log('parse err:',e.message);}
const m=t.match(/preset=(\d+)/); console.log('regex preset:',m&&m[1]);
console.log('TAIL 120:',JSON.stringify(t.slice(-120)));
// try catalog preset endpoints
const preset=m&&m[1];
if(preset){
  const variants=[
    `https://catalog.wb.ru/catalog/preset/v2/catalog?appType=1&curr=rub&dest=-1257786&preset=${preset}&sort=popular&spp=30`,
    `https://catalog.wb.ru/catalog/preset/v4/catalog?appType=1&curr=rub&dest=-1257786&preset=${preset}&sort=popular&spp=30`,
    `https://catalog.wb.ru/sng/catalog/preset/v2/catalog?appType=1&curr=rub&dest=-1257786&preset=${preset}&sort=popular&spp=30`,
  ];
  for(const u of variants){
    try{const rr=await fetch(u,{headers:H});const tt=await rr.text();let p=0;try{const j=JSON.parse(tt);p=((j.data&&j.data.products)||j.products||[]).length;}catch{p='parse-fail';}
    console.log(`PRESET ${rr.status} products=${p} :: ${u.slice(0,60)}... head=${tt.slice(0,40).replace(/\n/g,' ')}`);}catch(e){console.log('preset ERR',String(e).slice(0,60));}
    await new Promise(r=>setTimeout(r,1200));
  }
}
