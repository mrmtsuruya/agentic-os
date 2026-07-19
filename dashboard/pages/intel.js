async function renderIntel() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Intelligence</h1>
        <p class="page-subtitle">World-aware signals · knowledge graph · trust-gated plugins</p>
      </div>
      <div class="btn-group">
        <button class="btn btn-primary btn-sm" onclick="intelRefresh()">🔄 Refresh intel</button>
        <button class="btn btn-ghost btn-sm" onclick="intelResearchPrompt()">🔎 Research</button>
      </div>
    </div>
    <div class="page-header-left mt-3"><h3>📡 External Signals</h3><span class="page-subtitle">competitor · CVE · regulation · release — scored into the Brief</span></div>
    <div id="intelFeed"><div class="loading"><div class="loading-spinner"></div></div></div>
    <div class="page-header-left mt-3"><h3>🕸 Knowledge Graph</h3><span class="page-subtitle">capability + lineage lookup (Graphify)</span></div>
    <div class="flex gap-2 mb-2">
      <input class="form-input" id="graphQ" placeholder="agent or module name…" style="max-width:320px">
      <button class="btn btn-sm" onclick="graphLookup()">Lookup</button>
      <button class="btn btn-sm" onclick="graphBuild()">Re-index repo</button>
    </div>
    <div id="graphBox"><div class="empty-state"><div class="empty-state-desc">Run a lookup or re-index the repo.</div></div></div>
    <div class="page-header-left mt-3"><h3>🔌 Plugins</h3><span class="page-subtitle">signed · versioned · sandboxed — trust gate enforced</span></div>
    <div id="pluginBox"><div class="loading"><div class="loading-spinner"></div></div></div>
  `;
  await loadIntelFeed();
  await loadPlugins();
}

async function loadIntelFeed() {
  const box = document.getElementById('intelFeed');
  try {
    const r = await api.intelSignals();
    const s = r.signals || [];
    if (!s.length) { box.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📡</div><div class="empty-state-title">No external signals yet</div><div class="empty-state-desc">Refresh to collect, or add a research query.</div></div>`; return; }
    const sev = v => `<span class="badge ${v==='critical'?'badge-danger':v==='high'?'badge-warning':v==='medium'?'badge-info':'badge-neutral'}">${v}</span>`;
    box.innerHTML = `<ul style="list-style:none;padding:0;margin:0;display:grid;gap:8px">${s.map(x => `
      <li class="brief-row sev-${x.severity}">
        <span>${sev(x.severity)}</span>
        <span style="flex:1"><b>${escapeHtml(x.title)}</b> <span style="font-size:10px;color:var(--text-muted)">· ${escapeHtml(x.kind)} · ${escapeHtml(x.source||'seed')}</span><br><span style="font-size:12px;color:var(--text-secondary)">${escapeHtml(x.summary||'')}</span></span>
        ${x.confidence_delta ? `<span class="badge ${x.confidence_delta<0?'badge-danger':'badge-success'}">${x.confidence_delta>0?'+':''}${x.confidence_delta}</span>`:''}
      </li>`).join('')}</ul>`;
  } catch (e) { box.innerHTML = `<div class="empty-state"><div class="empty-state-title">${escapeHtml(e.message)}</div></div>`; }
}

async function intelRefresh() {
  try { const r = await api.intelRefresh(); showToast(`Intel refreshed: ${r.collected||0} signals`, 'success'); loadIntelFeed(); }
  catch (e) { showToast(e.message, 'error'); }
}

async function intelResearchPrompt() {
  const q = prompt('Research query (tracked as a research signal):');
  if (!q) return;
  try { await api.intelResearch(q); showToast('Research tracked', 'success'); loadIntelFeed(); }
  catch (e) { showToast(e.message, 'error'); }
}

async function graphLookup() {
  const q = document.getElementById('graphQ').value.trim();
  if (!q) return;
  const box = document.getElementById('graphBox');
  try {
    const r = await api.intelGraphLookup(q);
    const nodes = r.nodes || [];
    const caps = r.capabilities || (r.nodes && r.nodes.find(n=>n.kind==='agent'));
    box.innerHTML = `<div class="card"><div class="card-title">“${escapeHtml(q)}” — ${nodes.length} node(s)</div>
      ${nodes.map(n=>`<div style="font-size:13px;margin:4px 0"><span class="badge badge-neutral">${escapeHtml(n.kind)}</span> <b>${escapeHtml(n.name)}</b> ${n.meta&&n.meta.loc?`<span style="color:var(--text-muted)">· ${n.meta.loc} LOC</span>`:''}</div>`).join('')}
      ${r.capabilities?`<div style="margin-top:6px;font-size:12px;color:var(--text-secondary)">Capabilities: ${escapeHtml(JSON.stringify(r.capabilities))}</div>`:''}
    </div>`;
  } catch (e) { box.innerHTML = `<div class="empty-state"><div class="empty-state-title">${escapeHtml(e.message)}</div></div>`; }
}

async function graphBuild() {
  const box = document.getElementById('graphBox');
  try { const r = await api.intelGraphBuild(); showToast(`Graph: ${r.nodes||0} nodes, ${r.edges||0} edges`, 'success'); box.innerHTML = `<div class="card"><div class="card-title">Re-indexed</div><div class="card-text">${r.nodes||0} nodes · ${r.edges||0} edges</div></div>`; }
  catch (e) { showToast(e.message, 'error'); }
}

async function loadPlugins() {
  const box = document.getElementById('pluginBox');
  try {
    const [pl, au] = await Promise.all([api.intelPlugins(), api.intelPluginAudit()]);
    const list = pl.plugins || [];
    box.innerHTML = `<div class="flex gap-2 mb-2">${au.blocked&&au.blocked.length?`<span class="badge badge-danger">${au.blocked.length} blocked (unsigned)</span>`:''}<span class="badge badge-success">${au.enabled||0} enabled</span><span class="badge badge-neutral">${au.total||0} total</span></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px">${list.map(p=>`
        <div class="card" data-signed="${!!p.signature}">
          <div class="flex items-center justify-between"><span class="card-title">${escapeHtml(p.name)}</span><span class="badge ${p.enabled?'badge-success':'badge-neutral'}">${p.enabled?'enabled':'off'}</span></div>
          <div style="font-size:11px;color:var(--text-muted)">v${escapeHtml(p.version)} · ${escapeHtml(p.author||'—')} · ${p.signature?'signed':'UNSIGNED'}</div>
          <div style="font-size:12px;margin:6px 0">${escapeHtml((p.capabilities||[]).join(', ')||'—')}</div>
          ${p.enabled
            ? `<button class="btn btn-sm" onclick="intelTogglePlugin('${p.id}',false)">Disable</button>`
            : `<button class="btn btn-sm ${p.signature?'':'btn-danger'}" onclick="intelTogglePlugin('${p.id}',true)">${p.signature?'Enable':'Enable (blocked)'}</button>`}
        </div>`).join('')}</div>`;
  } catch (e) { box.innerHTML = `<div class="empty-state"><div class="empty-state-title">${escapeHtml(e.message)}</div></div>`; }
}

async function intelTogglePlugin(id, enable) {
  try {
    if (enable) await api.intelEnablePlugin(id); else await api.intelDisablePlugin(id);
    showToast(enable?'plugin enabled':'plugin disabled', 'success');
  } catch (e) { showToast(e.message, 'error'); }
  loadPlugins();
}
