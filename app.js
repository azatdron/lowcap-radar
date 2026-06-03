
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
  coinStore.set(key(c),c);const t=trend(c),score=Number(c._score||0),ch=Number(c.price_change_percentage_24h||0),cap=c.market_cap||c.fdv||0,rs=risks(c),fallback=(c.symbol||"?").slice(0,3).toUpperCase();const img=c.image?`<img class="avatar" src="${c.image}" onerror="this.outerHTML='<div class=&quot;avatar fallback&quot;>${fallback}</div>'">`:`<div class="avatar fallback">${fallback}</div>`;const div=document.createElement("div");div.dataset.coinKey=key(c);div.className="coin "+(watchMode?"watchCard":"radarCard");div.innerHTML=`<button class="miniAction" type="button" aria-label="${watchMode?"Удалить":"Добавить"}">${watchMode?"−":"+"}</button><div class="coinTop">${img}<div class="coinMain"><div class="coinName">${c.name||"Unknown"}</div><div class="coinSub">${(c.symbol||"").toUpperCase()} · ${c._source||"Multi"}</div><div class="trendText">${trendLabel(t.text)}</div></div><div class="trendPill ${trendCls(t)}">${t.icon}</div><div class="score ${score<45?"bad":score<70?"mid":""}">${score}</div></div><div class="badges"><span class="badge ${rs.length?"bad":"good"}">${riskLabel(rs.length)}</span><span class="badge">${c._dexChain||"market"}</span><span class="badge">${narrative(c)}</span><span class="badge rankBadge ${rankBadgeClass(c)}">${rankText(c)}</span><span class="badge ${ch>0?"changeUp":ch<0?"changeDown":"changeFlat"}">24ч ${pct(ch)}</span></div><div class="compactFacts"><span class="compactFact">${tx("price")} ${priceFmt(c.current_price)}</span><span class="compactFact">${tx("cap")} ${fmt(cap)}</span><span class="compactFact">${tx("liquidity")} ${liquidity(c)}</span></div><div class="details"><div class="analysisGrid">${metric(tx("marketCap"),fmt(cap),proof(c,"cap"))}${metric(tx("marketRank"),rankText(c),proof(c,"rank"))}${metric(tx("coinPriceFull"),priceFmt(c.current_price),proof(c,"price"))}${metric(tx("volume24"),fmt(c.total_volume),proof(c,"volume"))}${metric(tx("growth24"),`<span class="${ch>=0?"good":"bad"}">${pct(ch)}</span>`,proof(c,"price"))}${metric(tx("liquidity"),liquidity(c),proof(c,"liquidity"))}${metric(tx("projectAge"),c.age_days?`${c.age_days}${lrLang==="en"?"d":"д"}`:(lrLang==="en"?"no data":"нет данных"),proof(c,"age"))}${metric(tx("trend"),`${t.icon} ${trendLabel(t.text)}`,proof(c,"price"))}${metric(tx("socials"),social(c),c.website?`<a class="proofLink" target="_blank" href="${c.website}">${lrLang==="en"?"open site":"открыть сайт"}</a>`:"")}${metric(tx("community"),community(c),proof(c,"volume"))}${metric(tx("backing"),backing(c),c.backingUrl?`<a class="proofLink" target="_blank" href="${c.backingUrl}">${lrLang==="en"?"proof":"подтверждение"}</a>`:"")}${metric(tx("ecosystem"),ecosystem(c),proof(c,"chain"))}${metric(tx("narrative"),narrative(c),proof(c,"sector"))}</div><div class="explain"><b>${lrLang==="en"?"Why AI picked it:":"Почему AI выбрал:"}</b> ${lrLang==="en"?"market cap":"капитализация"} ${fmt(cap)}, ${lrLang==="en"?"liquidity":"ликвидность"} ${liquidity(c)}, ${lrLang==="en"?"24h volume":"объём 24ч"} ${fmt(c.total_volume)}, ${lrLang==="en"?"move":"движение"} ${pct(ch)}, ${lrLang==="en"?"trend":"тренд"}: ${trendLabel(t.text)}. ${rs.length?((lrLang==="en"?"Risks: ":"Риски: ")+rs.join(", ")):(lrLang==="en"?"No critical risks in available data.":"Критичных рисков по доступным данным нет.")}</div><div class="links compactLinksV19">${c.url?`<a class="linkBtn" target="_blank" href="${c.url}" title="DexScreener">Dex</a>`:""}<a class="linkBtn" target="_blank" rel="noopener" href="${cmcUrl(c)}" title="CoinMarketCap">CMC</a><a class="linkBtn" target="_blank" rel="noopener" href="${cgUrl(c)}" title="CoinGecko">CG</a></div>${watchMode?v19PositionPanel(c):v19TradeMini(c)}</div>`;div.querySelector(".miniAction").onclick=e=>{e.stopPropagation();watchMode?removeWatch(c):addWatch(c)};div.addEventListener("click",e=>{if(e.target.closest("a")||e.target.closest("button")||e.target.closest("input")||e.target.closest(".portfolioBox"))return;div.classList.toggle("open");openCoinKey=div.classList.contains("open")?key(c):null});return div}

async function scan(){found.textContent="—";avg.textContent="—";results.innerHTML='<div class="empty">Сканирую источники...</div>';try{const chains=selectedChains().join(","),sector=selectedNarratives().join(",");const r=await fetch(`/api/scan?chains=${encodeURIComponent(chains)}&sector=${encodeURIComponent(sector)}&risk=${encodeURIComponent(riskMode)}&budget=${encodeURIComponent(budget.value)}`,{cache:"no-store"});if(!r.ok)throw new Error(await r.text());const data=await r.json();let all=dedupe(data.items||[]);if(riskMode==="aggressive")all.sort((a,b)=>riskCount(b)-riskCount(a)||(b._score||0)-(a._score||0));else if(riskMode==="conservative")all.sort((a,b)=>riskCount(a)-riskCount(b)||(b._score||0)-(a._score||0));else all.sort((a,b)=>(b._score||0)-(a._score||0));const tops=selectedTopRanks();if(tops.length){const maxTop=Math.max(...tops);all=all.filter(x=>!x.market_cap_rank||x.market_cap_rank<=maxTop)}all=all.slice(0,25);lastResults=all;found.textContent=all.length;avg.textContent=all.length?Math.round(all.reduce((s,x)=>s+Number(x._score||0),0)/all.length):"—";results.innerHTML="";if(!all.length){results.innerHTML='<div class="empty">Ничего не найдено. Измени фильтры и попробуй снова.</div>'}else all.forEach(c=>results.appendChild(coinCard(c,false)));note.textContent=`Обработано кандидатов: ${data.processed||all.length}. Источники: ${data.sources?.join(" + ")||"backend"}.`}catch(e){results.innerHTML=`<div class="empty">Ошибка поиска: ${String(e.message||e)}</div>`}}

function resetAll(){document.querySelectorAll(".topChip").forEach(x=>x.classList.remove("active"));document.querySelectorAll(".chainCheck,.narrativeCheck").forEach(x=>x.checked=false);budget.value="any";setRisk("balanced");updateChainLabel();updateNarrativeLabel();lastResults=[];found.textContent="0";avg.textContent="—";results.innerHTML='<div class="empty">Радар готов к поиску.</div>';note.textContent='Фильтры сброшены. Результаты очищены.';toast("Сброшено")}

function calcPortfolioPnl(){
  const items=(typeof dedupe==="function"&&typeof watchItems==="function")?dedupe(watchItems()):[];
  let invested=0,current=0,count=0;
  for(const c of items){
    if(typeof coinStore!=="undefined")coinStore.set(key(c),c);
    const t=(typeof v19Totals==="function")?v19Totals(c):null;
    if(t&&t.invested>0){
      invested+=t.invested;
      current+=t.now;
      count++;
    }else{
      const p=typeof getPos==="function"?getPos(c):{};
      const amount=Number((p&&p.amount)||0);
      const entry=Number((p&&p.entry)||0);
      const price=Number(c.current_price||0);
      if(amount>0){
        invested+=amount;
        current+=entry>0&&price>0?amount*(price/entry):amount;
        count++;
      }
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


/* v10 targeted language/UI fixes */
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



/* v10 targeted fix: Coin price label */
function v10ApplyCoinPriceTranslation(){
  try{
    const lang = (typeof lrLang !== "undefined" && lrLang === "en") ? "en" : "ru";
    const wanted = lang === "en" ? "Any" : "любая";
    const candidates = [];
    const byId = document.getElementById("priceBox");
    if(byId) candidates.push(byId);
    document.querySelectorAll("button,div,span").forEach(el=>{
      const txt = (el.textContent || "").trim();
      if(txt === "любая" || txt === "Any") candidates.push(el);
    });
    candidates.forEach(el=>{
      if(el && (el.textContent.trim()==="любая" || el.textContent.trim()==="Any")){
        el.textContent = wanted;
      }
    });
  }catch(e){}
}
document.addEventListener("DOMContentLoaded",()=>{
  setTimeout(v10ApplyCoinPriceTranslation,80);
  setTimeout(v10ApplyCoinPriceTranslation,400);
  const lb=document.getElementById("langBtn");
  if(lb && !lb.dataset.v10AnyFix){
    lb.dataset.v10AnyFix="1";
    lb.addEventListener("click",()=>setTimeout(v10ApplyCoinPriceTranslation,120));
  }
});
setInterval(v10ApplyCoinPriceTranslation,1000);



/* v11 exact Any translation fix */
function forceAnyTranslation(){
  try{
    const isEn = document.body.innerText.includes('Start scan');
    document.querySelectorAll('div,span,button').forEach(el=>{
      const t=(el.textContent||'').trim();
      if(isEn && t==='любая'){
        el.textContent='Any';
      }
      if(!isEn && t==='Any'){
        el.textContent='любая';
      }
    });
  }catch(e){}
}
setInterval(forceAnyTranslation,500);
document.addEventListener('DOMContentLoaded',()=>setTimeout(forceAnyTranslation,200));


/* v19 exact Coin price Any fix */
function v19CoinPriceAnyFix(){
  try{
    const isEnglish = document.body.innerText.includes('Start scan') || document.body.innerText.includes('Found');
    document.querySelectorAll('div,span,button').forEach(el=>{
      const t = (el.textContent || '').trim();
      if(isEnglish && t === 'любая') el.textContent = 'Any';
      if(!isEnglish && t === 'Any') el.textContent = 'любая';
    });
  }catch(e){}
}
document.addEventListener('DOMContentLoaded',()=>{
  setTimeout(v19CoinPriceAnyFix,100);
  setTimeout(v19CoinPriceAnyFix,500);
});
document.addEventListener('click',()=>setTimeout(v19CoinPriceAnyFix,150));
setInterval(v19CoinPriceAnyFix,800);


/* v19 dropdown translation fix */
function v19TranslatePriceDropdown(){
  try{
    const isEnglish = document.body.innerText.includes('Start scan');
    if(!isEnglish) return;

    const map = {
      'любая':'Any',
      'до $0.01':'up to $0.01',
      'до $0.10':'up to $0.10',
      'до $1':'up to $1',
      'до $5':'up to $5',
      'до $10':'up to $10'
    };

    document.querySelectorAll('div,span,button,li,option').forEach(el=>{
      const t=(el.textContent||'').trim();
      if(map[t]){
        el.textContent = map[t];
      }
    });
  }catch(e){}
}
document.addEventListener('click',()=>setTimeout(v19TranslatePriceDropdown,120));
document.addEventListener('DOMContentLoaded',()=>setTimeout(v19TranslatePriceDropdown,300));
setInterval(v19TranslatePriceDropdown,800);


/* v19 Stability + Language Polish */
function v19CurrentLang(){
  try{
    if(typeof lrLang !== "undefined") return lrLang;
    const txt = document.body.innerText || "";
    if(txt.includes("Start scan") || txt.includes("Found") || txt.includes("Coin price")) return "en";
    return "ru";
  }catch(e){ return "ru"; }
}
function v19TranslatePriceTexts(){
  try{
    const lang = v19CurrentLang();
    const toEn = {"любая":"Any","до $0.01":"up to $0.01","до $0.10":"up to $0.10","до $1":"up to $1","до $5":"up to $5","до $10":"up to $10"};
    const toRu = {"Any":"любая","up to $0.01":"до $0.01","up to $0.10":"до $0.10","up to $1":"до $1","up to $5":"до $5","up to $10":"до $10"};
    const map = lang === "en" ? toEn : toRu;
    document.querySelectorAll("button,div,span,li,option").forEach(el=>{
      const t = (el.textContent || "").trim();
      if(map[t]) el.textContent = map[t];
    });
    const priceBox = document.getElementById("priceBox");
    if(priceBox){
      const t = (priceBox.textContent || "").trim();
      if(lang === "en" && t === "любая") priceBox.textContent = "Any";
      if(lang === "ru" && t === "Any") priceBox.textContent = "любая";
    }
  }catch(e){}
}
function v19ApplyStatusLanguage(){
  try{
    const lang = v19CurrentLang();
    document.querySelectorAll("div,span,p").forEach(el=>{
      const t=(el.textContent||"").trim();
      if(lang==="en"){
        if(t==="Радар готов к поиску.") el.textContent="Radar is ready to scan.";
        if(t==="Выбери параметры и нажми «Начать поиск».") el.textContent='Choose filters and tap “Start scan”.';
      }else{
        if(t==="Radar is ready to scan.") el.textContent="Радар готов к поиску.";
        if(t==='Choose filters and tap “Start scan”.') el.textContent="Выбери параметры и нажми «Начать поиск».";
      }
    });
  }catch(e){}
}
function v19ApplyAllPolish(){v19TranslatePriceTexts();v19ApplyStatusLanguage();}
document.addEventListener("DOMContentLoaded",()=>{
  setTimeout(v19ApplyAllPolish,100);
  setTimeout(v19ApplyAllPolish,500);
  const langBtn=document.getElementById("langBtn");
  if(langBtn && !langBtn.dataset.v19Bound){
    langBtn.dataset.v19Bound="1";
    langBtn.addEventListener("click",()=>setTimeout(v19ApplyAllPolish,160));
  }
});
document.addEventListener("click",()=>setTimeout(v19ApplyAllPolish,120));
setInterval(v19ApplyAllPolish,900);



/* v19 Compact Position + Averaging + Refresh */
function v19T(ru,en){try{if(typeof lrLang!=="undefined"&&lrLang==="en")return en;let b=document.body.innerText||"";if(b.includes("Start scan")||b.includes("Found"))return en}catch(e){}return ru}
function v19Fmt(n){n=Number(n||0);if(!isFinite(n))n=0;if(Math.abs(n)>=1000)return "$"+n.toLocaleString(undefined,{maximumFractionDigits:0});if(Math.abs(n)<0.01&&n!==0)return "$"+n.toPrecision(3);return "$"+n.toFixed(2)}
function v19Price(n){n=Number(n||0);if(!isFinite(n)||n===0)return"—";if(Math.abs(n)<0.01)return"$"+n.toPrecision(4);return"$"+n.toFixed(4).replace(/0+$/,"").replace(/\.$/,"")}
function v19PosKey(k){return"posmulti_"+k}
function v19GetBuys(k){try{const multi=JSON.parse(localStorage.getItem(v19PosKey(k))||"[]")||[];if(multi.length)return multi;const old=JSON.parse(localStorage.getItem("pos_"+k)||"null");if(old&&Number(old.amount)>0&&Number(old.entry)>0){const qty=Number(old.qty)||Number(old.amount)/Number(old.entry);return[{qty,entry:Number(old.entry),ts:old.ts||Date.now(),legacy:true}]}return[]}catch(e){return[]}}
function v19SaveBuys(k,a){localStorage.setItem(v19PosKey(k),JSON.stringify(a||[]))}
function v19Totals(c){const k=key(c),buys=v19GetBuys(k),price=Number(c.current_price||0);const qty=buys.reduce((s,x)=>s+Number(x.qty||0),0),invested=buys.reduce((s,x)=>s+Number(x.qty||0)*Number(x.entry||0),0),avg=qty?invested/qty:0,now=qty*price,pnl=now-invested,pct=invested?pnl/invested*100:0;return{buys,qty,invested,avg,now,pnl,pct,price}}
function v19Plan(c){try{const p=(typeof tradePlan==="function")?tradePlan(c):{};return{entry:p.entry||"—",stop:p.stop||"—",t1:p.t1||"—",t2:p.t2||"—",rr:p.rr||"1:1.9"}}catch(e){return{entry:"—",stop:"—",t1:"—",t2:"—",rr:"—"}}}
function v19TradeMini(c){const p=v19Plan(c);return`<div class="tradeMiniV19" onclick="event.stopPropagation()"><h3>${v19T("Торговый план","Trade plan")}</h3><div class="tradeLineV19"><div class="tradeCellV19"><small>${v19T("Вход","Entry")}</small><b>${p.entry}</b></div><div class="tradeCellV19"><small>${v19T("Стоп","Stop")}</small><b>${p.stop}</b></div><div class="tradeCellV19"><small>${v19T("Цель 1","TP1")}</small><b>${p.t1}</b></div><div class="tradeCellV19"><small>${v19T("Цель 2","TP2")}</small><b>${p.t2}</b></div><div class="tradeCellV19"><small>R/R</small><b>${p.rr}</b></div></div><div class="hintV19">${v19T("Аналитический план, не финансовая рекомендация.","Analytical plan, not financial advice.")}</div></div>`}
function v19PositionPanel(c){const k=key(c),sid=(typeof safeId==="function")?safeId(k):k.replace(/[^a-z0-9]/gi,"_"),p=v19Plan(c),t=v19Totals(c),cls=t.pnl>=0?"profit":"loss",arrow=t.pnl>=0?"▲":"▼";const rows=t.buys.map((b,i)=>`<div class="buyRowV19"><span>${Number(b.qty).toLocaleString()} × ${v19Price(b.entry)}</span><b>${v19Fmt(Number(b.qty)*Number(b.entry))}</b><button onclick="event.stopPropagation();v19DeleteBuy('${k}',${i})">×</button></div>`).join("");return`<div class="positionPanelV19" onclick="event.stopPropagation()"><h3>${v19T("План + моя позиция","Plan + My position")}</h3><div class="tradeLineV19"><div class="tradeCellV19"><small>${v19T("Вход","Entry")}</small><b>${p.entry}</b></div><div class="tradeCellV19"><small>${v19T("Стоп","Stop")}</small><b>${p.stop}</b></div><div class="tradeCellV19"><small>TP1</small><b>${p.t1}</b></div><div class="tradeCellV19"><small>TP2</small><b>${p.t2}</b></div><div class="tradeCellV19"><small>R/R</small><b>${p.rr}</b></div></div><div class="posSummaryV19"><div class="top"><span>${v19T("Кол-во","Qty")}: <b>${t.qty?t.qty.toLocaleString():"—"}</b></span><span>${v19T("Средняя","Avg")}: <b>${t.avg?v19Price(t.avg):"—"}</b></span><span>${v19T("Вложено","Invested")}: <b>${v19Fmt(t.invested)}</b></span><span>${v19T("Сейчас","Now")}: <b>${v19Fmt(t.now)}</b></span></div><div class="pnl ${cls}">${arrow} ${v19Fmt(t.pnl)} / ${isFinite(t.pct)?t.pct.toFixed(1):"0.0"}%</div></div><div class="buyFormV19"><input id="qty_${sid}" inputmode="decimal" placeholder="${v19T("Кол-во монет","Coin qty")}"><input id="entry_${sid}" inputmode="decimal" placeholder="${v19T("Цена покупки","Buy price")}" value="${t.price||""}"></div><div class="buyActionsV19"><button class="savePosBtn" onclick="event.stopPropagation();v19AddBuy('${k}')">${v19T("Добавить покупку","Add buy")}</button><button onclick="event.stopPropagation();v19ClearBuys('${k}')">${v19T("Очистить","Clear")}</button></div><div class="buyRowsV19">${rows}</div><div class="hintV19">${v19T("Можно добавлять несколько покупок для усреднения.","Add several buys to average your entry.")}</div></div>`}
function v19AddBuy(k){try{const c=(typeof coinStore!=="undefined"&&coinStore.get(k))||(typeof watchItems==="function"?watchItems().find(x=>key(x)===k):null)||(typeof lastResults!=="undefined"?lastResults.find(x=>key(x)===k):null);const sid=(typeof safeId==="function")?safeId(k):k.replace(/[^a-z0-9]/gi,"_");const qty=Number((document.getElementById("qty_"+sid)||{}).value||0),entry=Number((document.getElementById("entry_"+sid)||{}).value||Number(c&&c.current_price||0));if(qty<=0||entry<=0){if(typeof toast==="function")toast(v19T("Заполни количество и цену","Fill quantity and price"));return}const arr=v19GetBuys(k).filter(x=>!x.legacy);arr.push({qty,entry,ts:Date.now()});v19SaveBuys(k,arr);if(typeof toast==="function")toast(v19T("Покупка добавлена","Buy added"));if(typeof renderWatch==="function")renderWatch(k);if(typeof renderPnlBox==="function")renderPnlBox()}catch(e){}}
function v19DeleteBuy(k,i){const arr=v19GetBuys(k).filter(x=>!x.legacy);arr.splice(i,1);v19SaveBuys(k,arr);if(typeof renderWatch==="function")renderWatch(k);if(typeof renderPnlBox==="function")renderPnlBox()}
function v19ClearBuys(k){localStorage.removeItem(v19PosKey(k));localStorage.removeItem("pos_"+k);if(typeof renderWatch==="function")renderWatch(k);if(typeof renderPnlBox==="function")renderPnlBox()}
function v19RefreshNavIcons(){try{[{id:"tabRadar",i:"⌁",ru:"Радар",en:"Radar"},{id:"tabWatch",i:"★",ru:"Избранное",en:"Favorites"},{id:"tabSource",i:"▣",ru:"Источники",en:"Sources"}].forEach(x=>{const el=document.getElementById(x.id);if(!el)return;const label=v19T(x.ru,x.en);if(el.dataset.v19Label===label)return;el.innerHTML=`<span class="navIconV19">${x.i}</span><span class="navLabelV19">${label}</span>`;el.dataset.v19Label=label})}catch(e){}}
function v19SetupPullRefresh(){try{if(document.getElementById("pullRefreshV19"))return;const pr=document.createElement("div");pr.id="pullRefreshV19";pr.className="pullRefreshV19";pr.innerHTML='<div class="ring"></div>';document.body.appendChild(pr);let y=0,p=false,d=0,b=false;window.addEventListener("touchstart",e=>{if(window.scrollY<=2&&e.touches&&e.touches[0]){y=e.touches[0].clientY;p=true;d=0}},{passive:true});window.addEventListener("touchmove",e=>{if(!p||b||!e.touches||!e.touches[0])return;d=Math.max(0,e.touches[0].clientY-y);if(d>18){pr.classList.add("show");pr.style.setProperty("--pull-rot",Math.min(270,d*3)+"deg")}},{passive:true});window.addEventListener("touchend",()=>{if(!p||b){p=false;return}p=false;if(d>86){b=true;pr.classList.add("show","loading");setTimeout(()=>{try{localStorage.setItem("v19_last_refresh",String(Date.now()));if(typeof lrApplyLang==="function")lrApplyLang();if(typeof v16ApplyAllPolish==="function")v16ApplyAllPolish();v19RefreshNavIcons();if(typeof renderWatch==="function")renderWatch(window.openCoinKey||null);if(typeof renderPnlBox==="function")renderPnlBox();if(typeof startScan==="function"&&(document.body.innerText||"").includes("DexScreener"))startScan()}catch(e){}pr.classList.remove("loading");setTimeout(()=>{pr.classList.remove("show");b=false},260)},520)}else pr.classList.remove("show");d=0},{passive:true})}catch(e){}}
document.addEventListener("DOMContentLoaded",()=>{setTimeout(v19RefreshNavIcons,80);setTimeout(v19SetupPullRefresh,120);setTimeout(()=>{if(typeof renderWatch==="function")renderWatch(window.openCoinKey||null)},300);const lb=document.getElementById("langBtn");if(lb&&!lb.dataset.v19Bound){lb.dataset.v19Bound="1";lb.addEventListener("click",()=>setTimeout(v19RefreshNavIcons,200))}})
document.addEventListener("click",()=>setTimeout(v19RefreshNavIcons,160))



/* v20 Compact Chips Expanded Mode */
var v20ExtraPatchLoaded=true;
function v20xT(ru,en){try{if(typeof lrLang!=="undefined"&&lrLang==="en")return en;const b=document.body.innerText||"";if(b.includes("Start scan")||b.includes("Found"))return en}catch(e){}return ru}
function v20xFmt(n){n=Number(n||0);if(!isFinite(n))n=0;if(Math.abs(n)>=1e9)return"$"+(n/1e9).toFixed(1)+"B";if(Math.abs(n)>=1e6)return"$"+(n/1e6).toFixed(1)+"M";if(Math.abs(n)>=1e3)return"$"+(n/1e3).toFixed(0)+"K";if(Math.abs(n)<0.01&&n!==0)return"$"+n.toPrecision(3);return"$"+n.toFixed(2)}
function v20xTrend(c){const s=String((c&&(c._trend||c.trend))||"").toLowerCase();if(s.includes("up")||s.includes("вос"))return v20xT("тренд ↑","trend ↑");if(s.includes("down")||s.includes("нис"))return v20xT("тренд ↓","trend ↓");if(s.includes("rev")||s.includes("раз"))return v20xT("разворот","reversal");return v20xT("боковик","sideways")}
function v20xChipHtml(c){try{const ch=Number((c&&c.price_change_percentage_24h)||0),cls=ch>0?"good":(ch<0?"bad":""),age=(c&&c.age_days)?`${c.age_days}${v20xT("д","d")}`:"—",vol=(c&&c.total_volume)?v20xFmt(c.total_volume):"—",dex=(c&&(c.dex||c.exchange||c.chain))||"";return`<div class="compactExtraV20" onclick="event.stopPropagation()"><span class="compactChipV20">${v20xT("Объём","Vol")} ${vol}</span><span class="compactChipV20 ${cls}">${v20xT("24ч","24h")} ${isFinite(ch)?(ch>0?"+":"")+ch.toFixed(1)+"%":"—"}</span><span class="compactChipV20">${v20xTrend(c)}</span><span class="compactChipV20">${v20xT("Возраст","Age")} ${age}</span>${dex?`<span class="compactChipV20">${String(dex).slice(0,18)}</span>`:""}</div>`}catch(e){return""}}
function v20xInject(){try{document.querySelectorAll("[data-coin-key]").forEach(card=>{if(!card.classList.contains("open"))return;if(card.querySelector(".compactExtraV20"))return;const k=card.getAttribute("data-coin-key");const c=(typeof coinStore!=="undefined"&&coinStore.get(k))||(typeof watchItems==="function"?watchItems().find(x=>key(x)===k):null)||(typeof lastResults!=="undefined"?lastResults.find(x=>key(x)===k):null);if(!c)return;const details=card.querySelector(".details")||card;const h=document.createElement("div");h.innerHTML=v20xChipHtml(c);const row=h.firstElementChild;const before=details.querySelector(".compactLinksV19,.compactLinksV20,.links,.positionPanelV19");if(before)details.insertBefore(row,before);else details.insertBefore(row,details.firstChild)})}catch(e){}}
function v20xHide(){try{document.querySelectorAll(".coin.open .analysisGrid,.coin.open .metricGrid,.coin.open .metricsGrid,.coin.open .detailGrid,.coin.open .bigMetrics,.coin.open .detailsGrid").forEach(el=>el.style.display="none")}catch(e){}}

document.addEventListener("click",()=>setTimeout(()=>{v20xInject();v20xHide()},120))



/* v21 Chips order + source labels */
function v21T(ru,en){
  try{
    if(typeof lrLang!=="undefined"&&lrLang==="en")return en;
    const b=document.body.innerText||"";
    if(b.includes("Start scan")||b.includes("Found"))return en;
  }catch(e){}
  return ru;
}
function v21Fmt(n){
  n=Number(n||0);
  if(!isFinite(n))n=0;
  if(Math.abs(n)>=1e9)return "$"+(n/1e9).toFixed(1)+"B";
  if(Math.abs(n)>=1e6)return "$"+(n/1e6).toFixed(1)+"M";
  if(Math.abs(n)>=1e3)return "$"+(n/1e3).toFixed(0)+"K";
  if(Math.abs(n)<0.01&&n!==0)return "$"+n.toPrecision(3);
  return "$"+n.toFixed(2);
}
function v21Trend(c){
  const s=String((c&&(c._trend||c.trend))||"").toLowerCase();
  if(s.includes("up")||s.includes("вос"))return v21T("тренд ↑","trend ↑");
  if(s.includes("down")||s.includes("нис"))return v21T("тренд ↓","trend ↓");
  if(s.includes("rev")||s.includes("раз"))return v21T("разворот","reversal");
  return v21T("боковик","sideways");
}
function v21ChipHtml(c){
  try{
    const ch=Number((c&&c.price_change_percentage_24h)||0);
    const age=(c&&c.age_days)?`${c.age_days}${v21T("д","d")}`:"—";
    const vol=(c&&c.total_volume)?v21Fmt(c.total_volume):"—";
    const dex=(c&&(c.dex||c.exchange||c.chain))||"";
    const cls=ch>0?"good":(ch<0?"bad":"");
    return `<div class="compactExtraV21" onclick="event.stopPropagation()">
      <span class="compactChipV21">${v21T("Объём","Vol")} ${vol}</span>
      <span class="compactChipV21 ${cls}">${v21T("24ч","24h")} ${isFinite(ch)?(ch>0?"+":"")+ch.toFixed(1)+"%":"—"}</span>
      <span class="compactChipV21">${v21Trend(c)}</span>
      <span class="compactChipV21">${v21T("Возраст","Age")} ${age}</span>
      ${dex?`<span class="compactChipV21">${String(dex).slice(0,18)}</span>`:""}
    </div>`;
  }catch(e){return ""}
}
function v21FixSourceButtons(card){
  try{
    const links=[...card.querySelectorAll(".links a,.compactLinksV19 a,.compactLinksV20 a,.linkBtn")];
    links.forEach(a=>{
      const href=(a.href||"").toLowerCase();
      if(href.includes("dexscreener")) a.textContent="DS";
      else if(href.includes("coinmarketcap")) a.textContent="CMC";
      else if(href.includes("coingecko")) a.textContent="CG";
    });
    const linksBox=card.querySelector(".links,.compactLinksV19,.compactLinksV20");
    if(linksBox){
      linksBox.classList.add("compactLinksV21");
      const details=card.querySelector(".details")||card;
      const explain=details.querySelector(".explain");
      if(explain && linksBox.parentElement===details){
        details.insertBefore(linksBox, explain.nextSibling);
      }
    }
  }catch(e){}
}
function v21ReorderExpanded(){
  try{
    document.querySelectorAll("[data-coin-key]").forEach(card=>{
      if(!card.classList.contains("open"))return;
      const details=card.querySelector(".details")||card;
      const old=details.querySelector(".compactExtraV20,.compactExtraV21");
      if(old) old.remove();
      const k=card.getAttribute("data-coin-key");
      const c=(typeof coinStore!=="undefined"&&coinStore.get(k))||(typeof watchItems==="function"?watchItems().find(x=>key(x)===k):null)||(typeof lastResults!=="undefined"?lastResults.find(x=>key(x)===k):null);
      if(c){
        const holder=document.createElement("div");
        holder.innerHTML=v21ChipHtml(c);
        const chips=holder.firstElementChild;
        const explain=details.querySelector(".explain");
        if(explain) details.insertBefore(chips, explain);
        else details.insertBefore(chips, details.firstChild);
      }
      v21FixSourceButtons(card);
    });
  }catch(e){}
}

document.addEventListener("click",()=>setTimeout(v21ReorderExpanded,120));



/* v23 Stable Position Render — no flicker */
function v23T(ru,en){
  try{
    if(typeof lrLang!=="undefined" && lrLang==="en") return en;
    const b=document.body.innerText||"";
    if(b.includes("Start scan") || b.includes("Found")) return en;
  }catch(e){}
  return ru;
}
function v23StableCleanup(){
  try{
    document.querySelectorAll("[data-coin-key].open").forEach(card=>{
      const details = card.querySelector(".details") || card;
      const chips = [...details.querySelectorAll(".compactExtraV20,.compactExtraV21")];
      chips.forEach((el,i)=>{ if(i>0) el.remove(); });
      const first = details.querySelector(".compactExtraV20,.compactExtraV21");
      const explain = details.querySelector(".explain");
      if(first && explain) details.insertBefore(first, explain);
      const links = details.querySelector(".compactLinksV21,.compactLinksV20,.compactLinksV19,.links");
      if(links && explain) details.insertBefore(links, explain.nextSibling);
      details.querySelectorAll(".tradeBox,.aiTrade,.tradeLayer").forEach(el=>el.remove());
      const pos = details.querySelector(".positionPanelV19,.positionPanelV20,.positionPanelV21,.tradePositionV18");
      if(pos) pos.dataset.stablePosition = "1";
    });
  }catch(e){}
}
function v23UpdateOnlyPnlNumbers(){
  try{
    if(typeof v19Totals!=="function" || typeof v19Fmt!=="function") return;
    document.querySelectorAll("[data-coin-key].open").forEach(card=>{
      const k=card.getAttribute("data-coin-key");
      const c=(typeof coinStore!=="undefined"&&coinStore.get(k))||
              (typeof watchItems==="function"?watchItems().find(x=>key(x)===k):null)||
              (typeof lastResults!=="undefined"?lastResults.find(x=>key(x)===k):null);
      if(!c)return;
      const t=v19Totals(c);
      const s=card.querySelector(".posSummaryV19,.posSummaryV20");
      if(!s)return;
      const spans=s.querySelectorAll(".top span");
      if(spans[0]) spans[0].innerHTML=`${v23T("Кол-во","Qty")}: <b>${t.qty?t.qty.toLocaleString():"—"}</b>`;
      if(spans[1]) spans[1].innerHTML=`${v23T("Средняя","Avg")}: <b>${t.avg?v19Price(t.avg):"—"}</b>`;
      if(spans[2]) spans[2].innerHTML=`${v23T("Вложено","Invested")}: <b>${v19Fmt(t.invested)}</b>`;
      if(spans[3]) spans[3].innerHTML=`${v23T("Сейчас","Now")}: <b>${v19Fmt(t.now)}</b>`;
      const pnl=s.querySelector(".pnl");
      if(pnl){
        const cls=t.pnl>=0?"profit":"loss";
        pnl.classList.remove("profit","loss");
        pnl.classList.add(cls);
        pnl.textContent=`${t.pnl>=0?"▲":"▼"} ${v19Fmt(t.pnl)} / ${isFinite(t.pct)?t.pct.toFixed(1):"0.0"}%`;
      }
    });
  }catch(e){}
}
function v23RunStablePass(){v23StableCleanup();v23UpdateOnlyPnlNumbers();}
document.addEventListener("DOMContentLoaded",()=>{setTimeout(v23RunStablePass,150);setTimeout(v23RunStablePass,600);});
document.addEventListener("click",()=>{setTimeout(v23RunStablePass,120);setTimeout(v23RunStablePass,500);});
setInterval(v23UpdateOnlyPnlNumbers,5000);

/* lr26 minimal main card + live radar */
function v26T(ru,en){try{if(typeof lrLang!=="undefined"&&lrLang==="en")return en;const b=document.body.innerText||"";if(b.includes("Start scan")||b.includes("Found"))return en}catch(e){}return ru}
function v26N(x){x=Number(x||0);return isFinite(x)?x:0}
function v26Money(x){x=Number(x||0);if(!isFinite(x))x=0;if(Math.abs(x)>=1e9)return"$"+(x/1e9).toFixed(1)+"B";if(Math.abs(x)>=1e6)return"$"+(x/1e6).toFixed(1)+"M";if(Math.abs(x)>=1e3)return"$"+(x/1e3).toFixed(0)+"K";if(Math.abs(x)<0.01&&x!==0)return"$"+x.toPrecision(3);return"$"+x.toFixed(2)}
function v26Price(x){x=Number(x||0);if(!isFinite(x)||x===0)return"—";if(Math.abs(x)<0.01)return"$"+x.toPrecision(4);return"$"+x.toFixed(4).replace(/0+$/,"").replace(/\.$/,"")}
function v26Change(c){return v26N(c&&c.price_change_percentage_24h)}
function v26Score(c){const ch=Math.abs(v26Change(c)),vol=v26N(c&&c.total_volume),liq=v26N(c&&(c.liquidity_usd||c.liquidity||c.liq)),cap=v26N(c&&(c.market_cap||c.mcap));let s=0;s+=Math.min(30,ch*1.15);if(vol>0&&liq>0)s+=Math.min(25,(vol/Math.max(liq,1))*7);if(liq>=50000)s+=12;if(cap>0&&cap<50000000)s+=12;if(cap>=100000&&cap<=15000000)s+=8;if(ch>=7&&ch<=45)s+=10;if(ch>70)s-=12;return Math.max(0,Math.min(100,Math.round(s)))}
function v26Status(c){const s=v26Score(c),ch=v26Change(c);if(s<40)return v26T("Не входить","Avoid");if(s<60)return v26T("Наблюдать","Watch");if(s<75)return ch<0?v26T("Просадка: проверить","Dip: check"):v26T("Возможный вход","Possible entry");if(s<90)return v26T("Сильный сигнал","Strong signal");return v26T("Перегрев, осторожно","Overheated, caution")}
function v26Trend(c){const ch=v26Change(c),t=String((c&&(c._trend||c.trend))||"").toLowerCase();if(t.includes("up")||t.includes("вос")||ch>7)return v26T("восходящий","uptrend");if(t.includes("down")||t.includes("нис")||ch<-7)return v26T("нисходящий","downtrend");return v26T("боковик","sideways")}
function v26Zones(c){const p=v26N(c&&c.current_price);if(!p)return{entry:"—",tp:"—",stop:"—"};return{entry:`${v26Price(p*0.92)}–${v26Price(p*0.97)}`,tp:`${v26Price(p*1.10)} / ${v26Price(p*1.15)} / ${v26Price(p*1.20)}`,stop:v26Price(p*0.88)}}
function v26Url(c,type){try{if(type==="dex"&&c.url)return c.url;if(type==="cmc"&&typeof cmcUrl==="function"){const u=cmcUrl(c);if(u&&u!=="#")return u}if(type==="cg"&&typeof cgUrl==="function"){const u=cgUrl(c);if(u&&u!=="#")return u}const name=encodeURIComponent((c.name||c.symbol||"").toString());if(type==="cmc")return"https://coinmarketcap.com/search/?q="+name;if(type==="cg")return"https://www.coingecko.com/en/search?query="+name}catch(e){}return"#"}
function v26Chart(ch,tf){ch=Number(ch||0);const up=ch>=0;let pts;if(tf==="5m")pts=up?"10,58 45,55 80,61 120,49 165,50 215,42 270,46 330,38":"10,34 45,38 80,33 120,47 165,45 215,55 270,51 330,60";else if(tf==="15m")pts=up?"10,62 45,54 80,58 120,38 165,42 215,20 270,26 330,14":"10,24 45,31 80,26 120,45 165,42 215,58 270,52 330,66";else if(tf==="1h")pts=up?"10,66 55,56 100,60 145,44 190,38 235,30 285,22 330,20":"10,20 55,26 100,28 145,36 190,44 235,53 285,60 330,67";else pts=up?"10,70 60,64 110,55 160,50 210,35 260,28 330,16":"10,18 60,25 110,34 160,42 210,50 260,58 330,70";const col=up?"#22c55e":"#ef4444";return`<svg viewBox="0 0 340 96" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="${col}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><polyline points="${pts} 340,96 0,96" fill="${up?'rgba(34,197,94,.10)':'rgba(239,68,68,.10)'}" stroke="none"/></svg>`}
function v26TfKey(k){return"v26_tf_"+k}
function v26SetTf(k,tf){localStorage.setItem(v26TfKey(k),tf);const card=document.querySelector(`[data-coin-key="${CSS.escape(k)}"]`);if(card){const c=(typeof coinStore!=="undefined"&&coinStore.get(k))||(typeof watchItems==="function"?watchItems().find(x=>key(x)===k):null)||(typeof lastResults!=="undefined"?lastResults.find(x=>key(x)===k):null);if(c){const ch=card.querySelector(".v26Chart");if(ch)ch.innerHTML=v26Chart(v26Change(c),tf);card.querySelectorAll(".v26Tf button").forEach(b=>b.classList.toggle("active",b.dataset.tf===tf))}}}
function v26AiText(c){const cap=v26Money((c&&(c.market_cap||c.mcap))||0),liq=v26Money((c&&(c.liquidity_usd||c.liquidity||c.liq))||0),vol=v26Money((c&&c.total_volume)||0),ch=v26Change(c);return`${v26T("Цена","Price")} ${v26Price(c&&c.current_price)}. ${v26T("Капитализация","Market cap")} ${cap}. ${v26T("Ликвидность","Liquidity")} ${liq}. ${v26T("Объём","Volume")} ${vol}. ${v26T("Движение","Move")} ${(ch>0?"+":"")+ch.toFixed(1)}%. ${v26T("Тренд","Trend")}: ${v26Trend(c)}.`}
function v26Passport(c,k){const z=v26Zones(c),ch=v26Change(c),score=v26Score(c),tf=localStorage.getItem(v26TfKey(k))||"15m";return`<div class="v26Passport" onclick="event.stopPropagation()"><div class="v26Title">${v26T("Информация о монете","Coin info")}</div><div class="v26Stats"><div class="v26Stat"><small>${v26T("Цена","Price")}</small><b>${v26Price(c&&c.current_price)}</b></div><div class="v26Stat"><small>${v26T("Капитализация","Market cap")}</small><b>${v26Money((c&&(c.market_cap||c.mcap))||0)}</b></div><div class="v26Stat"><small>${v26T("Ликвидность","Liquidity")}</small><b>${v26Money((c&&(c.liquidity_usd||c.liquidity||c.liq))||0)}</b></div><div class="v26Stat"><small>${v26T("Объём 24ч","Volume 24h")}</small><b>${v26Money((c&&c.total_volume)||0)}</b></div><div class="v26Stat"><small>${v26T("24ч","24h")}</small><b>${(ch>0?"+":"")+ch.toFixed(1)}%</b></div><div class="v26Stat"><small>${v26T("Ранг","Rank")}</small><b>${c&&c.market_cap_rank?("#"+c.market_cap_rank):"—"}</b></div></div><div class="v26Chart">${v26Chart(ch,tf)}</div><div class="v26Tf">${["5m","15m","1h","4h"].map(x=>`<button data-tf="${x}" class="${tf===x?"active":""}" onclick="event.stopPropagation();v26SetTf('${k}','${x}')">${x}</button>`).join("")}</div><div class="v26Live"><div class="v26LiveTop"><div><div class="v26Status">Live Trade Radar</div><div class="v26Status">${v26Status(c)}</div></div><div class="v26LiveScore">${score}/100</div></div><div class="v26Zones"><div class="v26Zone"><small>${v26T("Зона входа","Entry zone")}</small><b>${z.entry}</b></div><div class="v26Zone"><small>${v26T("Фиксация","Take profit")}</small><b>${z.tp}</b></div><div class="v26Zone"><small>${v26T("Отмена идеи","Invalidation")}</small><b>${z.stop}</b></div><div class="v26Zone"><small>${v26T("Тренд","Trend")}</small><b>${v26Trend(c)}</b></div></div></div><div class="v26Ai"><b>${v26T("AI анализ","AI analysis")}:</b> ${v26AiText(c)}</div><div class="v26Sources"><a target="_blank" rel="noopener" href="${v26Url(c,'dex')}">Dex ↗</a><a target="_blank" rel="noopener" href="${v26Url(c,'cmc')}">CMC ↗</a><a target="_blank" rel="noopener" href="${v26Url(c,'cg')}">CG ↗</a></div></div>`}
function v26MainMetrics(card,c){try{if(!card||!c||card.querySelector(".v26MainMetrics"))return;const ref=card.querySelector(".chips,.badges,.tagRow")||card.querySelector(".details")||card;const div=document.createElement("div");div.className="v26MainMetrics";const ch=v26Change(c);div.innerHTML=`<span class="v26Pill">Price ${v26Price(c.current_price)}</span><span class="v26Pill">Cap ${v26Money((c.market_cap||c.mcap)||0)}</span><span class="v26Pill">Liq ${v26Money((c.liquidity_usd||c.liquidity||c.liq)||0)}</span><span class="v26Pill ${ch>=0?'good':'bad'}">24h ${(ch>0?"+":"")+ch.toFixed(1)}%</span>`;ref.parentNode.insertBefore(div,ref.nextSibling)}catch(e){}}
function v26Decorate(){try{document.querySelectorAll("[data-coin-key]").forEach(card=>{const k=card.getAttribute("data-coin-key");const c=(typeof coinStore!=="undefined"&&coinStore.get(k))||(typeof watchItems==="function"?watchItems().find(x=>key(x)===k):null)||(typeof lastResults!=="undefined"?lastResults.find(x=>key(x)===k):null);if(!c)return;v26MainMetrics(card,c);const name=card.querySelector(".name,.coinName,h3,h2");if(name&&!name.querySelector(".v26ChainLogo")){const chain=String(c.chain||c.platform||"").toLowerCase();if(chain){const badge=document.createElement("span");badge.className="v26ChainLogo";badge.textContent=chain.includes("base")?"BASE":chain.includes("eth")?"ETH":chain.includes("bsc")?"BSC":chain.slice(0,4).toUpperCase();name.appendChild(badge)}}if(card.classList.contains("open")){const details=card.querySelector(".details")||card;if(!details.querySelector(".v26Passport")){details.querySelectorAll(".tradeBox,.aiTrade,.tradeLayer,.positionPanelV19,.positionPanelV20,.positionPanelV21,.tradePositionV18,.portfolioBox,.myPosition,.positionBox,.compactExtraV20,.compactExtraV21,.compactExtraV24,.links,.compactLinksV19,.compactLinksV20,.compactLinksV21,.explain").forEach(el=>el.remove());const d=document.createElement("div");d.innerHTML=v26Passport(c,k);details.insertBefore(d.firstElementChild,details.firstChild)}}})}catch(e){}}
document.addEventListener("DOMContentLoaded",()=>{setTimeout(v26Decorate,200);setTimeout(v26Decorate,800)})
document.addEventListener("click",()=>{setTimeout(v26Decorate,140);setTimeout(v26Decorate,600)})
setInterval(v26Decorate,3000)
