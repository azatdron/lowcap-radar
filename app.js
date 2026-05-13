
const $=id=>document.getElementById(id);
let currentTab="radar";
let lastResults=[];

const sectorTerms={
  auto:"Все направления", ai:"AI / Agents", rwa:"RWA", depin:"DePIN", gaming:"Gaming", infra:"Infrastructure", defi:"DeFi", l2:"L2", meme:"Meme"
};

function fmt(n){n=Number(n||0);if(!n)return "$0";if(n>=1e9)return "$"+(n/1e9).toFixed(1)+"B";if(n>=1e6)return "$"+(n/1e6).toFixed(1)+"M";if(n>=1e3)return "$"+(n/1e3).toFixed(0)+"K";return "$"+n.toFixed(0)}
function pf(n){n=Number(n||0);if(!n)return "$0";if(n<0.0001)return "$"+n.toExponential(2);if(n<0.01)return "$"+n.toFixed(6);if(n<1)return "$"+n.toFixed(4);return "$"+n.toFixed(2)}
function pct(n){n=Number(n||0);return (n>0?"+":"")+n.toFixed(1)+"%"}
function cls(n){return Number(n||0)>=0?"goodText":"badText"}
function showToast(t){toast.textContent=t;toast.classList.add("show");setTimeout(()=>toast.classList.remove("show"),1100)}
function scrollToTop(){window.scrollTo({top:0,behavior:"smooth"})}

function toggleTheme(){
  document.body.classList.toggle("light");
  localStorage.setItem("theme",document.body.classList.contains("light")?"light":"dark");
  themeBtn.textContent=document.body.classList.contains("light")?"☀️":"🌙";
}
function initTheme(){if(localStorage.getItem("theme")==="light"){document.body.classList.add("light");themeBtn.textContent="☀️"}}

function toggleChainMenu(){chainMenu.classList.toggle("open")}
function updateChainLabel(){
  const names=[...document.querySelectorAll(".mchain:checked")].map(x=>x.parentElement.textContent.trim());
  chainBox.textContent=names.length?(names.length<=2?names.join(", "):names.slice(0,2).join(", ")+" +"+(names.length-2)):"Любая";
}
document.addEventListener("click",e=>{if($("chainMenu")&&!e.target.closest(".chainDrop"))chainMenu.classList.remove("open")});

function selectedChains(){
  const arr=[...document.querySelectorAll(".mchain:checked")].map(x=>x.value);
  return arr.length?arr:["auto"];
}

function setPreset(mode,el){
  document.querySelectorAll(".preset").forEach(x=>x.classList.remove("active"));
  el.classList.add("active");
  risk.value=mode;
  if(mode==="conservative"){budget.value="any";note.textContent="Осторожный режим: меньше монет, но выше базовое качество."}
  if(mode==="balanced"){budget.value="any";note.textContent="Сбалансированный режим: поиск перспективных lowcap без лишней ручной настройки."}
  if(mode==="aggressive"){budget.value="1";note.textContent="Агрессивный режим: больше ранних и рискованных кандидатов."}
}

function resetSearch(){
  sector.value="auto";budget.value="any";risk.value="balanced";
  document.querySelectorAll(".mchain").forEach(x=>x.checked=false);updateChainLabel();
  document.querySelectorAll(".preset").forEach(x=>x.classList.remove("active"));
  document.querySelector(".preset[data-mode='balanced']").classList.add("active");
  note.textContent="Сброшено. Выбери сектор, сети и нажми поиск.";
  showToast("Сброшено");
}

function normalize(v){return String(v||"").toLowerCase().replace(/[^a-z0-9]/g,"")}
function dedupeKey(c){
  const chain=String(c._dexChain||"").toLowerCase();
  const addr=String(c.tokenAddress||c.baseAddress||"").toLowerCase();
  if(addr)return chain+":"+addr;
  return chain+":"+normalize(c.symbol)+":"+normalize(c.name);
}
function hardDedupe(arr){
  const map=new Map();
  for(const c of arr){
    const k=dedupeKey(c);
    const nk=String(c._dexChain||"")+":name:"+normalize(c.symbol)+":"+normalize(c.name);
    const old=map.get(k)||map.get(nk);
    const w=Number(c.liquidity||0)*3+Number(c.total_volume||0)+Number(c.market_cap||c.fdv||0)/200;
    const ow=old?Number(old.liquidity||0)*3+Number(old.total_volume||0)+Number(old.market_cap||old.fdv||0)/200:-1;
    if(!old||w>ow){map.set(k,c);map.set(nk,c)}
  }
  return [...new Map([...map.values()].map(x=>[dedupeKey(x),x])).values()];
}

function isMajor(c){
  const s=normalize(c.symbol),n=normalize(c.name);
  return ["btc","bitcoin","wbtc","eth","ethereum","weth","bnb","sol","solana","xrp","usdc","usdt","dai"].includes(s)||
    ["bitcoin","ethereum","wrappedbitcoin","wrappedether","solana","tether","usdcoin"].includes(n);
}
function narrative(c){
  const t=(c.name+" "+c.symbol+" "+(c.dex||"")+" "+(c.url||"")).toLowerCase();
  if(/ai|agent|gpu|compute|data|render|virtual/.test(t))return "AI";
  if(/rwa|real|treasury|yield|credit|ondo|asset/.test(t))return "RWA";
  if(/game|gaming|play|nft|esport|guild/.test(t))return "Gaming";
  if(/depin|node|storage|oracle|rpc|bridge|network|infra/.test(t))return "Infrastructure";
  if(/swap|dex|yield|lend|stake|vault|perp/.test(t))return "DeFi";
  if(/inu|dog|cat|pepe|meme|bonk|wif/.test(t))return "Meme";
  return sectorTerms[sector.value]||"General";
}
function riskList(c){
  const cap=Number(c.market_cap||c.fdv||0), vol=Number(c.total_volume||0), liq=Number(c.liquidity||0), age=Number(c.age_days||0), ch=Math.abs(Number(c.price_change_percentage_24h||0));
  const r=[];
  if(liq<5000)r.push("низкая ликвидность");
  if(vol<5000)r.push("слабый объём");
  if(cap&&cap<100000)r.push("микро-капитализация");
  if(age<1)r.push("очень новая");
  if(ch>80)r.push("сильная волатильность");
  if(c.flags&&c.flags.length)r.push(...c.flags);
  return [...new Set(r)];
}
function aiScore(c){
  let sc=30;
  const cap=Number(c.market_cap||c.fdv||0),vol=Number(c.total_volume||0),liq=Number(c.liquidity||0),age=Number(c.age_days||0),ch=Number(c.price_change_percentage_24h||0);
  const vr=cap?vol/cap:0;
  if(cap>=100000&&cap<1000000)sc+=10;
  if(cap>=1000000&&cap<=100000000)sc+=18;
  if(cap>500000000)sc-=10;
  if(cap>1000000000)sc-=15;
  if(vol>=10000)sc+=6;if(vol>=100000)sc+=8;if(vol>=1000000)sc+=8;
  if(liq>=10000)sc+=6;if(liq>=50000)sc+=8;if(liq>=250000)sc+=8;
  if(age>=1)sc+=3;if(age>=7)sc+=4;if(age>=30)sc+=5;if(age>1500)sc-=5;
  if(vr>=0.005&&vr<=0.5)sc+=9;
  if(ch>3&&ch<45)sc+=8;if(ch<0&&ch>-25)sc+=4;if(ch>80)sc-=12;
  if(isMajor(c))sc-=25;
  sc-=riskList(c).length*4;
  if(risk.value==="conservative")sc-=riskList(c).length*3;
  if(risk.value==="aggressive")sc+=5;
  return Math.max(1,Math.min(99,Math.round(sc)));
}
function socialSignal(c){
  if(c.website)return "сайт найден";
  if(c.url)return "DEX-профиль";
  return "нет данных";
}
function fundsSignal(c){
  const n=(c.name+" "+c.symbol).toLowerCase();
  if(/ondo|pyth|render|akash|aethir|jupiter|arbitrum|optimism|mantle|immutable|gala|ronin/.test(n))return "есть экосистемный интерес";
  return "не найдено";
}
function ecosystem(c){return (c._dexChain||"unknown")+" / "+(c.dex||"DEX")}
function trendText(c){
  const ch=Number(c.price_change_percentage_24h||0);
  if(ch>20)return "сильный рост 24ч";
  if(ch>3)return "положительный импульс";
  if(ch< -20)return "сильная просадка";
  if(ch<0)return "умеренная просадка";
  return "стабильно";
}

function passesUser(c){
  const price=Number(c.current_price||0);
  if(budget.value!=="any" && price>Number(budget.value))return false;
  if(risk.value!=="aggressive"){
    if((c.liquidity||0)<5000 || (c.total_volume||0)<3000)return false;
  }
  if(risk.value==="conservative"){
    if((c.liquidity||0)<25000 || (c.total_volume||0)<25000)return false;
  }
  return true;
}

async function scan(){
  found.textContent="—";avg.textContent="—";results.innerHTML='<div class="empty">Ищу перспективные монеты...</div>';
  try{
    let all=[];
    for(const ch of selectedChains()){
      const r=await fetch(`/api/dex?chain=${encodeURIComponent(ch)}&sector=${encodeURIComponent(sector.value)}&depth=max&quality=${risk.value==="aggressive"?"soft":risk.value==="conservative"?"strict":"balanced"}`,{cache:"no-store"});
      if(!r.ok)throw new Error(await r.text());
      all.push(...await r.json());
    }
    all=hardDedupe(all).filter(passesUser);
    all.forEach(c=>{c._score=aiScore(c);c._narrative=narrative(c);});
    all=all.sort((a,b)=>b._score-a._score).slice(0,25);
    lastResults=all;
    found.textContent=all.length;
    avg.textContent=all.length?Math.round(all.reduce((s,x)=>s+x._score,0)/all.length):0;
    renderResults(all);
    if(!all.length)results.innerHTML='<div class="empty">Ничего не найдено. Попробуй другой сектор, больше сетей или агрессивный режим.</div>';
  }catch(e){
    results.innerHTML=`<div class="empty">Ошибка поиска: ${String(e.message||e)}</div>`;
  }
}
function renderResults(list){
  results.innerHTML="";
  list.forEach(c=>results.appendChild(coinCard(c,false)));
}
function coinCard(c,watchMode){
  const div=document.createElement("div");div.className="coin";
  const cap=c.market_cap||c.fdv||0, risks=riskList(c), score=c._score||aiScore(c), ch=c.price_change_percentage_24h||0;
  const img=c.image?`<img class="avatar" src="${c.image}" onerror="this.style.display='none'">`:`<div class="avatar fallback">${(c.symbol||"?").slice(0,3).toUpperCase()}</div>`;
  div.innerHTML=`
    <div class="coinTop">
      ${img}
      <div style="min-width:0;flex:1">
        <div class="coinName">${c.name||"Unknown"}</div>
        <div class="coinSub">${(c.symbol||"").toUpperCase()} · ${c._source||"DexScreener"}</div>
      </div>
      <div class="score ${score<45?"bad":score<70?"mid":""}">${score}</div>
    </div>
    <div class="badges">
      <span class="badge ${risks.length?"warn":"good"}">Риски: ${risks.length}</span>
      <span class="badge">Сеть: ${c._dexChain||"?"}</span>
      <span class="badge">${c._narrative||narrative(c)}</span>
      <span class="badge">Возраст: ${c.age_days||0}д</span>
    </div>
    <div class="analysisGrid">
      <div class="metric"><div class="label">Капитализация</div><div class="value">${fmt(cap)}</div></div>
      <div class="metric"><div class="label">Рост объёма</div><div class="value">${fmt(c.total_volume)}</div></div>
      <div class="metric"><div class="label">Рост цены 24ч</div><div class="value ${ch>=0?"goodText":"badText"}">${pct(ch)}</div></div>
      <div class="metric"><div class="label">Ликвидность</div><div class="value">${fmt(c.liquidity)}</div></div>
      <div class="metric"><div class="label">Возраст проекта</div><div class="value">${c.age_days||0}д</div></div>
      <div class="metric"><div class="label">Соцсети</div><div class="value">${socialSignal(c)}</div></div>
      <div class="metric"><div class="label">Комьюнити</div><div class="value">${trendText(c)}</div></div>
      <div class="metric"><div class="label">Фонды</div><div class="value">${fundsSignal(c)}</div></div>
      <div class="metric"><div class="label">Экосистема</div><div class="value">${ecosystem(c)}</div></div>
      <div class="metric"><div class="label">Нарратив / сектор</div><div class="value">${c._narrative||narrative(c)}</div></div>
    </div>
    <div class="explain"><b>Почему AI выбрал:</b> капитализация ${fmt(cap)}, ликвидность ${fmt(c.liquidity)}, объём 24ч ${fmt(c.total_volume)}, движение ${pct(ch)}. ${risks.length?("Риски: "+risks.join(", ")):"Критичных рисков по базовой проверке нет."}</div>
    <div class="links">
      ${c.url?`<a class="linkBtn" target="_blank" href="${c.url}">DexScreener</a>`:""}
      <a class="linkBtn" target="_blank" href="https://coinmarketcap.com/search/?q=${encodeURIComponent(c.name||c.symbol||"")}">CoinMarketCap</a>
      <a class="linkBtn" target="_blank" href="https://www.coingecko.com/en/search?query=${encodeURIComponent(c.name||c.symbol||"")}">CoinGecko</a>
    </div>
    ${watchMode?`<button class="danger watchBtn" onclick="removeWatch('${c.id}')">Удалить</button>`:`<button class="secondary watchBtn">В избранное</button>`}
  `;
  if(!watchMode) div.querySelector(".watchBtn").onclick=()=>addWatch(c);
  return div;
}

function watchItems(){try{return JSON.parse(localStorage.getItem("watch_tokens")||"[]")}catch(e){return[]}}
function saveWatchItems(items){localStorage.setItem("watch_tokens",JSON.stringify(hardDedupe(items)));renderWatchlist()}
function addWatch(c){let items=watchItems();if(!items.find(x=>dedupeKey(x)===dedupeKey(c))){items.unshift(c);saveWatchItems(items);showToast("Добавлено в избранное")}else showToast("Уже в избранном")}
function removeWatch(id){saveWatchItems(watchItems().filter(x=>x.id!==id))}
function renderWatchlist(){
  watch.innerHTML="";
  const items=hardDedupe(watchItems());
  if(!items.length){watch.innerHTML='<div class="empty">Пока пусто.</div>';return}
  items.forEach(c=>watch.appendChild(coinCard(c,true)));
}
function showTab(t){
  currentTab=t;
  radarSec.classList.toggle("hidden",t!=="radar");
  watchSec.classList.toggle("hidden",t!=="watch");
  sourceSec.classList.toggle("hidden",t!=="source");
  tabRadar.classList.toggle("active",t==="radar");
  tabWatch.classList.toggle("active",t==="watch");
  tabSource.classList.toggle("active",t==="source");
  if(t==="watch")renderWatchlist();
}
async function checkBackend(){
  try{
    const r=await fetch("/api/health",{cache:"no-store"});
    const j=await r.json();
    backendStatus.innerHTML=`Backend online · ${j.version||""}`;
  }catch(e){backendStatus.innerHTML="Backend не отвечает";}
}
window.addEventListener("scroll",()=>{topBtn.classList.toggle("show",window.scrollY>700)});
window.addEventListener("load",()=>{initTheme();updateChainLabel();renderWatchlist();checkBackend();});
