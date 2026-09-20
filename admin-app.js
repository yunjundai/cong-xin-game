'use strict';
const $=id=>document.getElementById(id);
let offset=0, records=[], total=0;
const money=v=>'NT$'+(v/100).toLocaleString('zh-TW',{maximumFractionDigits:2});
const date=v=>v?new Date(v*1000).toLocaleString('zh-TW'):'未記錄';
const source=r=>r.source==='online_server'?'多人伺服器':'單人回傳（未驗證）';
const text=(tag,value,parent)=>{const el=document.createElement(tag);el.textContent=value;parent.append(el);return el;};
const config=window.BAODAO_CONFIG||{};
let session=null;
async function cloud(path,body,authorized=false){
 if(!config.url||!config.publishableKey)throw Error('尚未設定 Supabase，請先完成部署設定。');
 const headers={'Content-Type':'application/json',apikey:config.publishableKey};
 if(authorized&&session)headers.Authorization='Bearer '+session.access_token;
 const res=await fetch(config.url.replace(/\/$/,'')+path,{method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
 const data=await res.json().catch(()=>({}));
 if(!res.ok){
  if(res.status===401){session=null;$('login').hidden=false;$('dashboard').hidden=true;$('logout').hidden=true;}
  throw Error(res.status===429?'嘗試次數較多，請稍後再試。':res.status===401?'登入已過期，請重新登入。':res.status===403?'此帳號尚未獲得管理者權限。':'無法完成請求，請確認帳密、服務狀態與部署設定。');
 }
 return data;
}
async function api(path,body){
 if(path==='/api/admin/login'){
  session=await cloud('/auth/v1/token?grant_type=password',{email:$('email').value.trim(),password:body.password});
  session.expires_at=Date.now()+session.expires_in*1000;
  try{await cloud('/rest/v1/rpc/admin_game_results',{page_offset:0},true);}catch(e){session=null;throw e;}
  return {};
 }
 if(path==='/api/admin/logout'){
  try{if(session)await cloud('/auth/v1/logout',{},true);}catch(e){/* Clear local access even when offline. */}finally{session=null;}
  return {};
 }
 if(!session)throw Error('請先登入管理者帳號。');
 if(session.expires_at<Date.now()+60000){
  const next=await cloud('/auth/v1/token?grant_type=refresh_token',{refresh_token:session.refresh_token});
  session={...next,expires_at:Date.now()+next.expires_in*1000};
 }
 const query=new URL(path,'https://local.invalid').searchParams;
 return cloud('/rest/v1/rpc/admin_game_results',{search_text:query.get('q')||'',status_filter:query.get('status')||'',page_offset:Number(query.get('offset')||0)},true);
}
async function refresh(silent=false){
 try{
  const query=new URLSearchParams({q:$('query').value,status:$('status').value,source:$('source').value,offset});
  const data=await api('/api/admin/matches?'+query);records=data.items;total=data.total;
  $('login').hidden=true;$('dashboard').hidden=false;$('logout').hidden=false;$('message').textContent=data.import_errors?'部分多人紀錄匯入失敗，請檢查服務紀錄與儲存狀態。':'';
  $('total').textContent=`共 ${total} 場對局`;$('page').textContent=`第 ${Math.floor(offset/25)+1}／${Math.max(1,Math.ceil(total/25))} 頁`;
  $('prev').disabled=offset===0;$('next').disabled=offset+25>=total;$('csv').disabled=!records.length;
  $('matches').replaceChildren();
  $('detail').hidden=true;$('players').replaceChildren();
  for(const r of records){const tr=document.createElement('tr');$('matches').append(tr);
   text('td',date(r.updated_at),tr);text('td',(r.mode==='quick'?'快速局':'標準局')+' · '+source(r),tr);text('td',r.status==='finished'?'已結束':'進行中／未完成',tr);
   text('td',r.players.filter(p=>p.is_human).map(p=>p.nickname).join('、'),tr);text('td',r.turns,tr);
   const td=text('td','',tr),button=text('button','查看每位玩家',td);button.onclick=()=>detail(r);
  }
  if(!records.length){const tr=text('tr','',$('matches'));text('td','目前沒有符合條件的紀錄。',tr).colSpan=6;}
 }catch(e){$('message').textContent=silent?'':e.message;}
}
function detail(r){
 $('detail').hidden=false;$('players').replaceChildren();
 $('matchMeta').textContent=`對局 ${r.match_id} · ${source(r)} · 開始 ${date(r.started_at)} · 最近同步 ${date(r.updated_at)} · 規則 ${r.rules_version} · 金額以新臺幣顯示`;
 for(const p of r.players){const box=text('article','',$('players'));box.className='player';
  text('h3',`${r.status==='finished'?'第':'暫列第'} ${p.rank} 名 · ${p.nickname}`,box);
  text('p',`${p.profession} · ${p.is_human?'真人':'AI'} · ${p.won?'達成自由':p.out?'已出局':r.status==='finished'?'未達標':'遊玩中'}`,box);
  text('small',p.is_human?'匿名編號：'+(p.player_id||'舊版未記錄'):'電腦玩家',box);
  const dl=text('dl','',box);
  for(const [k,v] of [['自由完成度',p.completion.toFixed(1)+'%'],['年齡',p.age+'歲'],['手上現金',money(p.cash)],['月收入',money(p.income)],['被動月收入',money(p.passive)],['月支出',money(p.expenses)],['月現金流',money(p.cashflow)],['淨資產',money(p.net_assets)],['負債',money(p.debt)],['精力投入／上限',p.energy_used+'／'+p.energy_cap]]){text('dt',k,dl);text('dd',v,dl);}
  const assets=text('details','',box);text('summary',`資產 ${p.assets.length} 項`,assets);const ul=text('ul','',assets);
  for(const a of p.assets)text('li',`${a.title}：成本 ${money(a.cost)} · 估值 ${money(a.value)} · 月淨額 ${money(a.monthly_net)} · 精力 ${a.energy}${a.shares?' · '+a.shares+'股':''}`,ul);
  const debts=text('details','',box);text('summary',`負債 ${p.debts.length} 項`,debts);const list=text('ul','',debts);
  const names={personalLoan:'信用貸款',carLoan:'車貸',cardRevolving:'信用卡循環',studentLoan:'學貸',homeMortgage:'自住房貸',businessLoan:'事業貸款',investmentPropertyMortgage:'投資房貸'};
  for(const d of p.debts)text('li',`${names[d.kind]||d.kind}：餘額 ${money(d.balance)} · 月付 ${money(d.monthly_payment)}`,list);
 }
 $('detail').scrollIntoView({behavior:'smooth'});
}
$('loginForm').onsubmit=async e=>{e.preventDefault();try{await api('/api/admin/login',{password:$('password').value});$('password').value='';await refresh();}catch(error){$('message').textContent=error.message;}};
$('logout').onclick=async()=>{try{await api('/api/admin/logout',{});records=[];$('matches').replaceChildren();
  $('detail').hidden=true;$('players').replaceChildren();$('players').replaceChildren();$('detail').hidden=true;$('dashboard').hidden=true;$('logout').hidden=true;$('login').hidden=false;$('message').textContent='已登出';}catch(e){$('message').textContent=e.message;}};
$('filters').onsubmit=e=>{e.preventDefault();offset=0;refresh();};$('prev').onclick=()=>{offset=Math.max(0,offset-25);refresh();};$('next').onclick=()=>{offset+=25;refresh();};$('closeDetail').onclick=()=>$('detail').hidden=true;
$('csv').onclick=()=>{
 const rows=[['對局編號','狀態','資料來源','暱稱','匿名編號','真人／AI','職業','排名','自由完成度%','現金元','月收入元','月支出元','月現金流元','淨資產元','負債元','回合']];
 for(const r of records)for(const p of r.players)rows.push([r.match_id,r.status,source(r),p.nickname,p.player_id,p.is_human?'真人':'AI',p.profession,p.rank,p.completion,p.cash/100,p.income/100,p.expenses/100,p.cashflow/100,p.net_assets/100,p.debt/100,r.turns]);
 const cell=v=>{let s=String(v);if(typeof v==='string'&&/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
 const url=URL.createObjectURL(new Blob(['\ufeff'+rows.map(row=>row.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='從薪開始_本頁遊玩紀錄.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
refresh(true);
