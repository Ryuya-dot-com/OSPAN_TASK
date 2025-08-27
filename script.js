// ====== グローバル変数 ======
const lettersList = ["F", "H", "J", "K", "L", "N", "P", "Q", "R", "S", "T", "Y"];
const mainArea = document.getElementById("mainArea");
let participantName = "";
let startTime = "";
let trialLog = [];
let sessionType = ""; // "practice_letter", "practice_math", "practice_both", "main"
let trialN = 0, totalTrials = 0, setSizes = [];
let ospanScore = 0, lettersCorrectTotal = 0, mathCorrectTotal = 0;

// 時間制限関連の変数
let practiceMathRTs = []; // 練習試行での計算問題回答時間を記録
let mathTimeLimit = null; // 本番での時間制限（ミリ秒）
let currentTimer = null; // タイマーのID

// 統計情報
let totalMathAttempted = 0;
let totalMathCorrect = 0;
let finalMathAccuracy = 0;
let excludedDueToAccuracy = false;

// ====== 画面切り替え ======
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(div => div.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
  mainArea.classList.remove('active');
}
function showMainArea() {
  document.querySelectorAll('.screen').forEach(div => div.classList.remove('active'));
  mainArea.classList.add('active');
}

// ====== シャッフル ======
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

// ====== エントリー処理 ======
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('entryForm').onsubmit = function(e){
    e.preventDefault();
    participantName = document.getElementById('participantName').value.trim();
    if(!participantName){ alert("名前を入力してください。"); return; }
    startTime = new Date().toLocaleString('sv-SE').replace(' ', '_'); // 例: 2025-08-01_18:41:20
    showScreen('screen1');
  };
});

// ====== 時間制限の計算 ======
function calculateMathTimeLimit() {
  if (practiceMathRTs.length === 0) return null;
  
  // 平均と標準偏差を計算
  const mean = practiceMathRTs.reduce((a, b) => a + b, 0) / practiceMathRTs.length;
  const variance = practiceMathRTs.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / practiceMathRTs.length;
  const sd = Math.sqrt(variance);
  
  // 平均 + 2.5SD を時間制限とする
  mathTimeLimit = Math.round(mean + (sd * 2.5));
  
  console.log(`計算問題時間制限設定: 平均=${Math.round(mean)}ms, SD=${Math.round(sd)}ms, 制限=${mathTimeLimit}ms`);
  return mathTimeLimit;
}

// ====== 練習：文字記憶 ======
function proceedPracticeLetter(){
  sessionType = "practice_letter";
  setSizes = [3,4]; trialN = 0; totalTrials = setSizes.length;
  trialLog = [];
  showMainArea();
  practiceLetterFlow();
}
async function practiceLetterFlow(){
  for(trialN=0; trialN<totalTrials; trialN++){
    await doPracticeLetterTrial();
  }
  showPracticeLetterFeedback();
}
async function doPracticeLetterTrial(){
  const setSize = setSizes[trialN];
  let trialData = {
    participant: participantName,
    datetime: startTime,
    session: sessionType,
    trial: trialN+1,
    setSize: setSize,
    letters: [],
    recall: [],
    recallCorrect: 0,
    recallRT: 0
  };
  mainArea.innerHTML = `<b>【文字記憶練習】 試行 ${trialN+1} / ${totalTrials}（${setSize}文字）</b>`;
  await sleep(600);

  // 文字提示
  let presented = [];
  for(let i=0;i<setSize;i++){
    let idx = Math.floor(Math.random()*12);
    presented.push(idx+1);
    mainArea.innerHTML = `<div style="margin:12px 0;">覚えてください</div>
      <div class="big yellow">${lettersList[idx]}</div>`;
    await sleep(850);
    mainArea.innerHTML = '';
    await sleep(240);
  }
  trialData.letters = presented.slice();

  // 再生
  await sleep(500);
  mainArea.innerHTML = `<b>覚えた文字を順番に再現してください</b>`;
  let recallResult = await letterPad(setSize);
  trialData.recall = recallResult.selected;
  trialData.recallRT = recallResult.rt;
  // 正答判定
  let correctCount = 0;
  for(let i=0;i<setSize;i++){
    if (trialData.recall[i] && trialData.recall[i]===trialData.letters[i]) correctCount++;
  }
  trialData.recallCorrect = correctCount;
  trialLog.push(trialData);

  mainArea.innerHTML = `<div class="feedback">
    <div>正答数：${correctCount} / ${setSize}</div>
    </div>
    <button class="btn" id="nextLetterPracticeBtn">次の練習へ</button>`;
  await waitClick('nextLetterPracticeBtn');
}
function showPracticeLetterFeedback(){
  let sum = trialLog.reduce((a,b)=>a+b.recallCorrect,0);
  let total = trialLog.reduce((a,b)=>a+b.setSize,0);
  mainArea.innerHTML = `<b>文字記憶練習 終了</b><br>正答率：${sum}/${total}<br>
    <button class="btn" onclick="proceedPracticeMath()">計算課題練習へ</button>`;
}

// ====== 練習：計算課題のみ ======
function proceedPracticeMath(){
  sessionType = "practice_math";
  setSizes = [2,3]; trialN = 0; totalTrials = setSizes.length;
  trialLog = [];
  practiceMathRTs = []; // 回答時間記録用
  showMainArea();
  practiceMathFlow();
}
async function practiceMathFlow(){
  for(trialN=0; trialN<totalTrials; trialN++){
    await doPracticeMathTrial();
  }
  // 時間制限を計算
  calculateMathTimeLimit();
  showPracticeMathFeedback();
}
async function doPracticeMathTrial(){
  const setSize = setSizes[trialN];
  let trialData = {
    participant: participantName,
    datetime: startTime,
    session: sessionType,
    trial: trialN+1,
    setSize: setSize,
    mathCorrect: [],
    mathRT: [],
    mathTimeout: [] // タイムアウトを記録
  };
  mainArea.innerHTML = `<b>【計算課題練習】 試行 ${trialN+1} / ${totalTrials}（${setSize}問）</b>`;
  await sleep(600);

  for(let i=0;i<setSize;i++){
    let math = generateMathProblem();
    let t0 = performance.now();
    mainArea.innerHTML = `<div style="margin:12px 0;">計算問題を解いてください：</div>
      <div class="big">${math.q}</div>
      <button class="btn" id="readybtn">READY</button>`;
    await waitClick('readybtn');
    let t1 = performance.now();
    mainArea.innerHTML = `<div style="margin:10px 0;">この数字は正解ですか？</div>
      <div class="big">${math.shownAnswer}</div>
      <button class="btn" id="truebtn">TRUE</button>
      <button class="btn" id="falsebtn">FALSE</button>`;
    let mathAns = await waitClick2('truebtn','falsebtn');
    let rt = Math.round(t1-t0);
    let mathIsCorrect = (mathAns==="truebtn" && math.isCorrect) || (mathAns==="falsebtn" && !math.isCorrect);
    
    trialData.mathCorrect.push(mathIsCorrect ? 1 : 0);
    trialData.mathRT.push(rt);
    trialData.mathTimeout.push(0); // 練習では時間切れなし
    
    // 練習試行の回答時間を記録
    practiceMathRTs.push(rt);
    
    await sleep(400);
  }
  trialLog.push(trialData);

  let mathCorr = trialData.mathCorrect.reduce((a,b)=>a+b,0);
  mainArea.innerHTML = `<div class="feedback">
    <div>正答数：${mathCorr} / ${setSize}</div>
    </div>
    <button class="btn" id="nextMathPracticeBtn">次の練習へ</button>`;
  await waitClick('nextMathPracticeBtn');
}
function showPracticeMathFeedback(){
  let sum = trialLog.reduce((a,b)=>a+b.mathCorrect.reduce((x,y)=>x+y,0),0);
  let total = trialLog.reduce((a,b)=>a+b.setSize,0);
  let avgRT = Math.round(practiceMathRTs.reduce((a,b)=>a+b,0) / practiceMathRTs.length);
  
  mainArea.innerHTML = `<b>計算課題練習 終了</b><br>
    正答率：${sum}/${total}<br>
    平均回答時間：${avgRT}ms<br>
    <div class="warning">
      <b>重要：</b> 本番では、計算問題に${mathTimeLimit}ms以上かかると自動的に次へ進みます。
    </div>
    <button class="btn" onclick="proceedPracticeBoth()">課題組み合わせ練習へ</button>`;
}

// ====== 練習：両課題組み合わせ ======
function proceedPracticeBoth(){
  sessionType = "practice_both";
  setSizes = [2,3]; trialN = 0; totalTrials = setSizes.length;
  trialLog = [];
  showMainArea();
  practiceBothFlow();
}
async function practiceBothFlow(){
  for(trialN=0; trialN<totalTrials; trialN++){
    await doPracticeBothTrial();
  }
  showPracticeBothFeedback();
}
async function doPracticeBothTrial(){
  const setSize = setSizes[trialN];
  let trialData = {
    participant: participantName,
    datetime: startTime,
    session: sessionType,
    trial: trialN+1,
    setSize: setSize,
    letters: [],
    mathCorrect: [],
    mathRT: [],
    mathTimeout: [],
    recall: [],
    recallCorrect: 0,
    recallRT: 0
  };
  mainArea.innerHTML = `<b>【組み合わせ練習】 試行 ${trialN+1} / ${totalTrials}（${setSize}セット）</b>`;
  await sleep(600);

  for(let i=0;i<setSize;i++){
    // 計算（時間制限付き）
    let math = generateMathProblem();
    let mathResult = await doMathWithTimeout(math, mathTimeLimit);
    
    trialData.mathCorrect.push(mathResult.correct ? 1 : 0);
    trialData.mathRT.push(mathResult.rt);
    trialData.mathTimeout.push(mathResult.timeout ? 1 : 0);
    
    // 文字
    let letterIdx = Math.floor(Math.random()*12);
    trialData.letters.push(letterIdx+1);
    mainArea.innerHTML = `<div style="margin:12px 0;">覚えてください</div>
      <div class="big yellow">${lettersList[letterIdx]}</div>`;
    await sleep(850);
    mainArea.innerHTML = '';
    await sleep(240);
  }

  // 再生
  await sleep(500);
  mainArea.innerHTML = `<b>覚えた文字を順番に再現してください</b>`;
  let recallResult = await letterPad(setSize);
  trialData.recall = recallResult.selected;
  trialData.recallRT = recallResult.rt;
  // 正答判定
  let correctCount = 0;
  for(let i=0;i<setSize;i++){
    if (trialData.recall[i] && trialData.recall[i]===trialData.letters[i]) correctCount++;
  }
  trialData.recallCorrect = correctCount;
  trialLog.push(trialData);

  let mathCorr = trialData.mathCorrect.reduce((a,b)=>a+b,0);
  let timeouts = trialData.mathTimeout.reduce((a,b)=>a+b,0);
  mainArea.innerHTML = `<div class="feedback">
    <div>計算正答数：${mathCorr}/${setSize}　文字再生正答数：${correctCount}/${setSize}</div>
    ${timeouts > 0 ? `<div class="timeout">時間切れ：${timeouts}回</div>` : ''}
    </div>
    <button class="btn" id="nextBothPracticeBtn">次の練習へ</button>`;
  await waitClick('nextBothPracticeBtn');
}
function showPracticeBothFeedback(){
  mainArea.innerHTML = `<b>組み合わせ練習 終了</b><br>
    <button class="btn" onclick="proceedMainTask()">本番課題へ</button>`;
}

// ====== 本番セッション ======
function proceedMainTask(){
  sessionType = "main";
  setSizes = shuffle([...Array(3).fill(3),...Array(3).fill(4),...Array(3).fill(5),...Array(3).fill(6),...Array(3).fill(7)]);
  trialN = 0; totalTrials = setSizes.length;
  trialLog = [];
  ospanScore = 0; lettersCorrectTotal = 0; mathCorrectTotal = 0;
  totalMathAttempted = 0; totalMathCorrect = 0;
  showMainArea();
  mainflow();
}
async function mainflow(){
  for(trialN=0; trialN<totalTrials; trialN++){
    await doMainTrial();
  }
  // 最終的な計算正答率を計算
  finalMathAccuracy = totalMathAttempted > 0 ? (totalMathCorrect / totalMathAttempted * 100) : 0;
  excludedDueToAccuracy = finalMathAccuracy < 85;
  
  showResult();
}
async function doMainTrial() {
  const setSize = setSizes[trialN];
  let trialData = {
    participant: participantName,
    datetime: startTime,
    session: sessionType,
    trial: trialN+1,
    setSize: setSize,
    letters: [],
    mathCorrect: [],
    mathRT: [],
    mathTimeout: [],
    recall: [],
    recallCorrect: 0,
    recallRT: 0
  };
  mainArea.innerHTML = `<b>【本番】 試行 ${trialN+1} / ${totalTrials}（${setSize}セット）</b>`;
  await sleep(700);

  for (let i=0; i<setSize; i++) {
    // 計算（時間制限付き）
    let math = generateMathProblem();
    let mathResult = await doMathWithTimeout(math, mathTimeLimit);
    
    trialData.mathCorrect.push(mathResult.correct ? 1 : 0);
    trialData.mathRT.push(mathResult.rt);
    trialData.mathTimeout.push(mathResult.timeout ? 1 : 0);
    
    // 統計更新
    totalMathAttempted++;
    if (mathResult.correct) totalMathCorrect++;
    
    // 文字
    let letterIdx = Math.floor(Math.random()*12);
    trialData.letters.push(letterIdx+1);
    mainArea.innerHTML = `<div style="margin:12px 0;">覚えてください</div>
      <div class="big yellow">${lettersList[letterIdx]}</div>`;
    await sleep(800);
    mainArea.innerHTML = '';
    await sleep(220);
  }

  // 再生
  await sleep(600);
  mainArea.innerHTML = `<b>覚えた文字を順番に再現してください</b>`;
  let recallResult = await letterPad(setSize);
  trialData.recall = recallResult.selected;
  trialData.recallRT = recallResult.rt;
  // 正答判定
  let correctCount = 0;
  for(let i=0;i<setSize;i++){
    if (trialData.recall[i] && trialData.recall[i]===trialData.letters[i]) correctCount++;
  }
  trialData.recallCorrect = correctCount;
  
  // スコア加算（完全正答の場合）
  if (trialData.recallCorrect===setSize && trialData.mathCorrect.reduce((a,b)=>a*b,1)===1) {
    ospanScore += setSize;
  }
  lettersCorrectTotal += correctCount;
  mathCorrectTotal += trialData.mathCorrect.reduce((a,b)=>a+b,0);
  trialLog.push(trialData);

  let trialMathErrors = setSize - trialData.mathCorrect.reduce((a,b)=>a+b,0);
  let timeouts = trialData.mathTimeout.reduce((a,b)=>a+b,0);
  let feed = `<div class="feedback">`
    +`<div>文字再生：${correctCount} / ${setSize} 正解</div>`
    +`<div>計算エラー：${trialMathErrors} / ${setSize}</div>`
    + (timeouts > 0 ? `<div class="timeout">時間切れ：${timeouts}回</div>` : '')
    +`</div>`;
  mainArea.innerHTML = feed + `<button class="btn" id="nexttrialbtn">次の試行へ</button>`;
  await waitClick('nexttrialbtn');
}

// ====== 時間制限付き計算問題 ======
function doMathWithTimeout(math, timeLimit) {
  return new Promise(async (resolve) => {
    let t0 = performance.now();
    let timedOut = false;
    let answered = false;
    
    mainArea.innerHTML = `<div style="margin:12px 0;">計算問題を解いてください：</div>
      <div class="big">${math.q}</div>
      <button class="btn" id="readybtn">READY</button>`;
    
    // タイムアウト処理
    if (timeLimit) {
      currentTimer = setTimeout(() => {
        if (!answered) {
          timedOut = true;
          mainArea.innerHTML = `<div class="timeout">時間切れ！次へ進みます。</div>`;
          setTimeout(() => {
            resolve({ correct: false, rt: timeLimit, timeout: true });
          }, 1000);
        }
      }, timeLimit);
    }
    
    // READY待ち
    await waitClickWithCondition('readybtn', () => !timedOut);
    
    if (timedOut) return;
    
    let t1 = performance.now();
    mainArea.innerHTML = `<div style="margin:10px 0;">この数字は正解ですか？</div>
      <div class="big">${math.shownAnswer}</div>
      <button class="btn" id="truebtn">TRUE</button>
      <button class="btn" id="falsebtn">FALSE</button>`;
    
    let mathAns = await waitClick2WithCondition('truebtn','falsebtn', () => !timedOut);
    
    if (timedOut) return;
    
    answered = true;
    if (currentTimer) clearTimeout(currentTimer);
    
    let rt = Math.round(t1-t0);
    let mathIsCorrect = (mathAns==="truebtn" && math.isCorrect) || (mathAns==="falsebtn" && !math.isCorrect);
    
    await sleep(400);
    resolve({ correct: mathIsCorrect, rt: rt, timeout: false });
  });
}

// ====== 条件付きクリック待ち ======
function waitClickWithCondition(btnid, condition) {
  return new Promise(r => {
    const btn = document.getElementById(btnid);
    if (!btn) return;
    btn.onclick = () => {
      if (condition()) r();
    };
  });
}

function waitClick2WithCondition(btn1, btn2, condition) {
  return new Promise(r => {
    const b1 = document.getElementById(btn1);
    const b2 = document.getElementById(btn2);
    if (!b1 || !b2) return;
    b1.onclick = () => { if (condition()) r(btn1); };
    b2.onclick = () => { if (condition()) r(btn2); };
  });
}

// ====== 文字入力パッド ======
function letterPad(setSize) {
  return new Promise(resolve=>{
    let selected=[], selectedBtns=[], t0=performance.now();
    mainArea.innerHTML = `<div style="margin-bottom:10px;">覚えている順番で文字をクリックしてください。分からない文字は「？」を、間違えた入力は「⌫」で消せます。</div>
      <div id="pad"></div>
      <div id="selview" style="min-height:38px; margin:12px 0 10px 0; font-size:1.2em;"></div>
      <button class="btn" id="donebtn">完了</button>`;
    // パッド作成
    let padHTML = '';
    for(let i=0;i<4;i++){
      padHTML+='<div class="padrow">';
      for(let j=0;j<3;j++){
        let idx = i*3+j;
        if(idx<12) padHTML+=`<button class="padbtn" data-idx="${idx+1}">${lettersList[idx]}</button>`;
      }
      padHTML+='</div>';
    }
    padHTML+='<div class="padrow">';
    padHTML+=`<button class="padbtn" data-idx="13">？</button>`;
    padHTML+=`<button class="padbtn" data-idx="del">⌫</button>`;
    padHTML+='</div>';
    document.getElementById('pad').innerHTML = padHTML;

    // 選択表示
    function updateSelView(){
      let text = selected.map(i=>i==='13'?'？':i==='del'?'':lettersList[i-1]).join('　');
      document.getElementById('selview').innerHTML = `<span class="tosmall">選択中:</span> <b>${text}</b>`;
    }
    updateSelView();

    // パッド操作
    document.querySelectorAll('.padbtn').forEach(btn=>{
      btn.onclick = function(){
        let val = btn.getAttribute('data-idx');
        if(val==='del'){
          selected.pop(); selectedBtns.pop();
          updateSelView();
        }else if(selected.length<setSize){
          selected.push(val); selectedBtns.push(btn);
          updateSelView();
        }
      }
    });
    // 完了ボタン
    document.getElementById('donebtn').onclick = ()=>{
      let out = selected.map(x=>x==='13'?null:Number(x)); // ？はnull
      resolve({selected: out, rt: Math.round(performance.now()-t0)});
    };
  });
}

// ====== 計算問題生成 ======
function generateMathProblem() {
  let answer=0, tries=0, op1, op2, d1, d2, d3, shownAnswer, isCorrect, str;
  while ((answer<1 || answer>9) && tries<500) {
    op1 = Math.random()<0.5 ? "×" : "÷";
    op2 = Math.random()<0.5 ? "+" : "-";
    d1 = [2,4,6,8,10][Math.floor(Math.random()*5)];
    d2 = [1,2][Math.floor(Math.random()*2)];
    d3 = [1,5][Math.floor(Math.random()*2)];
    let v1 = op1==="×" ? d1*d2 : d1/d2;
    answer = op2==="+" ? v1+d3 : v1-d3;
    if (Math.abs(answer-Math.round(answer))>0.01) answer=0; //整数のみ
    tries++;
  }
  answer = Math.round(answer);
  isCorrect = Math.random()<0.5;
  shownAnswer = isCorrect ? answer : ([...Array(9)].map((_,i)=>i+1).filter(x=>x!==answer))[Math.floor(Math.random()*8)];
  str = `( ${d1} ${op1} ${d2} ) ${op2} ${d3} = ?`;
  return {q:str, answer, shownAnswer, isCorrect};
}

// ====== Sleep関数 ======
function sleep(ms) { return new Promise(r=>setTimeout(r, ms)); }

// ====== クリック待ちPromise ======
function waitClick(btnid) { return new Promise(r=>document.getElementById(btnid).onclick=()=>r()); }
function waitClick2(btn1,btn2){return new Promise(r=>{
  document.getElementById(btn1).onclick=()=>r(btn1);document.getElementById(btn2).onclick=()=>r(btn2);
});}

// ====== 結果集計 ======
function showResult(){
  let totalMath = trialLog.reduce((a,b)=>a+(b.mathCorrect?b.setSize:0),0);
  let mathCorr = trialLog.reduce((a,b)=>a+(b.mathCorrect?b.mathCorrect.reduce((x,y)=>x+y,0):0),0);
  let letterCorr = trialLog.reduce((a,b)=>a+(b.recallCorrect?b.recallCorrect:0),0);
  let totalTimeouts = trialLog.reduce((a,b)=>a+(b.mathTimeout?b.mathTimeout.reduce((x,y)=>x+y,0):0),0);
  let mathAcc = totalMath>0 ? Math.round(mathCorr/totalMath*100) : "-";
  let letterAcc = totalMath>0 ? Math.round(letterCorr/totalMath*100) : "-";
  let perfectTrials = trialLog.filter(t=>t.session==="main"&&t.recallCorrect===t.setSize&&t.mathCorrect&&t.mathCorrect.reduce((a,b)=>a*b,1)===1).length;

  let resHTML = `<div class="resultblock"><b>【本番 結果・フィードバック】</b><br>
  <div>・文字と計算の両課題が正解だった完全正答試行数：<span class="score">${perfectTrials} 回</span></div>
  <div>・計算問題の正答率：<span class="score">${mathAcc}%</span></div>
  <div>・文字列記憶の正答率：<span class="score">${letterAcc}%</span></div>
  <div>・時間切れ回数：<span class="score">${totalTimeouts} 回</span></div>
  <div style="margin-top:18px;">・OSPANスコア：<span class="score">${ospanScore}</span></div>`;
  
  // 85%閾値チェック
  if (excludedDueToAccuracy) {
    resHTML += `<div class="error">
      <b>注意：</b> 計算問題の正答率が${Math.round(finalMathAccuracy)}%で、85%の基準を下回っています。
      このデータは分析から除外される可能性があります。
    </div>`;
  } else {
    resHTML += `<div style="margin-top:10px; color: green;">✓ 計算問題正答率が85%以上の基準を満たしています。</div>`;
  }
  
  resHTML += `</div>
  <button class="btn" onclick="downloadResultCSV()">結果をCSVでダウンロード</button>
  <button class="btn" onclick="location.reload()">もう一度やる</button>`;
  mainArea.innerHTML = resHTML;
}

// ====== 結果CSVダウンロード ======
function downloadResultCSV() {
  // CSVヘッダー
  const header = [
    "participant","datetime","session","trial","setSize",
    "letters_sequence","math_correct_array","math_rt_array","math_timeout_array",
    "recall_array","recall_correct","recall_rt",
    "ospan_score","math_accuracy_percent","letter_accuracy_percent",
    "math_time_limit_ms","excluded_due_to_accuracy"
  ];
  
  // 各試行の統計を計算
  let mathAccuracy = totalMathAttempted > 0 ? Math.round((totalMathCorrect/totalMathAttempted)*100) : 0;
  let letterTotal = trialLog.filter(t=>t.session==="main").reduce((a,b)=>a+b.setSize,0);
  let letterCorrect = trialLog.filter(t=>t.session==="main").reduce((a,b)=>a+b.recallCorrect,0);
  let letterAccuracy = letterTotal > 0 ? Math.round((letterCorrect/letterTotal)*100) : 0;
  
  // CSVデータ
  const rows = trialLog.map(trial=>[
    trial.participant || "",
    trial.datetime || "",
    trial.session || "",
    trial.trial || "",
    trial.setSize || "",
    trial.letters ? trial.letters.join("-") : "",
    trial.mathCorrect ? trial.mathCorrect.join("-") : "",
    trial.mathRT ? trial.mathRT.join("-") : "",
    trial.mathTimeout ? trial.mathTimeout.join("-") : "",
    trial.recall ? trial.recall.map(x=>x===null?"?":x).join("-") : "",
    trial.recallCorrect || "",
    trial.recallRT || "",
    // 全体統計（本番試行のみ）
    trial.session === "main" ? ospanScore : "",
    trial.session === "main" ? mathAccuracy : "",
    trial.session === "main" ? letterAccuracy : "",
    trial.session === "main" ? mathTimeLimit : "",
    trial.session === "main" ? (excludedDueToAccuracy ? "YES" : "NO") : ""
  ]);
  
  let csv = header.join(",") + "\n" + rows.map(r=>r.join(",")).join("\n");
  
  // サマリー情報を追加
  csv += "\n\n--- SUMMARY ---\n";
  csv += `Total OSPAN Score,${ospanScore}\n`;
  csv += `Math Accuracy,${mathAccuracy}%\n`;
  csv += `Letter Accuracy,${letterAccuracy}%\n`;
  csv += `Math Time Limit,${mathTimeLimit}ms\n`;
  csv += `Total Timeouts,${trialLog.reduce((a,b)=>a+(b.mathTimeout?b.mathTimeout.reduce((x,y)=>x+y,0):0),0)}\n`;
  csv += `Excluded Due to Low Accuracy,${excludedDueToAccuracy ? "YES" : "NO"}\n`;
  csv += `Perfect Trials,${trialLog.filter(t=>t.session==="main"&&t.recallCorrect===t.setSize&&t.mathCorrect&&t.mathCorrect.reduce((a,b)=>a*b,1)===1).length}\n`;
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ospan_results_${participantName}_${startTime.replace(/[^0-9]/g,"")}.csv`;
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{URL.revokeObjectURL(url); a.remove();}, 500);
}
