(() => {
  if (globalThis.__VA_LOADED__) return;
  globalThis.__VA_LOADED__ = true;

  const FIELD_COLORS = ["D1F1FB", "FFE5F2", "FFCDCD", "E2F0D9", "FFF2CC", "ECD9FF"];
  let videoKey = "", data = { records: [], exportedAt: null }, editingId = null;
  let schemaDraft = [], builder = null;
  let capturedSeconds = 0, resumeAfterEditor = false, saveTimer = 0, lastUrl = location.href;

  const adapter = {
    video() { return document.querySelector("video"); },
    getCurrentTime() { return Math.max(0, Math.round(this.video()?.currentTime || 0)); },
    pause() { this.video()?.pause(); },
    play() { this.video()?.play().catch(() => {}); },
    seekTo(seconds) { const v = this.video(); if (v) v.currentTime = seconds; },
    getVideoTitle() {
      if (location.hostname.includes("youtube")) return document.querySelector("h1 yt-formatted-string")?.textContent?.trim() || document.title.replace(/ - YouTube$/, "");
      return document.querySelector("h1.video-title,.video-title")?.textContent?.trim() || document.title.replace(/_哔哩哔哩.*$/, "");
    },
    getVideoId() {
      if (location.hostname.includes("youtube")) return new URL(location.href).searchParams.get("v") || location.pathname;
      return location.pathname.match(/\/(BV[\w]+|av\d+)/i)?.[1] || location.pathname;
    },
    get site() { return location.hostname.includes("youtube") ? "youtube" : "bilibili"; }
  };

  const root = document.createElement("section");
  root.id = "va-root";
  root.className = "va-collapsed";
  root.innerHTML = `
    <div class="va-resize-handle" title="拖动调整面板大小"></div>
    <div class="va-head"><strong>视频批注</strong><span class="va-head-time"></span><button class="va-start" title="记录或调整开始时间">开始</button><button class="va-end" title="记录结束时间">结束</button><button class="va-toggle" title="收起/展开">−</button></div>
    <div class="va-body">
      <div class="va-tools"><button class="va-export">导出 XLSX</button><label class="va-import-label">导入 XLSX<input class="va-import" type="file" accept=".xlsx"></label><button class="va-clear-all">清空</button></div>

      <div class="va-editor va-hidden">
        <div class="va-time-row"><b>开始时间点</b><input class="va-time" aria-label="开始时间点" placeholder="00:00"></div>
        <div class="va-time-row"><b>结束时间点（可选）</b><input class="va-end-time" aria-label="结束时间点（可选）" placeholder="00:00"></div>
        <div class="va-field"><span>批注内容 *</span><textarea class="va-comment" aria-label="批注内容"></textarea></div>
        <div class="va-dynamic-fields"></div>
      <div class="va-schema"><button class="va-add-field">＋ 添加栏</button><div class="va-field-builder va-hidden"></div><p class="va-schema-message" role="status"></p></div>
        <div class="va-actions"><button class="va-cancel">取消</button><button class="va-save">保存</button></div>
      </div>
      <div class="va-status" role="status"></div><div class="va-count"></div><div class="va-list"></div>
    </div>`;
  document.documentElement.appendChild(root);
  const $ = s => root.querySelector(s);
  function updatePanelScale() {
    const scale=Math.min(1.55,Math.max(1,root.offsetWidth/380,root.offsetHeight/680));
    root.style.setProperty("--va-scale",scale.toFixed(3));
    root.style.fontSize=`${(13*scale).toFixed(1)}px`;
  }
  new ResizeObserver(updatePanelScale).observe(root);
  updatePanelScale();

  function formatTime(total) { total=Math.max(0,Math.round(total)); const h=Math.floor(total/3600),m=Math.floor(total%3600/60),s=total%60; return h ? `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}` : `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`; }
  function parseTime(value) { const p=String(value).trim().split(":"); if(!/^\d{1,3}:\d{2}(?::\d{2})?$/.test(value.trim())) return null; const n=p.map(Number); if(n.some(Number.isNaN)||n.slice(1).some(x=>x>59)) return null; return p.length===2?n[0]*60+n[1]:n[0]*3600+n[1]*60+n[2]; }
  function uid() { return crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`; }
  function setStatus(text, good=false) { const e=$(".va-status"); e.textContent=text; e.style.color=good?"#167a3d":"#b42318"; if(text)setTimeout(()=>{if(e.textContent===text)e.textContent=""},4000); }
  function escapeHtml(s) { const d=document.createElement("div"); d.textContent=s??""; return d.innerHTML; }
  function normalizeData(value) {
    const result={records:Array.isArray(value?.records)?value.records:[],fields:Array.isArray(value?.fields)?value.fields.slice():[],exportedAt:value?.exportedAt||null};
    result.records.forEach(r=>r.values ||= {});return result;
  }
  const attr=s=>escapeHtml(s).replace(/"/g,"&quot;");
  const color=c=>/^#[0-9a-f]{6}$/i.test(c)?c:"#ECD9FF";
  function fieldValue(r,f) {return f.type==="select"?f.options.find(o=>o.id===r.values?.[f.id])?.name||"":r.values?.[f.id]||"";}
  function draftValues(){const out={};root.querySelectorAll("[data-value-field]").forEach(el=>{if(el.type!=="radio"||el.checked)out[el.dataset.valueField]=el.value;});return out;}
  function draftColors(){return Object.fromEntries([...root.querySelectorAll("[data-text-color]:checked")].map(el=>[el.dataset.textColor,el.value]));}
  function recordColor(r,f){return textColor(r.colors?.[f.id]??f.color);}
  function renderFields(values={},colors={}) {
    $(".va-dynamic-fields").innerHTML=data.fields.map(f=>`<fieldset class="va-field va-value-label"><legend><span>${escapeHtml(f.name)}</span><span class="va-field-controls" data-field="${f.id}"><button type="button" data-do="edit-field" aria-label="修改${attr(f.name)}">修改</button><button type="button" data-do="delete-field" aria-label="删除${attr(f.name)}">删除</button></span></legend>${f.type==="select"?`<div class="va-options">${[{id:"",name:"不选",color:"#fff9d9"},...f.options].map(o=>`<label style="background:${textColor(o.color)||"#fcfaf5"}"><input type="radio" name="va-value-${f.id}" data-value-field="${f.id}" value="${o.id}" ${(values[f.id]||"")===o.id?"checked":""}>${escapeHtml(o.name)}</label>`).join("")}</div>`:`<textarea data-value-field="${f.id}" aria-label="${attr(f.name)}" style="background:${textColor(colors[f.id]??f.color)||"#fcfaf5"}">${escapeHtml(values[f.id]||"")}</textarea><div class="va-text-color-label" ${values[f.id]?.trim()?"":"hidden"}><span>背景色</span><div class="va-options">${colorChoices(colors[f.id]??f.color,`va-text-color-${f.id}`,`data-text-color="${f.id}"`)}</div></div>`}</fieldset>`).join("");
    root.querySelectorAll("textarea[data-value-field]").forEach(el=>{const area=el.parentElement.querySelector(".va-text-color-label");el.oninput=()=>area.hidden=!el.value.trim();area.querySelectorAll("input").forEach(picker=>picker.onchange=()=>el.style.background=textColor(picker.value)||"#fcfaf5");});
  }

  const palette = FIELD_COLORS;
  const paletteNames = ["蓝色","粉色","红色","绿色","黄色","紫色"];
  function paletteColor(value){const rgb=String(value||"").replace("#","").toUpperCase();return "#"+(palette.includes(rgb)?rgb:palette[5]);}
  function textColor(value){const rgb=String(value||"").replace("#","").toUpperCase();return palette.includes(rgb)?"#"+rgb:"";}
  function colorChoices(selected,name,extra=""){
    const picked=textColor(selected);return ["",...palette.map(c=>"#"+c)].map((c,i)=>`<label style="background:${c||"#fcfaf5"}"><input type="radio" name="${name}" value="${c}" ${extra} ${picked===c?"checked":""}>${i?paletteNames[i-1]:"无"}</label>`).join("");
  }
  function paletteSelect(selected,edit="color"){
    const name=textColor(selected)?paletteNames[palette.indexOf(textColor(selected).slice(1))]:"无";
    return `<details class="va-option-palette"><summary aria-label="选择此选项的颜色" title="选项颜色"><i style="background:${textColor(selected)||"#fcfaf5"}"></i><span>${name}</span></summary><div class="va-options va-color-choices">${colorChoices(selected,uid(),`data-edit="${edit}"`)}</div></details>`;
  }
  function schemaMessage(text){const box=$(".va-schema-message");box.textContent=text;box.hidden=!text;if(text)setTimeout(()=>{if(box.textContent===text){box.textContent="";box.hidden=true;}},3000);}
  function renderSchema() {}
  async function persistFields(fields){
    const values=draftValues(),colors=draftColors(),next=structuredClone(data);next.fields=fields;next.exportedAt=null;
    next.records.forEach(r=>{Object.keys(r.values||{}).forEach(id=>{const f=fields.find(f=>f.id===id),old=data.fields.find(f=>f.id===id);if(!f||old?.type!==f.type||(f.type==="select"&&!f.options.some(o=>o.id===r.values[id]))){delete r.values[id];if(r.colors)delete r.colors[id];}});});
    await chrome.storage.local.set({[videoKey]:next,"va:field-template":fields});data=next;schemaDraft=structuredClone(fields);renderSchema();renderFields(values,colors);render();
  }
  function renderBuilder(){
    const box=$(".va-field-builder");box.classList.toggle("va-hidden",!builder);if(!builder){box.innerHTML="";return;}
    box.innerHTML=`<b>${builder.id?"修改栏":"添加栏"}</b><label>选择类型<select class="va-new-type"><option value="text" ${builder.type==="text"?"selected":""}>文本</option><option value="select" ${builder.type==="select"?"selected":""}>选择（单选）</option></select></label><label>栏位名称<input class="va-new-name" maxlength="40" value="${attr(builder.name)}" placeholder="例如：个人想法"></label>${builder.type==="select"?`${builder.options.map(o=>`<div class="va-option-row" data-builder-option="${o.id}"><input class="va-builder-option-name" placeholder="选项名称" style="background:${textColor(o.color)||"#fcfaf5"}" aria-label="新选项名称" value="${attr(o.name)}" maxlength="80">${paletteSelect(o.color)}<button data-builder-delete="${o.id}" aria-label="删除新选项">×</button></div>`).join("")}<button class="va-builder-add-option">＋ 添加选项</button>`:""}<div class="va-actions"><button class="va-confirm-field">保存</button><button class="va-cancel-field">取消</button></div>`;
    $(".va-new-name").oninput=e=>builder.name=e.target.value;
    $(".va-new-type").onchange=e=>{builder.type=e.target.value;if(builder.type==="select"&&!builder.options.length)builder.options.push({id:uid(),name:"",color:""});renderBuilder();};
    box.querySelectorAll("[data-builder-option]").forEach(row=>{const o=builder.options.find(o=>o.id===row.dataset.builderOption);row.querySelector("input").oninput=e=>o.name=e.target.value;row.querySelectorAll('input[type="radio"]').forEach(el=>el.onchange=e=>{o.color=e.target.value;row.querySelector('.va-builder-option-name').style.background=textColor(o.color)||"#fcfaf5";const picker=row.querySelector('details');picker.querySelector('i').style.background=textColor(o.color)||"#fcfaf5";picker.querySelector('summary span').textContent=o.color?paletteNames[palette.indexOf(o.color.slice(1))]:"无";picker.open=false;});row.querySelector("button").onclick=()=>{builder.options=builder.options.filter(x=>x!==o);renderBuilder();};});
    if(builder.type==="select")$(".va-builder-add-option").onclick=()=>{builder.options.push({id:uid(),name:"",color:""});renderBuilder();};
    $(".va-cancel-field").onclick=()=>{builder=null;renderBuilder();};
    $(".va-confirm-field").onclick=async()=>{const name=builder.name.trim();if(!name||["开始时间点","结束时间点","批注内容",...data.fields.filter(f=>f.id!==builder.id).map(f=>f.name)].includes(name)){schemaMessage("请输入不重复的栏位名称");return;}
      if(builder.type==="select"&&(!builder.options.length||builder.options.some(o=>!o.name.trim())||new Set(builder.options.map(o=>o.name.trim())).size!==builder.options.length)){schemaMessage("请填写至少一个选项，名称不能为空或重复");return;}
      const field={id:builder.id||uid(),name,type:builder.type,options:builder.type==="select"?structuredClone(builder.options).map(o=>({...o,name:o.name.trim()})):[]};
      const fields=data.fields.map(f=>f.id===field.id?field:f);if(!builder.id)fields.push(field);
      try{await persistFields(fields);builder=null;renderBuilder();schemaMessage("已保存");}catch(e){schemaMessage("保存失败："+e.message);}
    };
  }
  $(".va-add-field").onclick=()=>{builder={name:"",type:"text",options:[]};renderBuilder();$(".va-new-type").focus();};
  $(".va-dynamic-fields").onclick=async e=>{
    const btn=e.target.closest("button[data-do]");if(!btn)return;const id=btn.closest("[data-field]").dataset.field;
    if(btn.dataset.do==="edit-field"){builder=structuredClone(data.fields.find(f=>f.id===id));renderBuilder();$(".va-new-name").focus();return;}
    try{await persistFields(data.fields.filter(f=>f.id!==id));if(builder?.id===id){builder=null;renderBuilder();}schemaMessage("已删除");}catch(e){schemaMessage("删除失败："+e.message);}
  };
  function extensionIsActive() { try { return !!chrome.runtime?.id; } catch { return false; } }
  async function saveNow() {
    clearTimeout(saveTimer); if(!videoKey||!extensionIsActive())return;
    try { await chrome.storage.local.set({[videoKey]:data}); } catch (e) { if(extensionIsActive()) throw e; }
  }
  function queueSave() { clearTimeout(saveTimer); saveTimer=setTimeout(saveNow,150); }

  async function switchVideo(force=false) {
    const id=adapter.getVideoId(); if(!id)return;
    const next=`video:${adapter.site}:${id}`; if(!force&&next===videoKey)return;
    await saveNow(); if(!extensionIsActive())return; videoKey=next;
    try { const stored=await chrome.storage.local.get([next,"va:field-template"]);data=normalizeData(stored[next]);if(!stored[next]&&Array.isArray(stored["va:field-template"]))data.fields=structuredClone(stored["va:field-template"]);schemaDraft=structuredClone(data.fields);builder=null;renderBuilder();schemaMessage(""); } catch (e) { if(extensionIsActive()) throw e; return; }
    closeEditor(false); renderSchema(); renderFields(); render();
  }

  function render() {
    data.records.sort((a,b)=>a.timeSeconds-b.timeSeconds||a.createdAt-b.createdAt);
    $(".va-count").textContent=`当前视频：${data.records.length} 条`;
    $(".va-list").innerHTML=data.records.length?data.records.map(r=>`<div class="va-item" data-id="${r.id}"><div class="va-item-main"><button class="va-jump" data-action="jump">${formatTime(r.timeSeconds)}${Number.isFinite(r.endTimeSeconds)?` ~ ${formatTime(r.endTimeSeconds)}`:""}</button><div class="va-text">${escapeHtml(r.comment)}</div></div><div class="va-meta">${data.fields.filter(f=>fieldValue(r,f)).map(f=>`<span class="va-tag" style="background:${f.type==="select"?(textColor(f.options.find(o=>o.id===r.values?.[f.id])?.color)||"transparent"):(recordColor(r,f)||"transparent")}">${escapeHtml(f.name)}：${escapeHtml(fieldValue(r,f))}</span>`).join(" ")}</div><div class="va-item-actions"><button data-action="edit">编辑</button><button data-action="delete">删除</button></div></div>`).join(""):`<div class="va-empty">暂无批注</div>`;
  }

  function startAdd(pauseVideo=true) {
    const v=adapter.video(); if(!v){setStatus("未找到视频播放器");return}
    capturedSeconds=adapter.getCurrentTime(); resumeAfterEditor=pauseVideo&&!v.paused; if(pauseVideo)adapter.pause(); editingId=null;
    root.classList.remove("va-collapsed"); $(".va-editor").classList.remove("va-hidden"); $(".va-time").value=formatTime(capturedSeconds); $(".va-end-time").value=""; $(".va-comment").value=""; renderFields(); $(".va-head-time").textContent=formatTime(capturedSeconds); setTimeout(()=>$(".va-comment").focus(),0);
  }
  function startEdit(id) {
    const r=data.records.find(x=>x.id===id); if(!r)return; editingId=id; capturedSeconds=r.timeSeconds; resumeAfterEditor=false; root.classList.remove("va-collapsed"); $(".va-editor").classList.remove("va-hidden"); $(".va-time").value=formatTime(r.timeSeconds); $(".va-end-time").value=Number.isFinite(r.endTimeSeconds)?formatTime(r.endTimeSeconds):""; $(".va-comment").value=r.comment; renderFields(r.values,r.colors); $(".va-comment").focus();
  }
  function closeEditor(resume=true) { $(".va-editor").classList.add("va-hidden"); editingId=null; if(resume&&resumeAfterEditor)adapter.play(); resumeAfterEditor=false; }
  function saveRecord() {
    const seconds=parseTime($(".va-time").value),endText=$(".va-end-time").value.trim(),endSeconds=endText?parseTime(endText):null,comment=$(".va-comment").value.trim(); if(seconds===null||endText&&endSeconds===null){setStatus("时间格式应为 mm:ss 或 h:mm:ss");return} if(endSeconds!==null&&endSeconds<seconds){setStatus("结束时间不能早于开始时间");return} if(!comment){setStatus("请填写批注内容");$(".va-comment").focus();return}
    const values=draftValues(),colors=draftColors();
    if(editingId){const r=data.records.find(x=>x.id===editingId);Object.assign(r,{timeSeconds:seconds,endTimeSeconds:endSeconds,comment,values,colors})}else data.records.push({id:uid(),timeSeconds:seconds,endTimeSeconds:endSeconds,comment,values,colors,createdAt:Date.now()});
    data.exportedAt=null; queueSave(); render(); closeEditor(true); root.classList.add("va-collapsed");
  }

  async function exportXlsx() {
    if(!data.records.length){setStatus("当前视频没有可导出的批注");return}
    const sorted=data.records.slice().sort((a,b)=>a.timeSeconds-b.timeSeconds),rows=[["开始时间点","结束时间点","批注内容",...data.fields.map(f=>f.name)],...sorted.map(r=>[formatTime(r.timeSeconds),Number.isFinite(r.endTimeSeconds)?formatTime(r.endTimeSeconds):"",r.comment,...data.fields.map(f=>fieldValue(r,f))])];
    const cellFillColors=sorted.map(r=>["","","",...data.fields.map(f=>f.type==="select"?textColor(f.options.find(o=>o.id===r.values?.[f.id])?.color).slice(1):recordColor(r,f).slice(1))]);
    const blob=VAXlsx.write(rows,{cellFillColors,fields:data.fields}),url=URL.createObjectURL(blob),safe=(adapter.getVideoTitle()||"视频").replace(/[\\/:*?"<>|]/g,"_").replace(/[. ]+$/g,"").slice(0,120)||"视频";
    const a=document.createElement("a");a.href=url;a.download=`${safe}_批注.xlsx`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);data.exportedAt=Date.now();await saveNow();setStatus("已导出；本地数据将在 3 天后清理",true);
  }
  function downloadImportTemplate() {
    const blob=VAXlsx.write([["开始时间点","结束时间点","批注内容",...data.fields.map(f=>f.name)]],{fields:data.fields}),url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download="批注导入模板.xlsx";a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
    setStatus("已下载空白导入模板",true);
  }
  async function clearAllRecords() {
    if(!data.records.length){setStatus("当前视频没有批注");return}
    if(!confirm(`确定永久清除当前视频的全部 ${data.records.length} 条批注吗？\n\n此操作无法撤销，请先确认是否需要导出备份。`))return;
    data={records:[],fields:data.fields,exportedAt:null};clearTimeout(saveTimer);await saveNow();closeEditor(false);render();setStatus("已清空当前视频的全部批注",true);
  }
  async function importXlsx(file) {
    try {
      const rows=await VAXlsx.read(file);if(!rows.length)throw Error("表格为空");
      const header=Array.from(rows[0],x=>String(x||"").trim()),base=3;
      if(header.slice(0,3).join("|")!=="开始时间点|结束时间点|批注内容")throw Error("请使用本版本下载的模板，保留前三列固定表头");
      const names=header.slice(base);if(names.some(x=>!x)||new Set(header).size!==header.length)throw Error("表头不能为空或重复");
      const fields=structuredClone(data.fields),mapped=names.map(name=>{let f=fields.find(f=>f.name===name);if(!f){const source=Array.isArray(rows.fields)?rows.fields.find(x=>x.name===name):null;f={id:uid(),name,color:textColor(source?.color),type:source?.type==="select"?"select":"text",options:Array.isArray(source?.options)?source.options.filter(o=>typeof o.name==="string").map(o=>({id:uid(),name:o.name,color:textColor(o.color)||"#fcfaf5"})):[]};fields.push(f);}return f;});
      const added=[],bad=[];rows.slice(1).forEach((row,i)=>{
        if(row.every(x=>!String(x||"").trim()))return;
        const seconds=parseTime(String(row[0]||"").trim().replace(/^'/,"")),endText=String(row[1]||"").trim().replace(/^'/,""),end=endText?parseTime(endText):null,comment=String(row[base-1]||"").trim();
        if(seconds===null||(endText&&end===null)||(end!==null&&end<seconds)||!comment){bad.push(i+2);return;}
        const values={},colors={};mapped.forEach((f,j)=>{const value=String(row[base+j]??"").trim();if(f.type==="select"&&value){let o=f.options.find(o=>o.name===value);if(!o){o={id:uid(),name:value,color:""};f.options.push(o);}values[f.id]=o.id;}else {values[f.id]=value;const fill=rows.cellFillColors?.[i]?.[base+j];colors[f.id]=fill?textColor("#"+fill):"";}});
        added.push({id:uid(),timeSeconds:seconds,endTimeSeconds:end,comment,values,colors,createdAt:Date.now()+i});
      });
      if(added.length){const draft=draftValues();data.fields=fields;data.records.push(...added);data.exportedAt=null;await saveNow();schemaDraft=structuredClone(data.fields);renderSchema();renderFields(draft);render();}
      setStatus(`已导入 ${added.length} 条${bad.length?`；跳过错误行 ${bad.slice(0,8).join(", ")}`:""}`,true);
    }catch(e){setStatus(`导入失败：${e.message}`)}finally{$(".va-import").value="";}
  }

  function captureStartTime(pauseVideo=false) {
    if($(".va-editor").classList.contains("va-hidden")){startAdd(pauseVideo);return}
    const startSeconds=adapter.getCurrentTime();
    $(".va-time").value=formatTime(startSeconds); $(".va-head-time").textContent=formatTime(startSeconds); setStatus("已记录开始时间",true);
  }
  function captureEndTime() {
    if($(".va-editor").classList.contains("va-hidden")){setStatus("请先记录开始时间");return}
    const startSeconds=parseTime($(".va-time").value),endSeconds=adapter.getCurrentTime();
    if(startSeconds===null){setStatus("请先填写有效的开始时间");return true}
    if(endSeconds<startSeconds){setStatus("结束时间不能早于开始时间");return true}
    $(".va-end-time").value=formatTime(endSeconds); $(".va-head-time").textContent=formatTime(endSeconds); setStatus("已记录结束时间；如不需要可清空该字段",true);
  }
  $(".va-start").onclick=()=>captureStartTime(false); $(".va-end").onclick=captureEndTime; $(".va-toggle").onclick=()=>{if(root.classList.contains("va-collapsed")){root.classList.remove("va-collapsed");if($(".va-editor").classList.contains("va-hidden"))startAdd(false);}else root.classList.add("va-collapsed");}; $(".va-save").onclick=saveRecord; $(".va-cancel").onclick=()=>closeEditor(true); $(".va-export").onclick=exportXlsx; $(".va-clear-all").onclick=clearAllRecords;
  $(".va-import-label").addEventListener("click",e=>{if(e.target.classList.contains("va-import"))return;e.preventDefault();if(confirm("是否已有 XLSX 文件？前列为开始时间点、结束时间点、批注内容，后面可添加自定义栏。\n\n确定：选择已有文件\n取消：下载空白模板"))$(".va-import").click();else downloadImportTemplate()});
  $(".va-import").onchange=e=>e.target.files[0]&&importXlsx(e.target.files[0]);
  const drag={active:false,dx:0,dy:0};
  $(".va-head").addEventListener("pointerdown",e=>{if(e.button!==0||e.target.closest("button"))return;const rect=root.getBoundingClientRect();drag.active=true;drag.dx=e.clientX-rect.left;drag.dy=e.clientY-rect.top;root.style.left=`${rect.left}px`;root.style.top=`${rect.top}px`;root.style.right="auto";e.currentTarget.setPointerCapture(e.pointerId);e.preventDefault()});
  $(".va-head").addEventListener("pointermove",e=>{if(!drag.active)return;const maxX=Math.max(0,innerWidth-root.offsetWidth),maxY=Math.max(0,innerHeight-root.offsetHeight);root.style.left=`${Math.min(maxX,Math.max(0,e.clientX-drag.dx))}px`;root.style.top=`${Math.min(maxY,Math.max(0,e.clientY-drag.dy))}px`});
  $(".va-head").addEventListener("pointerup",()=>drag.active=false); $(".va-head").addEventListener("pointercancel",()=>drag.active=false);
  const resize={active:false,startX:0,startY:0,right:0,bottom:0,left:0,top:0};
  $(".va-resize-handle").addEventListener("pointerdown",e=>{if(e.button!==0)return;const rect=root.getBoundingClientRect();resize.active=true;resize.startX=e.clientX;resize.startY=e.clientY;resize.left=rect.left;resize.top=rect.top;resize.right=rect.right;resize.bottom=rect.bottom;root.style.left=`${rect.left}px`;root.style.top=`${rect.top}px`;root.style.right="auto";root.style.width=`${rect.width}px`;root.style.height=`${rect.height}px`;e.currentTarget.setPointerCapture(e.pointerId);e.preventDefault();e.stopPropagation()});
  $(".va-resize-handle").addEventListener("pointermove",e=>{if(!resize.active)return;const minW=280,minH=220;const newLeft=Math.max(0,Math.min(resize.right-minW,resize.left+e.clientX-resize.startX));const newTop=Math.max(0,Math.min(resize.bottom-minH,resize.top+e.clientY-resize.startY));root.style.left=`${newLeft}px`;root.style.top=`${newTop}px`;root.style.width=`${resize.right-newLeft}px`;root.style.height=`${resize.bottom-newTop}px`;updatePanelScale()});
  $(".va-resize-handle").addEventListener("pointerup",()=>resize.active=false); $(".va-resize-handle").addEventListener("pointercancel",()=>resize.active=false);
  $(".va-list").onclick=e=>{const btn=e.target.closest("button[data-action]");if(!btn)return;const id=btn.closest(".va-item").dataset.id,r=data.records.find(x=>x.id===id);if(btn.dataset.action==="jump"&&r){adapter.seekTo(r.timeSeconds);adapter.play()}else if(btn.dataset.action==="edit")startEdit(id);else if(btn.dataset.action==="delete"&&confirm("删除这条批注？")){data.records=data.records.filter(x=>x.id!==id);data.exportedAt=null;queueSave();render()}};
  root.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$(".va-editor").classList.contains("va-hidden")){e.preventDefault();closeEditor(true)}else if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)){e.preventDefault();saveRecord()}});
  chrome.runtime.onMessage.addListener(msg=>{if(msg?.type==="VA_START_ADD")captureStartTime(true)});
  function keepPanelVisibleInFullscreen() {
    const host=document.fullscreenElement||document.webkitFullscreenElement;
    (host||document.documentElement).appendChild(root);
  }
  document.addEventListener("fullscreenchange",keepPanelVisibleInFullscreen);
  document.addEventListener("webkitfullscreenchange",keepPanelVisibleInFullscreen);
  window.addEventListener("beforeunload",e=>{if(data.records.length&&!data.exportedAt){e.preventDefault();e.returnValue=""}});
  setInterval(()=>{if(location.href!==lastUrl){lastUrl=location.href;setTimeout(()=>switchVideo(),800)}else switchVideo()},1200);
  switchVideo(true);
})();
