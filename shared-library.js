// v89: 独立ファイルで動作する静的共有ライブラリ。ユーザーの個人データは送信しない。
let sharedLibrarySets = [];
let sharedLibraryLoaded = false;
let sharedLibraryLoadPromise = null;
let sharedLibrarySelectedSet = "";

async function loadSharedLibraryData(){
  if(sharedLibraryLoaded) return sharedLibrarySets;
  if(sharedLibraryLoadPromise) return sharedLibraryLoadPromise;
  sharedLibraryLoadPromise=(async()=>{
    const status=document.getElementById("sharedLibraryStatus");
    try{
      const response=await fetch("./shared-sets.json",{cache:"no-store"});
      if(!response.ok) throw new Error(`共有ファイルを読み込めませんでした（HTTP ${response.status}）。`);
      const payload=await response.json();
      if(!payload||payload.format!=="manakuru-shared-library"||Number(payload.version)!==1||!Array.isArray(payload.sets)) throw new Error("共有ファイルの形式が正しくありません。");
      sharedLibrarySets=payload.sets.filter(set=>set&&typeof set.id==="string"&&typeof set.title==="string"&&Array.isArray(set.questions)&&set.questions.length>0&&set.questions.length<=MAX&&set.questions.every(q=>q&&typeof q.question==="string"&&typeof q.answer==="string"&&q.question.trim()&&q.answer.trim()));
      if(!sharedLibrarySets.length) throw new Error("共有データに有効な問題集がありません。shared-sets.json を確認してください。");
      sharedLibraryLoaded=true;
      const subjects=[...new Set(sharedLibrarySets.map(s=>String(s.subject||"その他")))].sort((a,b)=>a.localeCompare(b,"ja"));
      const select=document.getElementById("sharedLibrarySubject");
      if(select){const previous=select.value;select.innerHTML='<option value="all">すべての教科</option>'+subjects.map(s=>`<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join(""); if(subjects.includes(previous))select.value=previous;}
      if(status){status.classList.remove("error");status.textContent=`${sharedLibrarySets.length}種類の問題集を読み込みました。気になる問題集を開いて、内容を確認できます。`;}
      document.getElementById("sharedLibraryControls").hidden=false;
      document.getElementById("sharedLibraryCount").hidden=false;
      renderSharedLibraryCards();
      return sharedLibrarySets;
    }catch(error){
      if(status){status.classList.add("error");status.textContent=`共有ライブラリを読み込めませんでした。インターネット接続を確認して、もう一度開いてください。${String(error?.message||"")}`;}
      document.getElementById("sharedLibraryGrid").innerHTML='<button class="action sub" type="button" id="sharedLibraryRetryBtn">もう一度読み込む</button>';
      document.getElementById("sharedLibraryRetryBtn")?.addEventListener("click",()=>{sharedLibraryLoaded=false;sharedLibraryLoadPromise=null;document.getElementById("sharedLibraryGrid").innerHTML="";renderSharedLibrary();});
      throw error;
    }finally{sharedLibraryLoadPromise=null;}
  })();
  return sharedLibraryLoadPromise;
}

function renderSharedLibrary(){
  if(!sharedLibraryLoaded){loadSharedLibraryData().catch(()=>{});return;}
  renderSharedLibraryCards();
}

function renderSharedLibraryCards(){
  const search=(document.getElementById("sharedLibrarySearch")?.value||"").trim().toLocaleLowerCase("ja");
  const subject=document.getElementById("sharedLibrarySubject")?.value||"all";
  const grid=document.getElementById("sharedLibraryGrid");
  const count=document.getElementById("sharedLibraryCount");
  if(!grid||!count)return;
  const filtered=sharedLibrarySets.filter(set=>{
    if(subject!=="all"&&String(set.subject||"その他")!==subject)return false;
    const haystack=[set.title,set.subject,set.grade,set.topic,set.level,set.description,set.author].join(" ").toLocaleLowerCase("ja");
    return !search||haystack.includes(search);
  });
  count.textContent=`${filtered.length}件の問題集`;
  if(!filtered.length){grid.innerHTML='<div class="shared-library-status">条件に合う問題集がありません。検索語や教科を変更してください。</div>';return;}
  grid.innerHTML=filtered.map(set=>{
    const isSelected=sharedLibrarySelectedSet===set.id;
    const preview=isSelected?`<div class="shared-set-preview" aria-label="問題と解答のプレビュー">${set.questions.slice(0,5).map((q,i)=>`<div class="shared-preview-row"><div class="shared-preview-q"><span class="shared-preview-index">${i+1}.</span>${escapeHtml(q.question)}</div><div class="shared-preview-a">答え：${escapeHtml(q.answer)}</div></div>`).join("")}${set.questions.length>5?`<p>ほか${set.questions.length-5}問あります。</p>`:""}<p class="shared-library-count">作成：${escapeHtml(set.author||"不明")} · ${escapeHtml(set.rightsNote||"")}</p></div>`:"";
    return `<article class="shared-set-card" data-shared-set="${escapeHtml(set.id)}"><div class="shared-set-meta"><span class="shared-set-chip">${escapeHtml(set.subject||"その他")}</span><span class="shared-set-chip">${escapeHtml(set.grade||"学年指定なし")}</span><span class="shared-set-chip">${set.questions.length}問</span><span class="shared-set-chip demo">初期サンプル</span></div><h3>${escapeHtml(set.title)}</h3><p>${escapeHtml(set.description||"")}</p><p>単元：${escapeHtml(set.topic||"未分類")} · 難易度：${escapeHtml(set.level||"標準")}</p><div class="shared-set-actions"><button class="action sub" type="button" data-shared-action="preview" data-set-id="${escapeHtml(set.id)}">${isSelected?"プレビューを閉じる":"内容を確認"}</button><button class="action main" type="button" data-shared-action="copy" data-set-id="${escapeHtml(set.id)}">自分の問題集に追加</button></div>${preview}</article>`;
  }).join("");
}

function copySharedSetToPersonalLibrary(setId){
  const shared=sharedLibrarySets.find(set=>set.id===setId);
  if(!shared)return;
  if(!Array.isArray(deckLibrary)){alert("問題集一覧を読み込めません。データ管理からバックアップを確認してください。");return;}
  const proposedTitle=safeDeckTitle(shared.title+"（共有コピー）");
  const name=prompt("自分の問題集に追加します。名前を確認してください。",proposedTitle);
  if(name===null)return;
  const title=safeDeckTitle(name);
  if(!title){alert("問題集名を入力してください。");return;}
  const words=shared.questions.slice(0,MAX).map(q=>`${String(q.question).replace(/[\r\n\t]+/g," ").trim()}\t${String(q.answer).replace(/[\r\n\t]+/g," ").trim()}`).filter(line=>line.split("\t")[0]&&line.split("\t")[1]).join("\n");
  if(!words){alert("取り込める問題がありません。");return;}
  const deck={id:makeDeckId(),title,words,direction:"forward",questionCount:"all",testDate:"",spacedReviewEnabled:true,spacedReviewPausedAt:0,hints:{},redParts:{},redSheetPrintEdits:{},folder:"",archived:false,sortOrder:getNewDeckSortOrder(""),createdAt:Date.now(),updatedAt:Date.now()};
  deckLibrary.push(deck);
  if(!saveDeckLibrary()){
    deckLibrary=deckLibrary.filter(item=>item.id!==deck.id);
    alert("問題集を保存できませんでした。端末の保存領域を確認してください。共有元は変更されていません。");
    return;
  }
  if(!setActiveDeckId(deck.id)){
    alert("問題集は追加しましたが、現在の問題集として設定できませんでした。問題集一覧から開いてください。");
    renderLibrary();
    return;
  }
  // openDeckが新しい問題数に合わせてタグ配列を初期化する。既存セットのタグ状態を誤って流用しない。
  openDeck(deck,false);
  renderLibrary();
  if(typeof renderDataManagement==="function")renderDataManagement();
  switchView("roulette");
  alert(`「${deck.title}」を自分の問題集にコピーしました。\n\n共有ライブラリの元データは変更されません。`);
}

document.getElementById("sharedLibrarySearch")?.addEventListener("input",renderSharedLibraryCards);
document.getElementById("sharedLibrarySubject")?.addEventListener("change",renderSharedLibraryCards);
document.getElementById("sharedLibraryGrid")?.addEventListener("click",event=>{
  const button=event.target.closest("button[data-shared-action]");
  if(!button)return;
  const id=button.dataset.setId;
  if(button.dataset.sharedAction==="preview"){
    sharedLibrarySelectedSet=sharedLibrarySelectedSet===id?"":id;
    renderSharedLibraryCards();
  }else if(button.dataset.sharedAction==="copy")copySharedSetToPersonalLibrary(id);
});

