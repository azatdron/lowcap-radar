
const $=id=>document.getElementById(id);
let lastResults=[];
let riskMode="balanced";

function fmt(n){n=Number(n||0);if(!n)return "$0";if(n>=1e9)return "$"+(n/1e9).toFixed(1)+"B";if(n>=1e6)return "$"+(n/1e6).toFixed(1)+"M";if(n>=1e3)return "$"+(n/1e3).toFixed(0)+"K";return "$"+n.toFixed(0)}
function priceFmt(n){n=Number(n||0);if(!n)return"нет данных";if(n<.0001)return"$"+n.toExponential(2);if(n<.01)return"$"+n.toFixed(6);if(n<1)return"$"+n.toFixed(4);return"$"+n.toFixed(2)}
function pct(n){n=Number(n||0);return(n>0?"+":"")+n.toFixed(1)+"%"}
function toast(t){toastEl.textContent=t;toastEl.classList.add("show");setTimeout(()=>toastEl.classList.remove("show"),1100)}
function normalize(v){return String(v||"").toLowerCase().replace(/[^a-z0-9]/g,"")}

function selectedTopRanks(){return [...document.querySelectorAll(".topChip.active")].map(x=>Number(x.dataset.top)).filter(Boolean)}
function selectedChains(){const a=[...document.querySelectorAll(".chainCheck:checked")].map(x=>x.value);return a.length?a:["auto"]}
function selectedNarratives(){const a=[...document.querySelectorAll(".narrativeCheck:checked")].map(x=>x.value);return a.length?a:["auto"]}
function compactLabel(names,empty){if(!names.length)return empty;const cleaned=names.filter(x=>!x.toLowerCase().includes("auto"));if(!cleaned.length)return empty;return cleaned.length===1?cleaned[0]:`${cleaned[0]} +${cleaned.length-1}`}
function updateChainLabel(){const names=[...document.querySelectorAll(".chainCheck:checked")].map(x=>x.parentElement.textContent.trim());chainBox.textContent=compactLabel(names,"Любая")}
function updateNarrativeLabel(){const names=[...document.querySelectorAll(".narrativeCheck:checked")].map(x=>x.parentElement.textContent.trim());narrativeBox.textContent=compactLabel(names,"AUTO / все")}
function setRisk(mode){riskMode=mode;const m={conservative:"Низкий",balanced:"Средний",aggressive:"Высокий"};riskBox.textContent=m[mode]||"Средний";closeModals()}
function openModal(el){modalBackdrop.classList.add("open");el.classList.add("open");document.body.style.overflow="hidden"}
function closeModals(){modalBackdrop.classList.remove("open");document.querySelectorAll(".bottomSheet").forEach(x=>x.classList.remove("open"));document.body.style.overflow=""}

function trend(c){const ch=Number(c.price_change_percentage_24h||0),vol=Number(c.total_volume||0),liq=Number(c.liquidity||0),score=Number(c._score||0),vr=liq?vol/liq:0;if(ch>8&&vr>.25)return{type:"up",icon:"↗",text:"восходящий"};if(ch<-8)return{type:"down",icon:"↘",text:"нисходящий"};if(ch<0&&ch>-18&&score>=55&&vr>.15)return{type:"rev",icon:"↘↗",text:"разворот"};return{type:"side",icon:"⌁",text:"боковик"}}
function trendCls(t){return t.type==="up"?"trendUp":t.type==="down"?"trendDown":t.type==="rev"?"trendRev":"trendSide"}
function risks(c){return c.risks||[]}
function riskCount(c){return risks(c).length}
function rankText(c){const r=c.market_cap_rank||c.cmc_rank||c.rank||null;if(!r)return "Ранг #—";const src=c.cmc_rank?"CMC":(c.market_cap_rank?"CG":"Ранг");return `${src} #${r}`}
function deletePos(c){localStorage.removeItem(posKey(c));toast("Позиция удалена");renderWatch()}

function narrative(c){return c._narrative||"General"}
function liquidity(c){return Number(c.liquidity||0)>0?fmt(c.liquidity):"нет данных"}
function ecosystem(c){return (c._dexChain||"market")+" / "+(c.dex||c._source||"source")}
function social(c){return c.website?"сайт найден":(c.url?"DEX-профиль":"нет данных")}
function backing(c){return c.backing||"нет данных"}
function community(c){const ch=Number(c.price_change_percentage_24h||0);if(ch>20)return"сильный рост 24ч";if(ch>3)return"положительный импульс";if(ch<-20)return"сильная просадка";if(ch<0)return"умеренная просадка";return"стабильно"}
function proof(c,type){const ds=c.url||"",cg=`https://www.coingecko.com/en/search?query=${encodeURIComponent(c.name||c.symbol||"")}`,cmc=`https://coinmarketcap.com/search/?q=${encodeURIComponent(c.name||c.symbol||"")}`;if(["liquidity","volume","chain","age"].includes(type)&&ds)return`<a class="proofLink" target="_blank" href="${ds}">проверить Dex</a>`;if(["cap","price"].includes(type))return`<a class="proofLink" target="_blank" href="${cg}">проверить CG</a>`;return`<a class="proofLink" target="_blank" href="${cmc}">проверить CMC</a>`}
function metric(label,value,link){return`<div class="metric"><div class="metricLabel">${label}</div><div class="metricValue">${value}</div>${link||""}</div>`}

function tradeBox(c){const p=Number(c.current_price||0),score=Number(c._score||0),r=riskCount(c),ch=Number(c.price_change_percentage_24h||0),liq=Number(c.liquidity||0),vol=Number(c.total_volume||0);if(!p)return"";const m=r>2?.18:r>0?.14:.1;const entryLow=p*(ch>15?.88:ch>5?.94:ch<0?.97:.95);const entryHigh=p*(ch>15?.96:ch>5?1.01:ch<0?1.02:1);const stop=p*(1-m*1.45);const tp1=p*(score>=75?1.28:score>=55?1.18:1.1);const tp2=p*(score>=75?1.65:score>=55?1.38:1.22);let rr=(tp1-p)/(p-stop);if(!isFinite(rr)||rr<0)rr=0;let note=`Расчёт основан на цене, 24ч движении, ликвидности, объёме, score и рисках.`;if(liq<25000)note+=" Ликвидность слабая.";if(vol>liq*5&&liq>0)note+=" Объём сильно выше ликвидности.";return`<div class="tradeBox"><div class="tradeTitle">AI Trade Layer</div><div class="tradeGrid"><div class="tradeItem"><div class="tLabel">Зона входа</div><div class="tValue">${priceFmt(entryLow)} – ${priceFmt(entryHigh)}</div></div><div class="tradeItem"><div class="tLabel">Стоп-зона</div><div class="tValue">${priceFmt(stop)}</div></div><div class="tradeItem"><div class="tLabel">Цель 1</div><div class="tValue">${priceFmt(tp1)}</div></div><div class="tradeItem"><div class="tLabel">Цель 2</div><div class="tValue">${priceFmt(tp2)}</div></div><div class="tradeItem"><div class="tLabel">Risk/Reward</div><div class="tValue">1:${rr.toFixed(1)}</div></div></div><div class="tradeExplain">${note}</div><div class="tradeWarn">Это аналитическая оценка, не финансовая рекомендация.</div></div>`}

function key(c){const chain=String(c._dexChain||"").toLowerCase(),addr=String(c.tokenAddress||c.baseAddress||"").toLowerCase();return addr?chain+":"+addr:chain+":"+normalize(c.symbol)+":"+normalize(c.name)}
function dedupe(arr){const m=new Map();for(const c of arr){const k=key(c),old=m.get(k);const w=Number(c.liquidity||0)*3+Number(c.total_volume||0)+Number(c.market_cap||c.fdv||0)/200;if(!old||w>(Number(old.liquidity||0)*3+Number(old.total_volume||0)+Number(old.market_cap||old.fdv||0)/200))m.set(k,c)}return[...m.values()]}

function watchItems(){try{return JSON.parse(localStorage.getItem("watch_tokens")||"[]")}catch(e){return[]}}
function saveWatch(items){localStorage.setItem("watch_tokens",JSON.stringify(dedupe(items)));renderWatch()}
function addWatch(c){const items=watchItems();if(!items.find(x=>key(x)===key(c))){items.unshift(c);saveWatch(items);toast("Добавлено")}else toast("Уже добавлено")}
function removeWatch(c){saveWatch(watchItems().filter(x=>key(x)!==key(c)));toast("Удалено")}
function posKey(c){return"pos_"+key(c)}
function getPos(c){try{return JSON.parse(localStorage.getItem(posKey(c))||"{}")}catch(e){return{}}}
function savePos(c){const amount=document.getElementById("amt_"+c.id)?.value||0,entry=document.getElementById("entry_"+c.id)?.value||0;localStorage.setItem(posKey(c),JSON.stringify({amount:Number(amount),entry:Number(entry),ts:Date.now()}));toast("Позиция сохранена");renderWatch()}
function portfolio(c){
  const p=getPos(c),price=Number(c.current_price||0),amount=Number(p.amount||0),entry=Number(p.entry||0);
  const has=amount>0;
  const now=has&&entry>0&&price>0?amount*(price/entry):amount;
  const pnl=has&&amount>0?((now-amount)/amount*100):0;
  const cls=pnl>0?"pnlUp":pnl<0?"pnlDown":"pnlFlat";
  const arrow=pnl>0?"▲":pnl<0?"▼":"•";
  const del=has?`<button class="posDelete" type="button" onclick="event.stopPropagation();deletePos(lastById('${c.id}'))">×</button>`:"";
  return`<div class="portfolioBox" onclick="event.stopPropagation()"><b>Моя позиция</b><div class="posSummary">${has?`<span>Вложено: $${amount.toFixed(2)}</span><span>Сейчас: $${now.toFixed(2)}</span><span class="${cls}">${arrow} ${pnl.toFixed(1)}%</span>${del}`:"позиция не добавлена"}</div><div class="portfolioRow"><input id="amt_${c.id}" placeholder="Сумма $" value="${amount||""}" onclick="event.stopPropagation()"><input id="entry_${c.id}" placeholder="Цена входа" value="${entry||""}" onclick="event.stopPropagation()"></div><button class="smallBtn" type="button" onclick="event.stopPropagation();savePos(lastById('${c.id}'))">Сохранить позицию</button></div>`
}
function lastById(id){return[...lastResults,...watchItems()].find(x=>String(x.id)===String(id))||{}}

function coinCard(c,watchMode=false){const t=trend(c),score=Number(c._score||0),ch=Number(c.price_change_percentage_24h||0),cap=c.market_cap||c.fdv||0,rs=risks(c),fallback=(c.symbol||"?").slice(0,3).toUpperCase();const img=c.image?`<img class="avatar" src="${c.image}" onerror="this.outerHTML='<div class=&quot;avatar fallback&quot;>${fallback}</div>'">`:`<div class="avatar fallback">${fallback}</div>`;const div=document.createElement("div");div.className="coin "+(watchMode?"watchCard":"radarCard");div.innerHTML=`<button class="miniAction" type="button" aria-label="${watchMode?"Удалить":"Добавить"}">${watchMode?"−":"+"}</button><div class="coinTop">${img}<div class="coinMain"><div class="coinName">${c.name||"Unknown"}</div><div class="coinSub">${(c.symbol||"").toUpperCase()} · ${c._source||"Multi"}</div><div class="trendText">${t.text}</div></div><div class="trendPill ${trendCls(t)}">${t.icon}</div><div class="score ${score<45?"bad":score<70?"mid":""}">${score}</div></div><div class="badges"><span class="badge ${rs.length?"bad":"good"}">Риски: ${rs.length}</span><span class="badge">${c._dexChain||"market"}</span><span class="badge">${narrative(c)}</span><span class="badge rankBadge">${rankText(c)}</span></div><div class="compactFacts"><span class="compactFact">Цена ${priceFmt(c.current_price)}</span><span class="compactFact ${ch>=0?"good":"bad"}">24ч ${pct(ch)}</span><span class="compactFact">Кап ${fmt(cap)}</span><span class="compactFact">Ликв ${liquidity(c)}</span></div><div class="details"><div class="analysisGrid">${metric("Капитализация",fmt(cap),proof(c,"cap"))}${metric("Ранг рынка",rankText(c),proof(c,"rank"))}${metric("Цена монеты",priceFmt(c.current_price),proof(c,"price"))}${metric("Объём 24ч",fmt(c.total_volume),proof(c,"volume"))}${metric("Рост цены 24ч",`<span class="${ch>=0?"good":"bad"}">${pct(ch)}</span>`,proof(c,"price"))}${metric("Ликвидность",liquidity(c),proof(c,"liquidity"))}${metric("Возраст проекта",c.age_days?`${c.age_days}д`:"нет данных",proof(c,"age"))}${metric("Тренд",`${t.icon} ${t.text}`,proof(c,"price"))}${metric("Соцсети",social(c),c.website?`<a class="proofLink" target="_blank" href="${c.website}">открыть сайт</a>`:"")}${metric("Комьюнити",community(c),proof(c,"volume"))}${metric("Фонды / backing",backing(c),c.backingUrl?`<a class="proofLink" target="_blank" href="${c.backingUrl}">подтверждение</a>`:"")}${metric("Экосистема",ecosystem(c),proof(c,"chain"))}${metric("Нарратив / сектор",narrative(c),proof(c,"sector"))}</div><div class="explain"><b>Почему AI выбрал:</b> капитализация ${fmt(cap)}, ликвидность ${liquidity(c)}, объём 24ч ${fmt(c.total_volume)}, движение ${pct(ch)}, тренд: ${t.text}. ${rs.length?("Риски: "+rs.join(", ")):"Критичных рисков по доступным данным нет."}</div>${tradeBox(c)}<div class="links">${c.url?`<a class="linkBtn" target="_blank" href="${c.url}">DexScreener</a>`:""}<a class="linkBtn" target="_blank" href="https://coinmarketcap.com/search/?q=${encodeURIComponent(c.name||c.symbol||"")}">CoinMarketCap</a><a class="linkBtn" target="_blank" href="https://www.coingecko.com/en/search?query=${encodeURIComponent(c.name||c.symbol||"")}">CoinGecko</a></div>${watchMode?portfolio(c):""}</div>`;div.querySelector(".miniAction").onclick=e=>{e.stopPropagation();watchMode?removeWatch(c):addWatch(c)};div.addEventListener("click",e=>{if(e.target.closest("a")||e.target.closest("button")||e.target.closest("input")||e.target.closest(".portfolioBox"))return;div.classList.toggle("open")});return div}

async function scan(){found.textContent="—";avg.textContent="—";results.innerHTML='<div class="empty">Сканирую источники...</div>';try{const chains=selectedChains().join(","),sector=selectedNarratives().join(",");const r=await fetch(`/api/scan?chains=${encodeURIComponent(chains)}&sector=${encodeURIComponent(sector)}&risk=${encodeURIComponent(riskMode)}&budget=${encodeURIComponent(budget.value)}`,{cache:"no-store"});if(!r.ok)throw new Error(await r.text());const data=await r.json();let all=dedupe(data.items||[]);if(riskMode==="aggressive")all.sort((a,b)=>riskCount(b)-riskCount(a)||(b._score||0)-(a._score||0));else if(riskMode==="conservative")all.sort((a,b)=>riskCount(a)-riskCount(b)||(b._score||0)-(a._score||0));else all.sort((a,b)=>(b._score||0)-(a._score||0));const tops=selectedTopRanks();if(tops.length){const maxTop=Math.max(...tops);all=all.filter(x=>!x.market_cap_rank||x.market_cap_rank<=maxTop)}all=all.slice(0,25);lastResults=all;found.textContent=all.length;avg.textContent=all.length?Math.round(all.reduce((s,x)=>s+Number(x._score||0),0)/all.length):"—";results.innerHTML="";if(!all.length){results.innerHTML='<div class="empty">Ничего не найдено. Измени фильтры и попробуй снова.</div>'}else all.forEach(c=>results.appendChild(coinCard(c,false)));note.textContent=`Обработано кандидатов: ${data.processed||all.length}. Источники: ${data.sources?.join(" + ")||"backend"}.`}catch(e){results.innerHTML=`<div class="empty">Ошибка поиска: ${String(e.message||e)}</div>`;note.textContent="Backend не ответил. Проверь, что папка api загружена и Vercel redeploy сделан без cache."}}

function resetAll(){document.querySelectorAll(".topChip").forEach(x=>x.classList.remove("active"));document.querySelectorAll(".chainCheck,.narrativeCheck").forEach(x=>x.checked=false);budget.value="any";setRisk("balanced");updateChainLabel();updateNarrativeLabel();lastResults=[];found.textContent="0";avg.textContent="—";results.innerHTML='<div class="empty">Радар готов к поиску.</div>';note.textContent='Фильтры сброшены. Результаты очищены.';toast("Сброшено")}
function renderWatch(){watch.innerHTML="";const items=dedupe(watchItems());if(!items.length){watch.innerHTML='<div class="empty">Пока пусто.</div>';return}items.forEach(c=>watch.appendChild(coinCard(c,true)))}
function showPage(p){radarPage.classList.toggle("hidden",p!=="radar");watchPage.classList.toggle("hidden",p!=="watch");sourcePage.classList.toggle("hidden",p!=="source");tabRadar.classList.toggle("active",p==="radar");tabWatch.classList.toggle("active",p==="watch");tabSource.classList.toggle("active",p==="source");if(p==="watch")renderWatch()}

function saveApiKeys(){["cmc","cg","birdeye","messari"].forEach(k=>{const el=$("key_"+k);if(el)localStorage.setItem("api_"+k,el.value.trim())});loadApiKeys();toast("Ключи сохранены")}
function clearApiKeys(){["cmc","cg","birdeye","messari"].forEach(k=>{localStorage.removeItem("api_"+k);const el=$("key_"+k);if(el)el.value=""});loadApiKeys();toast("Очищено")}
function loadApiKeys(){const labels={cmc:"CoinMarketCap",cg:"CoinGecko",birdeye:"Birdeye",messari:"Messari"},a=[];["cmc","cg","birdeye","messari"].forEach(k=>{const v=localStorage.getItem("api_"+k)||"",el=$("key_"+k);if(el)el.value=v;if(v)a.push(labels[k])});keyStatus.textContent=a.length?"Подключено: "+a.join(", "):"Ключи не загружены."}
async function checkBackend(){try{const r=await fetch("/api/health",{cache:"no-store"});const j=await r.json();backendStatus.textContent=`Backend online · ${j.version||""}`}catch(e){backendStatus.textContent="Backend не отвечает."}}

document.addEventListener("DOMContentLoaded",()=>{
  toastEl=$("toast");
  themeBtn.onclick=()=>{document.body.classList.toggle("light");localStorage.setItem("theme",document.body.classList.contains("light")?"light":"dark")};
  if(localStorage.getItem("theme")==="light")document.body.classList.add("light");
  narrativeBox.onclick=()=>openModal(narrativeModal);
  chainBox.onclick=()=>openModal(chainModal);
  riskBox.onclick=()=>openModal(riskModal);
  modalBackdrop.onclick=closeModals;
  document.querySelectorAll(".topChip").forEach(b=>b.onclick=()=>b.classList.toggle("active"));
  document.querySelectorAll(".chainCheck").forEach(x=>x.onchange=updateChainLabel);
  document.querySelectorAll(".narrativeCheck").forEach(x=>x.onchange=e=>{const auto=[...document.querySelectorAll(".narrativeCheck")].find(v=>v.value==="auto");if(e.target.value==="auto"&&e.target.checked){document.querySelectorAll(".narrativeCheck").forEach(v=>{if(v.value!=="auto")v.checked=false})}else if(e.target.checked&&auto)auto.checked=false;updateNarrativeLabel()});
  document.querySelectorAll(".riskOption").forEach(b=>b.onclick=()=>setRisk(b.dataset.risk));
  scanBtn.onclick=scan;resetBtn.onclick=resetAll;
  tabRadar.onclick=()=>showPage("radar");tabWatch.onclick=()=>showPage("watch");tabSource.onclick=()=>showPage("source");
  saveKeysBtn.onclick=saveApiKeys;clearKeysBtn.onclick=clearApiKeys;
  updateChainLabel();updateNarrativeLabel();setRisk("balanced");renderWatch();loadApiKeys();checkBackend();
});
