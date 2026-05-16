
const $=id=>document.getElementById(id);
const PRO_MODE = localStorage.getItem("lowcap_pro")==="1";
function isPro(){return PRO_MODE}

let lastResults=[];
let openCoinKey=null;
const coinStore=new Map();
let riskMode="balanced";

function updateThemeIcon(){if(window.themeBtn)themeBtn.textContent=document.body.classList.contains("light")?"🌙":"☀️"}
function fmt(n){n=Number(n||0);if(!n)return "$0";if(n>=1e9)return "$"+(n/1e9).toFixed(1)+"B";if(n>=1e6)return "$"+(n/1e6).toFixed(1)+"M";if(n>=1e3)return "$"+(n/1e3).toFixed(0)+"K";return "$"+n.toFixed(0)}
function priceFmt(n){n=Number(n||0);if(!n)return"нет данных";if(n<.0001)return"$"+n.toExponential(2);if(n<.01)return"$"+n.toFixed(6);if(n<1)return"$"+n.toFixed(4);return"$"+n.toFixed(2)}
function pct(n){n=Number(n||0);return(n>0?"+":"")+n.toFixed(1)+"%"}
function toast(t){toastEl.textContent=t;toastEl.classList.add("show");setTimeout(()=>toastEl.classList.remove("show"),1100)}
function normalize(v){return String(v||"").toLowerCase().replace(/[^a-z0-9]/g,"")}

function selectedTopRanks(){return [...document.querySelectorAll(".topChip.active")].map(x=>Number(x.dataset.top)).filter(Boolean)}
function selectedChains(){const a=[...document.querySelectorAll(".chainCheck:checked")].map(x=>x.value).filter(x=>x!=="auto");return a.length?a:["auto"]}
function selectedNarratives(){const a=[...document.querySelectorAll(".narrativeCheck:checked")].map(x=>x.value).filter(x=>x!=="auto");return a.length?a:["auto"]}
function compactLabel(names,empty){if(!names.length)return empty;const cleaned=names.filter(x=>!x.toLowerCase().includes("auto"));if(!cleaned.length)return empty;return cleaned.length===1?cleaned[0]:`${cleaned[0]} +${cleaned.length-1}`}
function updateChainLabel(){const names=[...document.querySelectorAll(".chainCheck:checked")].map(x=>x.parentElement.textContent.trim());chainBox.textContent=compactLabel(names,"Все сети")}
function updateNarrativeLabel(){const names=[...document.querySelectorAll(".narrativeCheck:checked")].map(x=>x.parentElement.textContent.trim());narrativeBox.textContent=compactLabel(names,"Все сектора")}
function setRisk(mode){riskMode=mode;const m={conservative:"Низкий",balanced:"Средний",aggressive:"Высокий"};riskBox.textContent=m[mode]||"Средний";closeModals()}
function openModal(el){modalBackdrop.classList.add("open");el.classList.add("open");document.body.style.overflow="hidden"}
function closeModals(){modalBackdrop.classList.remove("open");document.querySelectorAll(".bottomSheet").forEach(x=>x.classList.remove("open"));document.body.style.overflow=""}

function trend(c){const ch=Number(c.price_change_percentage_24h||0),vol=Number(c.total_volume||0),liq=Number(c.liquidity||0),score=Number(c._score||0),vr=liq?vol/liq:0;if(ch>8&&vr>.25)return{type:"up",icon:"↗",text:"восходящий"};if(ch<-8)return{type:"down",icon:"↘",text:"нисходящий"};if(ch<0&&ch>-18&&score>=55&&vr>.15)return{type:"rev",icon:"↘↗",text:"разворот"};return{type:"side",icon:"⌁",text:"боковик"}}
function trendCls(t){return t.type==="up"?"trendUp":t.type==="down"?"trendDown":t.type==="rev"?"trendRev":"trendSide"}
function risks(c){return c.risks||[]}
function riskCount(c){return risks(c).length}
function narrative(c){return c._narrative||"General"}
function liquidity(c){return Number(c.liquidity||0)>0?fmt(c.liquidity):(lrLang==="en"?"no data":"нет данных")}
function ecosystem(c){return (c._dexChain||"market")+" / "+(c.dex||c._source||"source")}
function social(c){return c.website?"сайт найден":(c.url?"DEX-профиль":(lrLang==="en"?"no data":"нет данных"))}
function backing(c){return c.backing||"нет данных"}
function community(c){const ch=Number(c.price_change_percentage_24h||0);if(ch>20)return"сильный рост 24ч";if(ch>3)return"положительный импульс";if(ch<-20)return"сильная просадка";if(ch<0)return"умеренная просадка";return"стабильно"}


function slugifyCoin(v){
  return String(v||"").trim().toLowerCase()
    .replace(/['’]/g,"")
    .replace(/[^a-z0-9]+/g,"-")
    .replace(/^-+|-+$/g,"");
}
function cmcUrl(c){
  if(c.cmc_url)return c.cmc_url;
  if(c.cmc_slug)return `https://coinmarketcap.com/currencies/${c.cmc_slug}/`;
  return `https://coinmarketcap.com/currencies/${slugifyCoin(c.name||c.symbol)}/`;
}
function cgUrl(c){
  if(c.cg_url)return c.cg_url;
  if(c.coingecko_id||c.id)return `https://www.coingecko.com/en/coins/${encodeURIComponent(c.coingecko_id||c.id)}`;
  return `https://www.coingecko.com/en/search?query=${encodeURIComponent(c.name||c.symbol||"")}`;
}
function rankBadgeClass(c){
  return rankSource(c)?"realRank":"noRank";
}


function tx(k){return typeof lrT==="function"?lrT(k):(typeof tr==="function"?tr(k):k)}
function trendLabel(v){const s=String(v||"").toLowerCase();if(s.includes("вос")||s.includes("up"))return tx("uptrend");if(s.includes("нис")||s.includes("down"))return tx("downtrend");if(s.includes("раз")||s.includes("rev"))return tx("reversal");return tx("sideways")}
function riskLabel(n){return `${tx("risks")}: ${n}`}
function rankLabel(c){const r=c.cmc_rank||c.market_cap_rank||c.rank||null;if(!r)return tx("rankNone");const src=c.cmc_rank?"CMC":(c.market_cap_rank?"CG":"");return `${src?src+" ":""}#${r}`}
function rankSource(c){
  if(c.cmc_rank)return "CMC";
  if(c.market_cap_rank)return "CG";
  if(c.rank)return "Rank";
  return "";
}
function rankText(c){return rankLabel(c)}
function safeId(k){return String(k).replace(/[^a-zA-Z0-9_-]/g,"_")}
function deletePosByKey(k){
  localStorage.removeItem("pos_"+k);
  openCoinKey=k;
  toast("Позиция удалена");
  renderWatch(k);
  requestAnimationFrame(()=>{
    const card=document.querySelector(`[data-coin-key="${CSS.escape(k)}"]`);
    if(card) card.classList.add("open");
  });
}
function savePosByKey(k){
  const existing=localStorage.getItem("pos_"+k);
  if(existing){
    toast(typeof lrT==="function"?lrT("deleteToChange"):"Позиция уже сохранена");
    return;
  }
  const c=coinStore.get(k)||watchItems().find(x=>key(x)===k)||lastResults.find(x=>key(x)===k);
  if(!c){toast("Монета не найдена");return}
  const sid=safeId(k);
  const amount=document.getElementById("amt_"+sid)?.value||0;
  const entry=document.getElementById("entry_"+sid)?.value||c.current_price||0;
  if(Number(amount)<=0 || Number(entry)<=0){
    toast("Заполни сумму и цену входа");
    return;
  }
  localStorage.setItem("pos_"+k,JSON.stringify({amount:Number(amount),entry:Number(entry),ts:Date.now(),locked:true}));
  openCoinKey=k;
  toast(typeof lrT==="function"?lrT("saved"):"Позиция сохранена");
  renderWatch(k);
  requestAnimationFrame(()=>{
    const card=document.querySelector(`[data-coin-key="${CSS.escape(k)}"]`);
    if(card){
      card.classList.add("open");
      card.scrollIntoView({block:"center",behavior:"smooth"});
    }
  });
}

function proof(c,type){const ds=c.url||"",cg=`https://www.coingecko.com/en/search?query=${encodeURIComponent(c.name||c.symbol||"")}`,cmc=`https://coinmarketcap.com/search/?q=${encodeURIComponent(c.name||c.symbol||"")}`;if(["liquidity","volume","chain","age"].includes(type)&&ds)return`<a class="proofLink" target="_blank" href="${ds}">${tx("checkDex")}</a>`;if(["cap","price"].includes(type))return`<a class="proofLink" target="_blank" href="${cg}">${tx("checkCG")}</a>`;return`<a class="proofLink" target="_blank" href="${cmc}">${tx("checkCMC")}</a>`}
function metric(label,value,link){return`<div class="metric"><div class="metricLabel">${label}</div><div class="metricValue">${value}</div>${link||""}</div>`}

function tradeBox(c){const p=Number(c.current_price||0),score=Number(c._score||0),r=riskCount(c),ch=Number(c.price_change_percentage_24h||0),liq=Number(c.liquidity||0),vol=Number(c.total_volume||0);if(!p)return"";const m=r>2?.18:r>0?.14:.1;const entryLow=p*(ch>15?.88:ch>5?.94:ch<0?.97:.95);const entryHigh=p*(ch>15?.96:ch>5?1.01:ch<0?1.02:1);const stop=p*(1-m*1.45);const tp1=p*(score>=75?1.28:score>=55?1.18:1.1);const tp2=p*(score>=75?1.65:score>=55?1.38:1.22);let rr=(tp1-p)/(p-stop);if(!isFinite(rr)||rr<0)rr=0;let note=`${tx("calculatedNote")}`;if(liq<25000)note+=" Ликвидность слабая.";if(vol>liq*5&&liq>0)note+=" Объём сильно выше ликвидности.";return`<div class="tradeBox"><div class="tradeTitle">${tx("aiLayer")}</div><div class="tradeGrid"><div class="tradeItem"><div class="tLabel">${tx("entryZone")}</div><div class="tValue">${priceFmt(entryLow)} – ${priceFmt(entryHigh)}</div></div><div class="tradeItem"><div class="tLabel">${tx("stopZone")}</div><div class="tValue">${priceFmt(stop)}</div></div><div class="tradeItem"><div class="tLabel">${tx("target1")}</div><div class="tValue">${priceFmt(tp1)}</div></div><div class="tradeItem"><div class="tLabel">${tx("target2")}</div><div class="tValue">${priceFmt(tp2)}</div></div><div class="tradeItem"><div class="tLabel">Risk/Reward</div><div class="tValue">1:${rr.toFixed(1)}</div></div></div><div class="tradeExplain">${note}</div><div class="tradeWarn">${tx("disclaimer")}</div></div>`}

function key(c){const chain=String(c._dexChain||"").toLowerCase(),addr=String(c.tokenAddress||c.baseAddress||"").toLowerCase();return addr?chain+":"+addr:chain+":"+normalize(c.symbol)+":"+normalize(c.name)}
function dedupe(arr){const m=new Map();for(const c of arr){const k=key(c),old=m.get(k);const w=Number(c.liquidity||0)*3+Number(c.total_volume||0)+Number(c.market_cap||c.fdv||0)/200;if(!old||w>(Number(old.liquidity||0)*3+Number(old.total_volume||0)+Number(old.market_cap||old.fdv||0)/200))m.set(k,c)}return[...m.values()]}

function watchItems(){try{return JSON.parse(localStorage.getItem("watch_tokens")||"[]")}catch(e){return[]}}
function saveWatch(items){localStorage.setItem("watch_tokens",JSON.stringify(dedupe(items)));renderWatch()}
function addWatch(c){const items=watchItems();if(!items.find(x=>key(x)===key(c))){items.unshift(c);saveWatch(items);toast("Добавлено")}else toast("Уже добавлено")}
function removeWatch(c){saveWatch(watchItems().filter(x=>key(x)!==key(c)));toast("Удалено")}
function posKey(c){return"pos_"+key(c)}
function getPos(c){try{return JSON.parse(localStorage.getItem(posKey(c))||"{}")}catch(e){return{}}}
function portfolio(c){
  const k=key(c),sid=safeId(k);
  coinStore.set(k,c);
  const p=getPos(c);
  const price=Number(c.current_price||0);
  const amount=Number(p.amount||0);
  const entry=Number(p.entry||price||0);
  const has=amount>0;
  const now=has&&entry>0&&price>0?amount*(price/entry):amount;
  const pnl=has&&amount>0?((now-amount)/amount*100):0;
  const cls=pnl>0?"pnlUp":pnl<0?"pnlDown":"pnlFlat";
  const arrow=pnl>0?"▲":pnl<0?"▼":"•";
  const del=has?`<button class="posDelete" type="button" onclick="event.stopPropagation();deletePosByKey('${k}')">×</button>`:"";
  const disabled=has?"disabled":"";
  const lockedClass=has?"lockedInput":"";
  const btnClass=has?"smallBtn savePosBtn locked":"smallBtn savePosBtn";
  const btnDisabled=has?"disabled":"";
  const btnText=has?(typeof lrT==="function"?lrT("positionSaved"):"Позиция сохранена"):(typeof lrT==="function"?lrT("addPosition"):"Сохранить позицию");
  const hint=has?`<div class="positionHint">${typeof lrT==="function"?lrT("deleteToChange"):"Чтобы изменить позицию, удали её через X и добавь заново."}</div>`:"";
  return`<div class="portfolioBox" onclick="event.stopPropagation()">
    <b>${typeof lrT==="function"?lrT("myPosition"):"Моя позиция"}</b>
    <div class="posSummary">${has?`<span>${typeof lrT==="function"?lrT("invested"):"Вложено"}: $${amount.toFixed(2)}</span><span>${typeof lrT==="function"?lrT("now"):"Сейчас"}: $${now.toFixed(2)}</span><span class="${cls}">${arrow} ${pnl.toFixed(1)}%</span>${del}`:(typeof lrT==="function"?lrT("positionNotAdded"):"позиция не добавлена")}</div>
    <div class="portfolioRow">
      <input id="amt_${sid}" class="${lockedClass}" placeholder="${typeof lrT==="function"?lrT("amount"):"Сумма $"}" value="${amount||""}" ${disabled} onclick="event.stopPropagation()">
      <input id="entry_${sid}" class="${lockedClass}" placeholder="${typeof lrT==="function"?lrT("entry"):"Цена входа"}" value="${entry||""}" ${disabled} onclick="event.stopPropagation()">
    </div>
    <button class="${btnClass}" type="button" ${btnDisabled} onclick="event.stopPropagation();savePosByKey('${k}')">${btnText}</button>
    ${hint}
  </div>`
}
function coinCard(c,watchMode=false){
  coinStore.set(key(c),c);const t=trend(c),score=Number(c._score||0),ch=Number(c.price_change_percentage_24h||0),cap=c.market_cap||c.fdv||0,rs=risks(c),fallback=(c.symbol||"?").slice(0,3).toUpperCase();const img=c.image?`<img class="avatar" src="${c.image}" onerror="this.outerHTML='<div class=&quot;avatar fallback&quot;>${fallback}</div>'">`:`<div class="avatar fallback">${fallback}</div>`;const div=document.createElement("div");div.dataset.coinKey=key(c);div.className="coin "+(watchMode?"watchCard":"radarCard");div.innerHTML=`<button class="miniAction" type="button" aria-label="${watchMode?"Удалить":"Добавить"}">${watchMode?"−":"+"}</button><div class="coinTop">${img}<div class="coinMain"><div class="coinName">${c.name||"Unknown"}</div><div class="coinSub">${(c.symbol||"").toUpperCase()} · ${c._source||"Multi"}</div><div class="trendText">${trendLabel(t.text)}</div></div><div class="trendPill ${trendCls(t)}">${t.icon}</div><div class="score ${score<45?"bad":score<70?"mid":""}">${score}</div></div><div class="badges"><span class="badge ${rs.length?"bad":"good"}">${riskLabel(rs.length)}</span><span class="badge">${c._dexChain||"market"}</span><span class="badge">${narrative(c)}</span><span class="badge rankBadge ${rankBadgeClass(c)}">${rankText(c)}</span><span class="badge ${ch>0?"changeUp":ch<0?"changeDown":"changeFlat"}">24ч ${pct(ch)}</span></div><div class="compactFacts"><span class="compactFact">${tx("price")} ${priceFmt(c.current_price)}</span><span class="compactFact">${tx("cap")} ${fmt(cap)}</span><span class="compactFact">${tx("liquidity")} ${liquidity(c)}</span></div><div class="details"><div class="analysisGrid">${metric(tx("marketCap"),fmt(cap),proof(c,"cap"))}${metric(tx("marketRank"),rankText(c),proof(c,"rank"))}${metric(tx("coinPriceFull"),priceFmt(c.current_price),proof(c,"price"))}${metric(tx("volume24"),fmt(c.total_volume),proof(c,"volume"))}${metric(tx("growth24"),`<span class="${ch>=0?"good":"bad"}">${pct(ch)}</span>`,proof(c,"price"))}${metric(tx("liquidity"),liquidity(c),proof(c,"liquidity"))}${metric(tx("projectAge"),c.age_days?`${c.age_days}${lrLang==="en"?"d":"д"}`:(lrLang==="en"?"no data":"нет данных"),proof(c,"age"))}${metric(tx("trend"),`${t.icon} ${trendLabel(t.text)}`,proof(c,"price"))}${metric(tx("socials"),social(c),c.website?`<a class="proofLink" target="_blank" href="${c.website}">${lrLang==="en"?"open site":"открыть сайт"}</a>`:"")}${metric(tx("community"),community(c),proof(c,"volume"))}${metric(tx("backing"),backing(c),c.backingUrl?`<a class="proofLink" target="_blank" href="${c.backingUrl}">${lrLang==="en"?"proof":"подтверждение"}</a>`:"")}${metric(tx("ecosystem"),ecosystem(c),proof(c,"chain"))}${metric(tx("narrative"),narrative(c),proof(c,"sector"))}</div><div class="explain"><b>${lrLang==="en"?"Why AI picked it:":"Почему AI выбрал:"}</b> ${lrLang==="en"?"market cap":"капитализация"} ${fmt(cap)}, ${lrLang==="en"?"liquidity":"ликвидность"} ${liquidity(c)}, ${lrLang==="en"?"24h volume":"объём 24ч"} ${fmt(c.total_volume)}, ${lrLang==="en"?"move":"движение"} ${pct(ch)}, ${lrLang==="en"?"trend":"тренд"}: ${trendLabel(t.text)}. ${rs.length?((lrLang==="en"?"Risks: ":"Риски: ")+rs.join(", ")):(lrLang==="en"?"No critical risks in available data.":"Критичных рисков по доступным данным нет.")}</div>${tradeBox(c)}<div class="links">${c.url?`<a class="linkBtn" target="_blank" href="${c.url}">DexScreener</a>`:""}<a class="linkBtn" target="_blank" rel="noopener" href="${cmcUrl(c)}">CoinMarketCap</a><a class="linkBtn" target="_blank" rel="noopener" href="${cgUrl(c)}">CoinGecko</a></div>${watchMode?portfolio(c):""}</div>`;div.querySelector(".miniAction").onclick=e=>{e.stopPropagation();watchMode?removeWatch(c):addWatch(c)};div.addEventListener("click",e=>{if(e.target.closest("a")||e.target.closest("button")||e.target.closest("input")||e.target.closest(".portfolioBox"))return;div.classList.toggle("open");openCoinKey=div.classList.contains("open")?key(c):null});return div}

async function scan(){found.textContent="—";avg.textContent="—";results.innerHTML='<div class="empty">Сканирую источники...</div>';try{const chains=selectedChains().join(","),sector=selectedNarratives().join(",");const r=await fetch(`/api/scan?chains=${encodeURIComponent(chains)}&sector=${encodeURIComponent(sector)}&risk=${encodeURIComponent(riskMode)}&budget=${encodeURIComponent(budget.value)}`,{cache:"no-store"});if(!r.ok)throw new Error(await r.text());const data=await r.json();let all=dedupe(data.items||[]);if(riskMode==="aggressive")all.sort((a,b)=>riskCount(b)-riskCount(a)||(b._score||0)-(a._score||0));else if(riskMode==="conservative")all.sort((a,b)=>riskCount(a)-riskCount(b)||(b._score||0)-(a._score||0));else all.sort((a,b)=>(b._score||0)-(a._score||0));const tops=selectedTopRanks();if(tops.length){const maxTop=Math.max(...tops);all=all.filter(x=>!x.market_cap_rank||x.market_cap_rank<=maxTop)}all=all.slice(0,25);lastResults=all;found.textContent=all.length;avg.textContent=all.length?Math.round(all.reduce((s,x)=>s+Number(x._score||0),0)/all.length):"—";results.innerHTML="";if(!all.length){results.innerHTML='<div class="empty">Ничего не найдено. Измени фильтры и попробуй снова.</div>'}else all.forEach(c=>results.appendChild(coinCard(c,false)));note.textContent=`Обработано кандидатов: ${data.processed||all.length}. Источники: ${data.sources?.join(" + ")||"backend"}.`}catch(e){results.innerHTML=`<div class="empty">Ошибка поиска: ${String(e.message||e)}</div>`}}

function resetAll(){document.querySelectorAll(".topChip").forEach(x=>x.classList.remove("active"));document.querySelectorAll(".chainCheck,.narrativeCheck").forEach(x=>x.checked=false);budget.value="any";setRisk("balanced");updateChainLabel();updateNarrativeLabel();lastResults=[];found.textContent="0";avg.textContent="—";results.innerHTML='<div class="empty">Радар готов к поиску.</div>';note.textContent='Фильтры сброшены. Результаты очищены.';toast("Сброшено")}

function calcPortfolioPnl(){
  const items=dedupe(watchItems());
  let invested=0,current=0,count=0;
  for(const c of items){
    coinStore.set(key(c),c);
    const p=getPos(c);
    const amount=Number(p.amount||0);
    const entry=Number(p.entry||0);
    const price=Number(c.current_price||0);
    if(amount>0){
      invested+=amount;
      current+=entry>0&&price>0?amount*(price/entry):amount;
      count++;
    }
  }
  const pnl=current-invested;
  const pct=invested>0?(pnl/invested*100):0;
  return {invested,current,pnl,pct,count};
}
function renderPnlBox(){
  if(!window.pnlText)return;
  const box=window.pnlBox;
  const p=calcPortfolioPnl();
  if(box){box.classList.remove("profitGlow","lossGlow")}
  if(!p.count){
    pnlText.innerHTML='<div class="pnlMain flat">PnL • $0.00 (0.00%)</div><div class="pnlSub">Позиции не добавлены.</div>';
    return;
  }
  const cls=p.pnl>0?'profit':p.pnl<0?'loss':'flat';
  if(box && p.pnl>0)box.classList.add("profitGlow");
  if(box && p.pnl<0)box.classList.add("lossGlow");
  const arrow=p.pnl>0?'▲':p.pnl<0?'▼':'•';
  const sign=p.pnl>0?'+':'';
  pnlText.innerHTML=`<div class="pnlMain ${cls}"><span class="pnlLabel">${typeof lrT==="function"?lrT("myPnl"):(typeof tr==="function"?tr("myPnl"):"My PnL")}</span><span class="pnlValue">${arrow} ${sign}$${p.pnl.toFixed(2)} (${sign}${p.pct.toFixed(2)}%)</span></div><div class="pnlSub">${typeof lrT==="function"?lrT("invested"):(typeof tr==="function"?tr("invested"):"Invested")} <b>$${p.invested.toFixed(0)}</b> · ${typeof lrT==="function"?lrT("now"):(typeof tr==="function"?tr("now"):"Now")} <b>$${p.current.toFixed(0)}</b> · <b>${p.count}</b> ${typeof lrT==="function"?lrT("positions"):(typeof tr==="function"?tr("positions"):"positions")}</div>`;
}

function renderWatch(keepKey=openCoinKey){
  watch.innerHTML="";
  const items=dedupe(watchItems());
  if(!items.length){watch.innerHTML='<div class="empty">Пока пусто.</div>';renderPnlBox();return}
  items.forEach(c=>{
    const card=coinCard(c,true);
    if(keepKey && key(c)===keepKey) card.classList.add("open");
    watch.appendChild(card);
  });
  renderPnlBox();
}
function showPage(p){radarPage.classList.toggle("hidden",p!=="radar");watchPage.classList.toggle("hidden",p!=="watch");sourcePage.classList.toggle("hidden",p!=="source");tabRadar.classList.toggle("active",p==="radar");tabWatch.classList.toggle("active",p==="watch");tabSource.classList.toggle("active",p==="source");if(p==="watch")renderWatch(openCoinKey)}

function saveApiKeys(){["cmc","cg","birdeye","messari"].forEach(k=>{const el=$("key_"+k);if(el)localStorage.setItem("api_"+k,el.value.trim())});loadApiKeys();toast("Ключи сохранены")}
function clearApiKeys(){["cmc","cg","birdeye","messari"].forEach(k=>{localStorage.removeItem("api_"+k);const el=$("key_"+k);if(el)el.value=""});loadApiKeys();toast("Очищено")}
function loadApiKeys(){const labels={cmc:"CoinMarketCap",cg:"CoinGecko",birdeye:"Birdeye",messari:"Messari"},a=[];["cmc","cg","birdeye","messari"].forEach(k=>{const v=localStorage.getItem("api_"+k)||"",el=$("key_"+k);if(el)el.value=v;if(v)a.push(labels[k])});keyStatus.textContent=a.length?"Подключено: "+a.join(", "):"Ключи не загружены."}
async function checkBackend(){try{const r=await fetch("/api/health",{cache:"no-store"});const j=await r.json();backendStatus.textContent=`Backend online · ${j.version||""}`}catch(e){backendStatus.textContent="Backend не отвечает."}}

document.addEventListener("DOMContentLoaded",()=>{
  toastEl=$("toast");
  themeBtn.onclick=()=>{document.body.classList.toggle("light");localStorage.setItem("theme",document.body.classList.contains("light")?"light":"dark");updateThemeIcon()};
  if(localStorage.getItem("theme")==="light")document.body.classList.add("light");updateThemeIcon();updateThemeIcon();
  narrativeBox.onclick=()=>openModal(narrativeModal);
  chainBox.onclick=()=>openModal(chainModal);
  riskBox.onclick=()=>openModal(riskModal);
  modalBackdrop.onclick=closeModals;
  document.querySelectorAll(".topChip").forEach(b=>b.onclick=()=>{const was=b.classList.contains("active");document.querySelectorAll(".topChip").forEach(x=>x.classList.remove("active"));if(!was)b.classList.add("active")});
  document.querySelectorAll(".chainCheck").forEach(x=>x.onchange=e=>{
    const all=[...document.querySelectorAll(".chainCheck")];
    const auto=all.find(v=>v.value==="auto");
    if(e.target.value==="auto"){const on=e.target.checked;all.forEach(v=>v.checked=on)}
    else if(auto){auto.checked=all.filter(v=>v.value!=="auto").every(v=>v.checked)}
    updateChainLabel()
  });
  document.querySelectorAll(".narrativeCheck").forEach(x=>x.onchange=e=>{
    const all=[...document.querySelectorAll(".narrativeCheck")];
    const auto=all.find(v=>v.value==="auto");
    if(e.target.value==="auto"){const on=e.target.checked;all.forEach(v=>v.checked=on)}
    else if(auto){auto.checked=all.filter(v=>v.value!=="auto").every(v=>v.checked)}
    updateNarrativeLabel()
  });
  document.querySelectorAll(".riskOption").forEach(b=>b.onclick=()=>setRisk(b.dataset.risk));
  scanBtn.onclick=scan;resetBtn.onclick=resetAll;
  tabRadar.onclick=()=>showPage("radar");tabWatch.onclick=()=>showPage("watch");tabSource.onclick=()=>showPage("source");
  saveKeysBtn.onclick=saveApiKeys;clearKeysBtn.onclick=clearApiKeys;
  updateChainLabel();updateNarrativeLabel();setRisk("balanced");renderWatch();renderPnlBox();loadApiKeys();checkBackend();
  if(window.scrollTopBtn){scrollTopBtn.onclick=()=>window.scrollTo({top:0,behavior:'smooth'});window.addEventListener('scroll',()=>scrollTopBtn.classList.toggle('show',window.scrollY>420));}
});


/* v7.7.8 Safe RU/EN */
var LR_I18N={
  ru:{
    found:"Найдено",avgScore:"Средний score",sector:"Сектор",chains:"Сети",risk:"Риск",coinPrice:"Цена монеты",anyPrice:lrT("anyPrice"),
    startSearch:"Начать поиск",reset:"Сбросить",radar:"Радар",favorites:"Избранное",sources:"Источники",
    allSectors:"Все сектора",allChains:"Все сети",medium:"Средний",low:"Низкий",high:"Высокий",
    invested:"Вложено",now:"Сейчас",positions:"позиций",noPositions:"Позиции не добавлены.",myPnl:"Мой PnL",
    addPosition:"Сохранить позицию",myPosition:"Моя позиция",positionNotAdded:"позиция не добавлена",
    amount:"Сумма $",entry:"Цена входа",saved:"Позиция сохранена",positionSaved:"Позиция сохранена",
    deleteToChange:"Чтобы изменить позицию, удали её через X и добавь заново.",added:"Добавлено",removed:"Удалено",
    risks:"Риски",rankNone:"Ранг #—",price:"Цена",cap:"Кап",liquidity:"Ликв",marketCap:"Капитализация",
    marketRank:"Ранг рынка",coinPriceFull:"Цена монеты",volume24:"Объём 24ч",growth24:"Рост цены 24ч",
    projectAge:"Возраст проекта",trend:"Тренд",socials:"Соцсети",community:"Комьюнити",backing:"Фонды / backing",
    ecosystem:"Экосистема",narrative:"Нарратив / сектор",checkCG:"проверить CG",checkCMC:"проверить CMC",checkDex:"проверить Dex",
    sideways:"боковик",uptrend:"восходящий",downtrend:"нисходящий",reversal:"разворот",
    aiLayer:"AI Trade Layer",entryZone:"Зона входа",stopZone:"Стоп-зона",target1:"Цель 1",target2:"Цель 2",
    calculatedNote:"Расчёт основан на цене, 24ч движении, ликвидности, объёме, score и рисках.",
    disclaimer:"Это аналитическая оценка, не финансовая рекомендация.",
    dataSourcesTitle:"Источники данных:",apiKeysTitle:"API keys",keysLocalNote:"Ключи сохраняются только в браузере на этом устройстве.",
    saveKeys:"Сохранить ключи",clearKeys:"Очистить",keysNotLoaded:"Ключи не загружены.",keysSaved:"Ключи сохранены.",keysCleared:"Ключи очищены.",
    proMode:"PRO режим",proText:"Архитектура подготовлена под Free/PRO: сейчас PRO-режим не требует оплаты и не блокирует функции.",
    radarReady:"Радар готов к поиску.",chooseParams:"Выбери параметры и нажми «Начать поиск».",
    cmcKey:"CoinMarketCap API Key",cgKey:"CoinGecko API Key",birdeyeKey:"Birdeye API Key",messariKey:"Messari API Key",
    sourcesText:"• DexScreener — пары, сеть, DEX, ликвидность, объём, возраст пары, цена.<br>• CoinGecko — цена, капитализация, логотипы, категории, market data.<br>• CoinMarketCap — listings, ranking, market data, premium data при своём ключе.<br>• GeckoTerminal / DefiLlama / Birdeye / DEXTools / CryptoRank / Messari — подготовлены для расширенного анализа."
  },
  en:{
    found:"Found",avgScore:"Avg score",sector:"Sector",chains:"Chains",risk:"Risk",coinPrice:"Coin price",anyPrice:"Any",
    startSearch:"Start scan",reset:"Reset",radar:"Radar",favorites:"Favorites",sources:"Sources",
    allSectors:"All sectors",allChains:"All chains",medium:"Medium",low:"Low",high:"High",
    invested:"Invested",now:"Now",positions:"positions",noPositions:"No positions added.",myPnl:"My PnL",
    addPosition:"Save position",myPosition:"My position",positionNotAdded:"position not added",
    amount:"Amount $",entry:"Entry price",saved:"Position saved",positionSaved:"Position saved",
    deleteToChange:"To change this position, delete it with X and add it again.",added:"Added",removed:"Removed",
    risks:"Risks",rankNone:"Rank #—",price:"Price",cap:"Cap",liquidity:"Liq",marketCap:"Market cap",
    marketRank:"Market rank",coinPriceFull:"Coin price",volume24:"Volume 24h",growth24:"Price 24h",
    projectAge:"Project age",trend:"Trend",socials:"Socials",community:"Community",backing:"Funds / backing",
    ecosystem:"Ecosystem",narrative:"Narrative / sector",checkCG:"check CG",checkCMC:"check CMC",checkDex:"check Dex",
    sideways:"sideways",uptrend:"uptrend",downtrend:"downtrend",reversal:"reversal",
    aiLayer:"AI Trade Layer",entryZone:"Entry zone",stopZone:"Stop zone",target1:"Target 1",target2:"Target 2",
    calculatedNote:"Calculated from price, 24h move, liquidity, volume, score and risks.",
    disclaimer:"This is an analytical estimate, not financial advice.",
    dataSourcesTitle:"Data sources:",apiKeysTitle:"API keys",keysLocalNote:"Keys are stored only in this browser on this device.",
    saveKeys:"Save keys",clearKeys:"Clear",keysNotLoaded:"No keys loaded.",keysSaved:"Keys saved.",keysCleared:"Keys cleared.",
    proMode:"PRO mode",proText:"Free/PRO architecture is prepared. PRO mode currently does not require payment and does not block features.",
    radarReady:"Radar is ready to scan.",chooseParams:"Choose filters and tap “Start scan”.",
    cmcKey:"CoinMarketCap API Key",cgKey:"CoinGecko API Key",birdeyeKey:"Birdeye API Key",messariKey:"Messari API Key",
    sourcesText:"• DexScreener — pairs, chain, DEX, liquidity, volume, pair age and price.<br>• CoinGecko — price, market cap, logos, categories and market data.<br>• CoinMarketCap — listings, ranking, market data and premium data with your own key.<br>• GeckoTerminal / DefiLlama / Birdeye / DEXTools / CryptoRank / Messari — prepared for extended analysis."
  }
};
let lrLang=localStorage.getItem("lang")||((navigator.language||"").toLowerCase().startsWith("ru")?"ru":"en");
function lrT(k){try{return (LR_I18N&&LR_I18N[lrLang]&&LR_I18N[lrLang][k])||((LR_I18N&&LR_I18N.ru&&LR_I18N.ru[k])||k)}catch(e){return k}}
function lrApplyLang(){
  try{
    document.documentElement.lang=lrLang;
    const lb=document.getElementById("langBtn");
    if(lb)lb.textContent=lrLang==="ru"?"EN":"RU";
    document.querySelectorAll("[data-i18n]").forEach(el=>{
      const val=lrT(el.dataset.i18n);
      if(String(val).includes("<br>")) el.innerHTML=val; else el.textContent=val;
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(el=>{el.placeholder=lrT(el.dataset.i18nPlaceholder)});
    if(window.narrativeBox && /^(Все сектора|All sectors|AUTO \/ все)$/.test(narrativeBox.textContent.trim())) narrativeBox.textContent=lrT("allSectors");
    if(window.chainBox && /^(Все сети|All chains|Любая)$/.test(chainBox.textContent.trim())) chainBox.textContent=lrT("allChains");
    if(window.riskBox && typeof riskMode!=="undefined"){
      const m={conservative:lrT("low"),balanced:lrT("medium"),aggressive:lrT("high")};
      riskBox.textContent=m[riskMode]||lrT("medium");
    }
  }catch(e){console.warn("lang skipped",e)}
}
function lrToggleLang(e){
  if(e){e.preventDefault();e.stopPropagation()}
  lrLang=lrLang==="ru"?"en":"ru";
  localStorage.setItem("lang",lrLang);
  lrApplyLang();
}
document.addEventListener("DOMContentLoaded",()=>{
  const lb=document.getElementById("langBtn");
  if(lb)lb.addEventListener("click",lrToggleLang);
  lrApplyLang();
});

function safeLangRestoreInit(){
  try{
    const lb=document.getElementById("langBtn");
    if(lb && typeof lrToggleLang==="function" && !lb.dataset.safeBound){
      lb.dataset.safeBound="1";
      lb.addEventListener("click", lrToggleLang);
    }
    if(typeof lrApplyLang==="function") lrApplyLang();
    if(typeof applyLang==="function") applyLang();
  }catch(e){console.warn("safe language init skipped",e)}
}
document.addEventListener("DOMContentLoaded", safeLangRestoreInit);
setTimeout(safeLangRestoreInit, 100);


/* v7.8.6 targeted language/UI fixes */
function lrApplyTargetedFixes(){
  try{
    const price=document.getElementById("priceBox");
    if(price){
      const t=(typeof lrLang!=="undefined" && lrLang==="en") ? "Any" : "любая";
      if(price.textContent.trim()==="любая" || price.textContent.trim()==="Any") price.textContent=t;
    }
    const lb=document.getElementById("langBtn");
    if(lb && typeof lrLang!=="undefined") lb.textContent = lrLang==="ru" ? "EN" : "RU";
  }catch(e){}
}
document.addEventListener("DOMContentLoaded",()=>{
  setTimeout(lrApplyTargetedFixes,80);
  const lb=document.getElementById("langBtn");
  if(lb && !lb.dataset.v786Bound){
    lb.dataset.v786Bound="1";
    lb.addEventListener("click",()=>setTimeout(lrApplyTargetedFixes,80));
  }
});



/* v7.8.7 Any translation fix */
function forceCoinPriceTranslation(){
 try{
   const boxes=[...document.querySelectorAll('div,button,span')];
   boxes.forEach(el=>{
     const t=(el.textContent||'').trim();
     if(t==='любая' || t==='Any'){
       el.textContent=(typeof lrLang!=='undefined' && lrLang==='en') ? 'Any' : 'любая';
     }
   });
 }catch(e){}
}
document.addEventListener('DOMContentLoaded',()=>{
 setTimeout(forceCoinPriceTranslation,100);
 setTimeout(forceCoinPriceTranslation,500);
});
setInterval(forceCoinPriceTranslation,1200);
