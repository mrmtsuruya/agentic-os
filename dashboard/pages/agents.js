async function renderAgents() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Agent Registry</h1>
        <p class="page-subtitle">Auto-detect cloud-agent CLIs · 1-click install · auto-remediate</p>
      </div>
      <div class="btn-group">
        <button class="btn btn-primary" onclick="refreshAgents()">🔄 Scan</button>
      </div>
    </div>
    <div id="agentSummary" class="mb-3"></div>
    <div id="agentGrid" class="loading"><div class="loading-spinner"></div></div>
    <div id="agentLogBox" style="margin-top:16px;display:none">
      <div class="card">
        <div class="flex items-center justify-between mb-2">
          <span class="card-title" id="agentLogTitle">Install log</span>
          <button class="btn btn-sm" onclick="document.getElementById('agentLogBox').style.display='none'">✕</button>
        </div>
        <pre id="agentLogText" style="max-height:300px;overflow:auto;font-size:11px;background:var(--bg);padding:10px;border-radius:6px;white-space:pre-wrap"></pre>
      </div>
    </div>
  `;
  await refreshAgents();
}

async function refreshAgents() {
  const grid = document.getElementById('agentGrid');
  const summary = document.getElementById('agentSummary');
  try {
    const data = await api.discoverAgents();
    const agents = data.agents || [];
    summary.innerHTML = `<span class="badge badge-info">${data.online}/${data.total} online</span>`;
    grid.className = '';
    grid.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px">${agents.map(a => {
      const isProvider = a.install_type === 'provider';
      const color = a.status === 'online' ? 'badge-success' : (a.status === 'needs_auth' ? 'badge-warning' : 'badge-danger');
      const label = a.status === 'online' ? 'ONLINE' : (a.status === 'needs_auth' ? 'NEEDS AUTH' : 'MISSING');
      let actions;
      if (isProvider) {
        actions = `<span class="badge badge-neutral">PROVIDER</span>`;
      } else if (a.status === 'missing') {
        actions = `<button class="btn btn-sm btn-primary" onclick="installAgent('${a.name}')">⬇ Install</button>`;
      } else if (a.status === 'needs_auth') {
        actions = `<button class="btn btn-sm" onclick="showToast('Auth: ${a.name}', 'info')">🔑 Auth needed</button>`;
      } else {
        actions = `<button class="btn btn-sm" onclick="fixAgent('${a.name}','stale')">🔧 Reinstall</button>`;
      }
      const note = isProvider ? `<div style="font-size:10px;color:var(--text-muted);margin-top:6px">${escapeHtml(a.provider_note || '')}</div>` : '';
      return `<div class="card">
        <div class="flex items-center justify-between mb-2">
          <span class="card-title">${escapeHtml(a.label)}</span>
          <span class="badge ${color}">${label}</span>
        </div>
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px">tier: ${escapeHtml(a.tier)}</div>
        <div class="flex gap-2">${actions}</div>${note}
      </div>`;
    }).join('')}</div>`;
  } catch (err) {
    grid.className = '';
    grid.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠</div><div class="empty-state-title">${escapeHtml(err.message)}</div></div>`;
  }
}

async function installAgent(name) {
  try {
    const r = await api.installAgent(name);
    if (r.status === 'provider') {
      showToast(r.message || 'Provider-only: no binary to install', 'info');
      return;
    }
    showToast(`Installing ${name}…`, 'success');
    pollAgentLog(name);
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

async function fixAgent(name, kind) {
  try {
    await api.fixAgent(name, kind);
    showToast(`Fixing ${name} (${kind})…`, 'success');
    pollAgentLog(name);
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

let _agentLogTimer = null;
async function pollAgentLog(name) {
  const box = document.getElementById('agentLogBox');
  const txt = document.getElementById('agentLogText');
  document.getElementById('agentLogTitle').textContent = `Log: ${name}`;
  box.style.display = 'block';
  if (_agentLogTimer) clearInterval(_agentLogTimer);
  _agentLogTimer = setInterval(async () => {
    try {
      const r = await api.agentLog(name);
      txt.textContent = (r.log || []).join('\n');
      txt.scrollTop = txt.scrollHeight;
      if (r.log && r.log.some(l => l.startsWith('exit='))) {
        clearInterval(_agentLogTimer);
        setTimeout(refreshAgents, 800);
      }
    } catch {}
  }, 1500);
}
