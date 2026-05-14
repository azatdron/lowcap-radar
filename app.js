
function selectedTopRanks(){
  return [...document.querySelectorAll("[data-top],.topBtn")].filter(x=>x.classList.contains("activeTop")).map(x=>Number(x.dataset.top)).filter(Boolean);
}
function setupTopFilters(){
  document.querySelectorAll("[data-top],.topBtn").forEach(btn=>{
    if(btn.__topReady)return;
    btn.__topReady=true;
    btn.addEventListener("click",e=>{
      e.preventDefault();
      e.stopPropagation();
      btn.classList.toggle("activeTop");
    });
  });
}
function setRiskMode(mode){
  const labels={conservative:"Низкий",balanced:"Средний",aggressive:"Высокий"};
  if(window.risk) risk.value=mode;
  if(window.riskBox) riskBox.textContent=labels[mode]||"Средний";
  if(window.riskMenu) riskMenu.classList.remove("open");
}
function toggleRiskMenu(){
  if(!window.riskMenu)return;
  riskMenu.classList.toggle("open");
}


const $=id=>document.getElementById(id);
let lastResults=[];
const sectorTerms={auto:"General",ai:"AI",rwa:"RWA",depin:"DePIN",gaming:"Gaming",infra:"Infrastructure",defi:"DeFi",l2:"L2",meme:"Meme"};
function fmt(n){n=Number(n||0);if(!n)return "$0";if(n>=1e9)return "$"+(n/1e9).toFixed(1)+"B";if(n>=1e6)return "$"+(n/1e6).toFixed(1)+"M";if(n>=1e3)return "$"+(n/1e3).toFixed(0)+"K";return "$"+n.toFixed(0)}
function pct(n){n=Number(n||0);return (n>0?"+":"")+n.toFixed(1)+"%"}
function showToast(t){toast.textContent=t;toast.classList.add("show");setTimeout(()=>toast.classList.remove("show"),1100)}
function scrollToTop(){window.scrollTo({top:0,behavior:"smooth"})}
function toggleTheme(){document.body.classList.toggle("light");localStorage.setItem("theme",document.body.classList.contains("light")?"light":"dark");themeBtn.textContent=document.body.classList.contains("light")?"☀️":"🌙"}
function initTheme(){if(localStorage.getItem("theme")==="light"){document.body.classList.add("light");themeBtn.textContent="☀️"}}
function toggleChainMenu(){chainMenu.classList.toggle('open');chainBackdrop.classList.toggle('open',chainMenu.classList.contains('open'));document.body.classList.toggle('chainModalOpen',chainMenu.classList.contains('open'))}
function closeChainMenu(){chainMenu.classList.remove('open');chainBackdrop.classList.remove('open');document.body.classList.remove('chainModalOpen')}

function compactNarrativeLabel(names){
  if(!names||!names.length) return "AUTO / все";
  const cleaned=names.filter(x=>!x.toLowerCase().includes("auto"));
  if(!cleaned.length) return "AUTO / все";
  return cleaned.length===1 ? cleaned[0] : `${cleaned[0]} +${cleaned.length-1}`;
}
function selectedNarratives(){
  const arr=[...document.querySelectorAll(".mnarr:checked")].map(x=>x.value);
  return arr.length?arr:["auto"];
}
function updateNarrativeLabel(){
  const names=[...document.querySelectorAll(".mnarr:checked")].map(x=>x.parentElement.textContent.trim());
  if(window.narrativeBox)narrativeBox.textContent=compactNarrativeLabel(names);
  const first=selectedNarratives()[0]||"auto";
  if(window.sector)sector.value=first;
}
function toggleNarrativeMenu(){
  narrativeMenu.classList.toggle("open");
  narrativeBackdrop.classList.toggle("open",narrativeMenu.classList.contains("open"));
  document.body.classList.toggle("chainModalOpen",narrativeMenu.classList.contains("open"));
}
function closeNarrativeMenu(){
  narrativeMenu.classList.remove("open");
  narrativeBackdrop.classList.remove("open");
  document.body.classList.remove("chainModalOpen");
}
function compactChainLabel(names){if(!names||!names.length)return 'Любая';return names.length===1?names[0]:`${names[0]} +${names.length-1}`}
function updateChainLabel(){const names=[...document.querySelectorAll('.mchain:checked')].map(x=>x.parentElement.textContent.trim());chainBox.textContent=compactChainLabel(names)}

function selectedChains(){const arr=[...document.querySelectorAll(".mchain:checked")].map(x=>x.value);return arr.length?arr:["auto"]}
function setPreset(mode,el){document.querySelectorAll(".preset").forEach(x=>x.classList.remove("active"));el.classList.add("active");risk.value=mode;if(mode==="conservative"){budget.value="any";note.textContent="Низкий риск режим: меньше монет, но выше базовое качество."}if(mode==="balanced"){budget.value="any";note.textContent="Средний риск режим: поиск перспективных lowcap без лишней ручной настройки."}if(mode==="aggressive"){budget.value="1";note.textContent="Высокий риск режим: больше ранних и рискованных кандидатов."}}
function resetSearch(){
  sector.value="auto";
  budget.value="any";
  risk.value="balanced";
  document.querySelectorAll(".mchain").forEach(x=>x.checked=false);
  document.querySelectorAll("[data-top],.topBtn").forEach(x=>x.classList.remove("activeTop"));
  document.querySelectorAll(".mnarr").forEach(x=>x.checked=false);
  updateChainLabel();
  if(typeof updateNarrativeLabel==="function")updateNarrativeLabel();
  updateNarrativeLabel();
  document.querySelectorAll(".preset").forEach(x=>x.classList.remove("active"));
  const balanced=document.querySelector(".preset[data-mode='balanced']");
  if(balanced)balanced.classList.add("active");
  lastResults=[];
  if(window.found)found.textContent="0";
  if(window.avg)avg.textContent="—";
  if(window.results)results.innerHTML='<div class="empty">Выбери параметры и нажми «Начать поиск».</div>';
  setRiskMode("balanced");
  if(window.note)note.textContent="Фильтры сброшены. Результаты очищены.";
  showToast("Сброшено");
}
function normalize(v){return String(v||"").toLowerCase().replace(/[^a-z0-9]/g,"")}
function dedupeKey(c){const chain=String(c._dexChain||"").toLowerCase(),addr=String(c.tokenAddress||c.baseAddress||"").toLowerCase();if(addr)return chain+":"+addr;return chain+":"+normalize(c.symbol)+":"+normalize(c.name)}
function hardDedupe(arr){const map=new Map();for(const c of arr){const k=dedupeKey(c);const old=map.get(k);const w=Number(c.liquidity||0)*3+Number(c.total_volume||0)+Number(c.market_cap||c.fdv||0)/200;if(!old||w>(Number(old.liquidity||0)*3+Number(old.total_volume||0)+Number(old.market_cap||old.fdv||0)/200))map.set(k,c)}return [...map.values()]}
function narrative(c){return c._narrative||sectorTerms[sector.value]||"General"}
function riskList(c){return c.risks||[]}
function socialSignal(c){if(c.website)return "сайт найден";if(c.url)return "DEX-профиль";return "нет данных"}
function fundsSignal(c){return c.backing||"нет данных"}
function ecosystem(c){return (c._dexChain||"market")+" / "+(c.dex||c._source||"source")}
function trendText(c){const ch=Number(c.price_change_percentage_24h||0);if(ch>20)return"сильный рост 24ч";if(ch>3)return"положительный импульс";if(ch<-20)return"сильная просадка";if(ch<0)return"умеренная просадка";return"стабильно"}
function metricProof(c,type){const ds=c.url||"";const cg=`https://www.coingecko.com/en/search?query=${encodeURIComponent(c.name||c.symbol||"")}`;const cmc=`https://coinmarketcap.com/search/?q=${encodeURIComponent(c.name||c.symbol||"")}`;if(["liquidity","volume","chain","dex","age"].includes(type)&&ds)return`<a class="proofLink" target="_blank" href="${ds}">проверить Dex</a>`;if(["cap","price"].includes(type))return`<a class="proofLink" target="_blank" href="${cg}">проверить CG</a>`;return`<a class="proofLink" target="_blank" href="${cmc}">проверить CMC</a>`}
function liqText(c){return Number(c.liquidity||0)>0?fmt(c.liquidity):"нет данных"}
function metric(label,value,proof){return`<div class="metric"><div class="label">${label}</div><div class="value">${value}</div>${proof||""}</div>`}
function posKey(c){return"pos_"+dedupeKey(c)}
function getPosition(c){try{return JSON.parse(localStorage.getItem(posKey(c))||"{}")}catch(e){return{}}}
function savePosition(c,amount,entry){localStorage.setItem(posKey(c),JSON.stringify({amount:Number(amount||0),entry:Number(entry||0),ts:Date.now()}));showToast("Позиция сохранена");renderWatchlist()}
function lastById(id){return[...lastResults,...watchItems()].find(x=>String(x.id)===String(id))||{}}
function positionBlock(c){const p=getPosition(c),price=Number(c.current_price||0),amount=Number(p.amount||0),entry=Number(p.entry||0);const nowVal=amount&&entry&&price?amount*(price/entry):amount;const pnl=amount&&nowVal?((nowVal-amount)/amount*100):0;return`<div class="portfolioBox" onclick="event.stopPropagation()" ontouchstart="event.stopPropagation()"><b>Моя позиция</b><div class="mutedSmall">${amount?`Вложено: $${amount.toFixed(2)} · Сейчас: $${nowVal.toFixed(2)} · ${pnl>=0?"▲":"▼"} ${pnl.toFixed(1)}%`:"позиция не добавлена"}</div><div class="portfolioRow"><input id="amt_${c.id}" placeholder="Сумма $" value="${amount||""}"><input id="entry_${c.id}" placeholder="Цена входа" value="${entry||""}"></div><button class="secondary smallBtn" onclick="event.stopPropagation();savePosition(lastById('${c.id}'),document.getElementById('amt_${c.id}').value,document.getElementById('entry_${c.id}').value)">Сохранить позицию</button></div>`}
async function scan(){found.textContent="—";avg.textContent="—";results.innerHTML='<div class="empty">Сканирую CMC + CoinGecko + DexScreener...</div>';try{const chains=selectedChains().join(",");const r=await fetch(`/api/scan?chains=${encodeURIComponent(chains)}&sector=${encodeURIComponent(selectedNarratives().join(","))}&risk=${encodeURIComponent(risk.value)}&budget=${encodeURIComponent(budget.value)}`,{cache:"no-store"});if(!r.ok)throw new Error(await r.text());const data=await r.json();let all=hardDedupe(data.items||[]);
const riskMode=risk.value;
const riskCount=x=>(x.risks||[]).length;
if(riskMode==="aggressive") all.sort((a,b)=>riskCount(b)-riskCount(a)||(b._score||0)-(a._score||0));
else if(riskMode==="conservative") all.sort((a,b)=>riskCount(a)-riskCount(b)||(b._score||0)-(a._score||0));
else all.sort((a,b)=>(b._score||0)-(a._score||0));
const tops=selectedTopRanks();
if(tops.length){const maxTop=Math.max(...tops);all=all.filter(x=>!x.market_cap_rank||x.market_cap_rank<=maxTop)}
all=all.slice(0,25);lastResults=all;found.textContent=all.length;avg.textContent=all.length?Math.round(all.reduce((s,x)=>s+(x._score||0),0)/all.length):0;renderResults(all);note.textContent=`Обработано кандидатов: ${data.processed||all.length}. Источники: ${data.sources?.join(" + ")||"backend"}. Показан shortlist после AI-score и удаления дублей.`;if(!all.length)results.innerHTML='<div class="empty">Ничего не найдено. Попробуй другой сектор, больше сетей или агрессивный режим.</div>'}catch(e){results.innerHTML=`<div class="empty">Ошибка поиска: ${String(e.message||e)}</div>`}}
function renderResults(list){results.innerHTML="";list.forEach(c=>results.appendChild(coinCard(c,false)))}

function priceFmt(n){
  n=Number(n||0);
  if(!n)return "нет данных";
  if(n<0.0001)return "$"+n.toExponential(2);
  if(n<0.01)return "$"+n.toFixed(6);
  if(n<1)return "$"+n.toFixed(4);
  return "$"+n.toFixed(2);
}
function tradeLayer(c){
  const p=Number(c.current_price||0), ch=Number(c.price_change_percentage_24h||0), liq=Number(c.liquidity||0), vol=Number(c.total_volume||0), score=Number(c._score||0), risks=(c.risks||[]).length;
  if(!p)return {entry:"нет данных",safe:"нет данных",stop:"нет данных",tp1:"нет данных",tp2:"нет данных",rr:"нет данных",note:"Цена недоступна, торговую зону рассчитать нельзя."};
  const riskMul=risks>2?0.18:risks>0?0.14:0.10;
  const momentum=ch>20?"перегрет":ch>5?"сильный":ch>-5?"нейтральный":"просадка";
  const entryLow=p*(ch>15?0.88:ch>5?0.94:ch<0?0.97:0.95);
  const entryHigh=p*(ch>15?0.96:ch>5?1.01:ch<0?1.02:1.00);
  const safe=p*(1-riskMul);
  const stop=p*(1-riskMul*1.45);
  const tp1=p*(score>=75?1.28:score>=55?1.18:1.10);
  const tp2=p*(score>=75?1.65:score>=55?1.38:1.22);
  let rr=((tp1-p)/(p-stop));
  if(!isFinite(rr)||rr<0)rr=0;
  let note=`Momentum: ${momentum}. Расчёт основан на цене, 24ч движении, ликвидности, объёме, score и risk-флагах.`;
  if(liq<25000)note+=" Ликвидность слабая — вход только маленькой суммой.";
  if(vol>liq*5&&liq>0)note+=" Объём сильно выше ликвидности — возможна волатильность.";
  return {entry:`${priceFmt(entryLow)} – ${priceFmt(entryHigh)}`,safe:priceFmt(safe),stop:priceFmt(stop),tp1:priceFmt(tp1),tp2:priceFmt(tp2),rr:`1:${rr.toFixed(1)}`,note};
}
function tradeBox(c){
  const t=tradeLayer(c);
  return `<div class="tradeBox">
    <div class="tradeTitle">AI Trade Layer</div>
    <div class="tradeGrid">
      <div class="tradeItem"><div class="tLabel">Зона входа</div><div class="tValue">${t.entry}</div></div>
      <div class="tradeItem"><div class="tLabel">Безопаснее ждать</div><div class="tValue">${t.safe}</div></div>
      <div class="tradeItem"><div class="tLabel">Стоп-зона</div><div class="tValue">${t.stop}</div></div>
      <div class="tradeItem"><div class="tLabel">Risk/Reward</div><div class="tValue">${t.rr}</div></div>
      <div class="tradeItem"><div class="tLabel">Цель 1</div><div class="tValue">${t.tp1}</div></div>
      <div class="tradeItem"><div class="tLabel">Цель 2</div><div class="tValue">${t.tp2}</div></div>
    </div>
    <div class="tradeExplain">${t.note}</div>
    <div class="tradeWarn">Это расчётная зона по данным сканера, не финансовая рекомендация.</div>
  </div>`;
}

function detectTrend(c){const ch=Number(c.price_change_percentage_24h||0),vol=Number(c.total_volume||0),liq=Number(c.liquidity||0),score=Number(c._score||0),vr=liq?vol/liq:0;if(ch>8&&vr>.25)return{type:"up",icon:"↗",text:"восходящий"};if(ch<-8)return{type:"down",icon:"↘",text:"нисходящий"};if(ch<0&&ch>-18&&score>=55&&vr>.15)return{type:"rev",icon:"↘↗",text:"разворот"};return{type:"side",icon:"⌁",text:"боковик"}}
function trendClass(t){return t.type==="up"?"trendUp":t.type==="down"?"trendDown":t.type==="rev"?"trendRev":"trendSide"}
function trendBadge(c){const t=detectTrend(c);return`<div class="trendPill ${trendClass(t)}" title="${t.text}">${t.icon}</div>`}
function saveApiKeys(){["cmc","cg","birdeye","messari"].forEach(k=>{const el=document.getElementById("key_"+k);if(el&&el.value.trim())localStorage.setItem("api_"+k,el.value.trim())});loadApiKeys();showToast("Ключи сохранены")}
function clearApiKeys(){["cmc","cg","birdeye","messari"].forEach(k=>localStorage.removeItem("api_"+k));loadApiKeys();showToast("Ключи удалены")}
function loadApiKeys(){const labels={cmc:"CoinMarketCap",cg:"CoinGecko",birdeye:"Birdeye",messari:"Messari"},connected=[];["cmc","cg","birdeye","messari"].forEach(k=>{const v=localStorage.getItem("api_"+k)||"",el=document.getElementById("key_"+k);if(el)el.value=v;if(v)connected.push(labels[k])});const st=document.getElementById("keyStatus");if(st)st.textContent=connected.length?("Подключено: "+connected.join(", ")):"Ключи не загружены."}

function coinCard(c,watchMode){const div=document.createElement("div");div.className="coin"+(watchMode?" watchCompact":" searchCompact");const cap=c.market_cap||c.fdv||0,risks=riskList(c),score=c._score||0,ch=c.price_change_percentage_24h||0;const fallback=(c.symbol||"?").slice(0,3).toUpperCase();const img=c.image?`<img class="avatar" src="${c.image}" onerror="this.outerHTML='<div class=&quot;avatar fallback&quot;>${fallback}</div>'">`:`<div class="avatar fallback">${fallback}</div>`;div.innerHTML=`<div class="coinTop">${img}<div style="min-width:0;flex:1"><div class="coinName">${c.name||"Unknown"}</div><div class="coinSub">${(c.symbol||"").toUpperCase()} · ${c._source||"Multi"}</div></div><div class="score ${score<45?"bad":score<70?"mid":""}">${score}</div></div><div class="badges"><span class="badge ${risks.length?"warn":"good"}">Риски: ${risks.length}</span><span class="badge">Сеть: ${c._dexChain||"market"}</span><span class="badge">${narrative(c)}</span><span class="badge">Источник: ${c._source||"multi"}</span></div><div class="sourceLine">Факты подтверждаются ссылками в ячейках. Если данных нет — приложение честно показывает «нет данных».</div><div class="analysisGrid">${metric("Капитализация",fmt(cap),metricProof(c,"cap"))}${metric("Цена монеты",priceFmt(c.current_price),metricProof(c,"price"))}${metric("Объём 24ч",fmt(c.total_volume),metricProof(c,"volume"))}${metric("Рост цены 24ч",`<span class="${ch>=0?"goodText":"badText"}">${pct(ch)}</span>`,metricProof(c,"price"))}${metric("Ликвидность",liqText(c),metricProof(c,"liquidity"))}${metric("Возраст проекта",c.age_days?`${c.age_days}д`:"нет данных",metricProof(c,"age"))}${metric("Соцсети",c.website?"сайт найден":"нет данных",c.website?`<a class="proofLink" target="_blank" href="${c.website}">открыть сайт</a>`:"")}${metric("Комьюнити",trendText(c),metricProof(c,"volume"))}${metric("Фонды / backing",fundsSignal(c),c.backingUrl?`<a class="proofLink" target="_blank" href="${c.backingUrl}">подтверждение</a>`:"")}${metric("Экосистема",ecosystem(c),metricProof(c,"chain"))}${metric("Нарратив / сектор",narrative(c),metricProof(c,"sector"))}</div><div class="explain"><b>Почему AI выбрал:</b> капитализация ${fmt(cap)}, ликвидность ${liqText(c)}, объём 24ч ${fmt(c.total_volume)}, движение ${pct(ch)}. ${risks.length?("Риски: "+risks.join(", ")):"Критичных рисков по доступным данным нет."}</div>${tradeBox(c)}<div class="links">${c.url?`<a class="linkBtn" target="_blank" href="${c.url}">DexScreener</a>`:""}<a class="linkBtn" target="_blank" href="https://coinmarketcap.com/search/?q=${encodeURIComponent(c.name||c.symbol||"")}">CoinMarketCap</a><a class="linkBtn" target="_blank" href="https://www.coingecko.com/en/search?query=${encodeURIComponent(c.name||c.symbol||"")}">CoinGecko</a></div>${watchMode?positionBlock(c):""}${watchMode?`<button class="watchDeleteBtn miniAction" aria-label="Удалить" onclick="event.stopPropagation();removeWatch('${c.id}');showToast('Удалено')">−</button>`:`<button class="watchBtn miniAction" aria-label="Добавить">+</button>`}`;if(!watchMode)div.querySelector(".watchBtn").onclick=()=>addWatch(c);if(watchMode){
    div.addEventListener("click",(e)=>{
      if(e.target.closest(".portfolioBox") || e.target.closest(".watchDeleteBtn") || e.target.closest("a") || e.target.closest("button") || e.target.closest("input")) return;
      div.classList.toggle("open");
    });
    setTimeout(()=>{
      div.querySelectorAll(".portfolioBox, .portfolioBox input, .portfolioBox button").forEach(el=>{
        el.addEventListener("click",ev=>ev.stopPropagation());
        el.addEventListener("touchstart",ev=>ev.stopPropagation(),{passive:true});
        el.addEventListener("mousedown",ev=>ev.stopPropagation());
      });
    },0);
  }
  return div}
function watchItems(){try{return JSON.parse(localStorage.getItem("watch_tokens")||"[]")}catch(e){return[]}}
function saveWatchItems(items){localStorage.setItem("watch_tokens",JSON.stringify(hardDedupe(items)));renderWatchlist()}
function addWatch(c){let items=watchItems();if(!items.find(x=>dedupeKey(x)===dedupeKey(c))){items.unshift(c);saveWatchItems(items);showToast("Добавлено")}else showToast("Уже добавлено")}
function removeWatch(id){saveWatchItems(watchItems().filter(x=>String(x.id)!==String(id)))}
function renderWatchlist(){watch.innerHTML="";const items=hardDedupe(watchItems());if(!items.length){watch.innerHTML='<div class="empty">Пока пусто.</div>';return}items.forEach(c=>watch.appendChild(coinCard(c,true)))}
function showTab(t){radarSec.classList.toggle("hidden",t!=="radar");watchSec.classList.toggle("hidden",t!=="watch");sourceSec.classList.toggle("hidden",t!=="source");tabRadar.classList.toggle("active",t==="radar");tabWatch.classList.toggle("active",t==="watch");tabSource.classList.toggle("active",t==="source");if(t==="watch")renderWatchlist()}
async function checkBackend(){try{const r=await fetch("/api/health",{cache:"no-store"});const j=await r.json();backendStatus.innerHTML=`Backend online · ${j.version||""}`}catch(e){backendStatus.innerHTML="Backend не отвечает."}}
window.addEventListener("scroll",()=>{topBtn.classList.toggle("show",window.scrollY>700)});
window.addEventListener("load",()=>{initTheme();updateChainLabel();updateNarrativeLabel();renderWatchlist();checkBackend();loadApiKeys()});

document.addEventListener('click',e=>{if($('chainMenu')&&chainMenu.classList.contains('open')&&!e.target.closest('.chainMenu')&&!e.target.closest('.chainBox'))closeChainMenu()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeChainMenu()});

document.addEventListener('change',e=>{
  if(e.target.classList&&e.target.classList.contains('mnarr')){
    const auto=[...document.querySelectorAll('.mnarr')].find(x=>x.value==='auto');
    if(e.target.value==='auto'&&e.target.checked){
      document.querySelectorAll('.mnarr').forEach(x=>{if(x.value!=='auto')x.checked=false});
    }else if(e.target.checked&&auto){auto.checked=false}
    updateNarrativeLabel();
  }
});
document.addEventListener('click',e=>{
  if(window.narrativeMenu&&narrativeMenu.classList.contains('open')&&!e.target.closest('.narrativeMenu')&&!e.target.closest('.narrativeBox'))closeNarrativeMenu();
});

const v751RiskClick=true;
document.addEventListener("click",e=>{
  const rb=e.target.closest&&e.target.closest("#riskMenu button[data-risk]");
  if(rb){setRiskMode(rb.dataset.risk);return;}
  if(window.riskMenu&&riskMenu.classList.contains("open")&&!e.target.closest("#riskMenu")&&!e.target.closest("#riskBox"))riskMenu.classList.remove("open");
});
document.addEventListener("change",e=>{
  if(e.target.classList&&e.target.classList.contains("mnarr")){
    const auto=[...document.querySelectorAll(".mnarr")].find(x=>x.value==="auto");
    if(e.target.value==="auto"&&e.target.checked){
      document.querySelectorAll(".mnarr").forEach(x=>{if(x.value!=="auto")x.checked=false});
    }else if(e.target.checked&&auto){auto.checked=false}
    updateNarrativeLabel();
  }
});
document.addEventListener("click",e=>{
  if(window.narrativeMenu&&narrativeMenu.classList.contains("open")&&!e.target.closest(".narrativeMenu")&&!e.target.closest(".narrativeBox"))closeNarrativeMenu();
});

const v751CardExpand=true;
document.addEventListener("click",e=>{
  const card=e.target.closest&&e.target.closest(".coin.searchCompact,.coin.watchCompact");
  if(!card)return;
  if(e.target.closest("a")||e.target.closest("button")||e.target.closest("input")||e.target.closest(".portfolioBox"))return;
  card.classList.toggle("open");
});
document.addEventListener("click",e=>{
  const add=e.target.closest&&e.target.closest(".watchBtn.miniAction");
  if(add){e.stopPropagation();}
});

document.addEventListener('DOMContentLoaded',()=>{setupTopFilters();setRiskMode((window.risk&&risk.value)||'balanced');if(typeof updateNarrativeLabel==='function')updateNarrativeLabel();if(typeof loadApiKeys==='function')loadApiKeys();});
