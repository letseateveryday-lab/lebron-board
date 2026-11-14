"use strict";
// SECURITY: all remote data is rendered via text nodes / textContent. No innerHTML, no eval.
(function(){
const TABS=[["ov","Overview"],["pos","Open Positions"],["scan","Scanner"],["hist","History"],["tape","Tape"],["rules","Rules"]];
let cur=(location.hash||"#ov").slice(1),S=null,MF=new Set();if(!TABS.some(t=>t[0]===cur))cur="ov";
const MINT=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
function h(tag,attrs){const e=document.createElement(tag);if(attrs)for(const k in attrs){const v=attrs[k];if(v==null)continue;if(k==="cls")e.className=v;else if(k==="on")e.addEventListener("click",v);else if(k==="href"){if(/^https:\/\/(dexscreener\.com|solscan\.io)\//.test(v))e.setAttribute("href",v)}else e.setAttribute(k,String(v))}
for(let i=2;i<arguments.length;i++)add(e,arguments[i]);return e}
function add(e,c){if(c==null||c===false)return;if(Array.isArray(c)){c.forEach(x=>add(e,x));return}e.appendChild(c instanceof Node?c:document.createTextNode(String(c)))}
const T=(cls,txt)=>h("span",{cls},txt);
const num=(v,d=2)=>v==null||isNaN(v)?"—":Number(v).toFixed(d);
const usd=v=>v==null?"—":(v<0?"-$":"$")+Math.abs(v).toFixed(2);
const sg=(v,d=2,pre="$")=>v==null?T("mut","—"):T(v>0?"up":v<0?"dn":"mut",(v>0?"+":v<0?"-":"")+pre+Math.abs(v).toFixed(d));
const pc=(v,d=1)=>v==null?T("mut","—"):T(v>0?"up":v<0?"dn":"mut",(v>0?"+":"")+Number(v).toFixed(d)+"%");
const K=v=>v==null?"—":v>=1e6?"$"+(v/1e6).toFixed(2)+"M":v>=1e3?"$"+(v/1e3).toFixed(1)+"K":"$"+Math.round(v);
const px=v=>!v?"—":v>=1?"$"+v.toFixed(4):"$"+v.toPrecision(4);
const tm=s=>s?new Date(s).toLocaleString("en-US",{timeZone:"America/Detroit",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false}):"—";
const hm=s=>s?new Date(s).toLocaleTimeString("en-US",{timeZone:"America/Detroit",hour:"2-digit",minute:"2-digit",hour12:false}):"—";
const dur=m=>m==null?"—":m<60?Math.round(m)+"m":(m/60).toFixed(1)+"h";
const age=x=>x==null?"—":x<1?Math.round(x*60)+"m":x<48?x.toFixed(1)+"h":(x/24).toFixed(1)+"d";
function links(m){if(!m||!MINT.test(m))return null;return[h("a",{cls:"lk",href:"https://dexscreener.com/solana/"+m,target:"_blank",rel:"noopener noreferrer"},"DS"),h("a",{cls:"lk",href:"https://solscan.io/token/"+m,target:"_blank",rel:"noopener noreferrer"},"Solscan")]}
const tok=t=>h("div",null,T("sym",t.sym||"?"),links(t.mint),t.mint?T("sub mono",t.mint.slice(0,4)+"…"+t.mint.slice(-4)):null);
function F(node,ts,src,force){const a=ts?(new Date(S.now)-new Date(ts))/1e3:null,st=force||a==null||a>S.max_age;const w=h("span",{cls:st?"stl":null,title:(src||"")+(ts?" · "+tm(ts)+" ET · "+Math.round(a)+"s old":" · no timestamp")},node);return st?[w,T("stag","stale")]:w}
const card=(l,v,i)=>h("div",{cls:"card"},h("small",null,l),h("b",null,v),i!=null?h("i",null,i):null);
function table(cols,rows){return h("div",{cls:"tw"},h("table",null,h("tr",null,cols.map(c=>h("th",null,c))),rows.map(r=>h("tr",null,r.map(c=>h("td",null,c))))))}
function curve(){const el=document.getElementById("cv");if(!el||!S.curve.length)return;const W=el.clientWidth,H=220,r=window.devicePixelRatio||1;el.width=W*r;el.height=H*r;const x=el.getContext("2d");x.scale(r,r);
const d=S.curve.filter(p=>p[0]&&p[1]),ys=d.map(p=>p[1]),st=S.acct.start||ys[0],mn=Math.min(...ys,st)*.998,mx=Math.max(...ys,st)*1.002,t0=d[0][0],t1=d[d.length-1][0];
const X=t=>40+(W-50)*(t-t0)/Math.max(1,t1-t0),Y=v=>10+(H-30)*(1-(v-mn)/(mx-mn||1));x.fillStyle="#7c859b";x.font="10px sans-serif";x.strokeStyle="#232838";
for(let i=0;i<=4;i++){const v=mn+(mx-mn)*i/4;x.beginPath();x.moveTo(40,Y(v));x.lineTo(W,Y(v));x.stroke();x.fillText("$"+v.toFixed(2),2,Y(v)+3)}
x.beginPath();d.forEach((p,i)=>i?x.lineTo(X(p[0]),Y(p[1])):x.moveTo(X(p[0]),Y(p[1])));x.strokeStyle=ys[ys.length-1]>=st?"#2ee59d":"#ff5470";x.lineWidth=1.6;x.stroke()}
const R={
ov(){const a=S.acct;return[S.halt?h("div",{cls:"banner"},"Trading halted: "+S.halt):null,
h("div",{cls:"grid"},card("Mode",T("yel",S.mode),"simulated money"),card("Equity",usd(a.equity),["drawdown from peak ",pc(a.dd_from_peak,2)]),card("Cash",usd(a.cash)),card("Start",usd(a.start)),
card("PnL today",sg(a.pnl_today),["realized ",sg(a.realized_today)]),card("PnL all-time",sg(a.pnl_all),["unrealized ",sg(a.upnl)]),card("Open",String(S.positions.length)+" / "+(S.rules.max_open??"?")),
card("SOL / USD",F(usd(S.sol.v),S.sol.ts,"price feed")),card("Holder data fresh",S.holder_cov||"—"),card("Pairs scanned",String(S.seen??"—"),"last cycle "+hm(S.cycle_ts)+" ET")),
h("h3",null,"Equity curve (ET)"),h("canvas",{id:"cv"}),
h("h3",null,"Data sources"),table(["Source","Status","Last OK (ET)"],S.sources.map(s=>[s.name,h("span",{cls:"pill "+(s.ok?"ok":"no")},s.ok?"ok":"fail"),F(tm(s.ts),s.ts,s.name)])),
h("h3",null,"Stats"),h("div",{cls:"grid"},card("Closes (all)",String(S.stats.all.n??0),(S.stats.all.wins??0)+"W / "+(S.stats.all.losses??0)+"L"),card("Win rate",S.stats.all.wr==null?"—":num(S.stats.all.wr,1)+"%"),card("Realized (all)",sg(S.stats.all.pnl)),card("Best / worst",[sg(S.stats.all.best)," / ",sg(S.stats.all.worst)]))]},
pos(){if(!S.positions.length)return h("div",{cls:"card mut"},"No open positions.");return[S.stale_marks.length?h("div",{cls:"banner"},"Stale marks: "+S.stale_marks.join(", ")):null,
table(["Token","Held","Entry","Mark","Multiple","Peak","Unrealized","Value","Left","TPs","Hard stop","Trail","Liq","MCap","5m / 1h / 24h","Exit impact","Score"],S.positions.map(p=>[tok(p),[dur(p.held_min),T("sub",tm(p.entry))],[px(p.entry_px),T("sub",usd(p.cost))],
F(p.mark_ok?px(p.px):"no quote",p.mark_ts,"Jupiter quote",!p.mark_ok),F(T(p.x>=1?"up":"dn",num(p.x)+"x"),p.mark_ts,"Jupiter quote"),num(p.peak_x)+"x",[sg(p.upnl),T("sub",(p.upnl_pct>=0?"+":"")+num(p.upnl_pct,1)+"%")],usd(p.value),num(p.left_pct,0)+"%",
p.tps.map(t=>h("span",{cls:"pill "+(t.hit?"ok":"ne")},t.mult+"x")),px(p.hard_px),p.trail_px?px(p.trail_px):T("mut","after TP1"),K(p.liq),K(p.mcap),[pc(p.chg_m5)," ",pc(p.chg_h1)," ",pc(p.chg_h24)],p.mark_impact==null?"—":num(p.mark_impact,2)+"%",num(p.score,0)]))]},
scan(){if(!S.top.length)return h("div",{cls:"card mut"},"No candidates this cycle.");const r=S.rules;return[h("div",{cls:"mut"},"Buys need score ≥ "+r.buy_score+" for "+r.persist_cycles+" cycles in a row, mint & freeze revoked, LP locked ≥ "+r.min_lp_locked_pct+"%, top 10 < "+r.max_top10_pct+"%. Greyed = older than "+S.max_age+"s."),h("br"),
table(["Token","Age","Price","MCap","Liq","Vol 24h","5m","1h","24h","Holders","Top10","LP locked","Score","Streak","Status","Signals"],S.top.map(t=>{const fr=t.fresh||{},g=(k,n)=>F(n,fr[k]&&fr[k].ts,fr[k]&&fr[k].src,fr[k]&&fr[k].stale);
const st=[h("span",{cls:"pill "+(t.action==="BUY"?"ok":t.action==="avoid"?"no":"wa")},(t.action||"").toUpperCase()),t.veto?h("span",{cls:"pill no"},t.veto):null,(t.fatal||[]).map(x=>h("span",{cls:"pill no"},x))];
return[tok(t),age(t.age_h),g("price",px(t.price)),g("mcap",K(t.mcap)),g("liq_vol_age",K(t.liq)),g("liq_vol_age",K(t.vol_h24)),pc(t.chg_m5),pc(t.chg_h1),pc(t.chg_h24),g("top10",t.holders==null?"—":String(t.holders)),
g("top10",t.top10==null?"—":num(t.top10,1)+"%"),g("lp",t.lp==null?"—":num(t.lp,0)+"%"),num(t.score,0),(t.streak??0)+"/"+r.persist_cycles,st,(t.signals||[]).map(x=>h("span",{cls:"pill ne"},x))]}))]},
hist(){const a=S.stats.all;return[h("div",{cls:"grid"},card("Closes",String(a.n??0),(a.wins??0)+"W / "+(a.losses??0)+"L"),card("Win rate",a.wr==null?"—":num(a.wr,1)+"%","PF "+(a.pf==null?"—":num(a.pf))),card("Realized",sg(a.pnl)),card("Avg win / loss",[sg(a.avg_win)," / ",sg(a.avg_loss)])),
h("h3",null,"Exit reasons"),h("div",null,Object.entries(a.exits||{}).map(([k,v])=>h("span",{cls:"pill ne"},k+": "+v))),h("h3",null,"Closed trades"),
S.closed.length?table(["Token","Opened","Closed","Duration","Cost","Proceeds","PnL","PnL %","Peak","TPs","Exit"],S.closed.map(c=>[tok(c),tm(c.entry),tm(c.exit),dur(c.dur_min),usd(c.cost),usd(c.proceeds),sg(c.pnl),pc(c.pnl_pct),num(c.peak_x)+"x",String(c.tps??0),h("span",{cls:"pill ne"},c.why||"")])):h("div",{cls:"card mut"},"No closed trades yet.")]},
tape(){const tags=["BUY","SELL","TP","STOP","TRAIL","VETO","WATCH","HALT","ERROR","SYSTEM"],cnt={};S.tape.forEach(e=>cnt[e.tag]=(cnt[e.tag]||0)+1);const vis=S.tape.filter(e=>!MF.size||MF.has(e.tag));
return[h("div",{cls:"mfil"},tags.map(t=>h("button",{cls:"mf"+(MF.has(t)?" on":""),on:()=>{MF.has(t)?MF.delete(t):MF.add(t);render()}},t+" "+(cnt[t]||0)))),
h("div",{cls:"mbox",id:"mbox"},vis.length?vis.map(e=>h("div",{cls:"mline "+e.tag},T("t",hm(e.t1)+" ET"),T("k",e.tag),h("span",{cls:"x"},e.text,e.sym&&e.mint?links(e.mint):null,e.n>1?T("rep","×"+e.n+" since "+hm(e.t0)):null))):h("div",{cls:"mut"},"Tape is quiet."))]},
rules(){const r=S.rules,row=(k,v)=>[h("span",null,k),h("span",{cls:"mono"},v)];return h("div",{cls:"kv"},
row("Buy score","≥ "+r.buy_score+", held "+r.persist_cycles+" cycles"),row("Max market cap",K(r.max_mcap)),row("Min liquidity",K(r.min_liq_usd)),row("Max pair age",r.max_age_h+"h"),row("Max top-10 holders",r.max_top10_pct+"%"),
row("Min LP locked",r.min_lp_locked_pct+"%"),row("Max price impact",r.max_price_impact_pct+"%"),row("Size per trade",r.equity_pct_per_trade+"% of equity"),row("Max open",String(r.max_open)),
row("Take profits",(r.partials||[]).map(p=>p[0]+"x sells "+Math.round(p[1]*100)+"%").join(", ")),row("Trailing stop",r.trail_from_peak_pct+"% off peak after TP1"),row("Hard stop",r.hard_stop_pct+"%"),row("Daily loss halt",r.daily_loss_pct+"%"))}};
function hdr(){const a=S.acct,e=document.getElementById("hdr");e.replaceChildren(h("div",{cls:"logo"},"CADE",T(null,"/trenches")),h("span",{cls:"badge"},S.mode),
...[["Equity",usd(a.equity)],["Today",sg(a.pnl_today)],["All-time",sg(a.pnl_all)],["Open",String(S.positions.length)],["Halt",S.halt||"none"]].map(([l,v])=>h("div",{cls:"hk"},h("small",null,l),h("b",null,v))),
h("div",{cls:"mut"},"updated "+tm(S.now)+" ET"))}
function nav(){document.getElementById("nav").replaceChildren(...TABS.map(([k,l])=>h("button",{cls:k===cur?"on":null,on:()=>{cur=k;history.replaceState(null,"","#"+k);nav();render()}},l)))}
function render(){if(!S)return;hdr();const m=document.getElementById("main"),sc=[...m.querySelectorAll(".tw,.mbox")].map(e=>[e.scrollTop,e.scrollLeft]);m.replaceChildren(h("div",null,R[cur]()));
[...m.querySelectorAll(".tw,.mbox")].forEach((e,i)=>{if(sc[i]){e.scrollTop=sc[i][0];e.scrollLeft=sc[i][1]}});if(cur==="ov")curve()}
async function poll(){try{const r=await fetch("./data.json",{cache:"no-store",credentials:"omit"});const d=await r.json();if(d&&d.acct){S=d;if(!window.getSelection().toString())render()}}catch(e){}setTimeout(poll,30000)}
window.addEventListener("resize",()=>{if(cur==="ov"&&S)curve()});nav();poll();
})();
