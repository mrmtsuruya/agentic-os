async function renderPanels() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Brainstorm Panel</h1>
        <p class="page-subtitle">Fan one prompt out to every online agent · compare side-by-side</p>
      </div>
    </div>
    <div class="card mb-3">
      <div class="form-group">
        <label class="form-label">Your prompt</label>
        <textarea id="panelPrompt" class="form-textarea" style="min-height:90px" placeholder="Ask all agents the same thing..."></textarea>
      </div>
      <div class="flex items-center gap-2">
        <button class="btn btn-primary" onclick="runBroadcast()">🚀 Broadcast to all online agents</button>
        <span id="panelStatus" class="badge badge-info">idle</span>
      </div>
    </div>
    <div id="panelResults"><div class="empty-state"><div class="empty-state-icon">💡</div><div class="empty-state-title">No broadcast yet</div></div></div>
  `;
}

async function runBroadcast() {
  const prompt = document.getElementById('panelPrompt').value.trim();
  if (!prompt) { showToast('Enter a prompt first', 'error'); return; }
  const status = document.getElementById('panelStatus');
  status.textContent = 'running...';
  status.className = 'badge badge-warning';
  try {
    const r = await api.panelBroadcast(prompt, []);
    const agents = r.agents || [];
    const box = document.getElementById('panelResults');
    box.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px">${agents.map(a => `
      <div class="card" style="max-height:420px;overflow:auto">
        <div class="flex items-center justify-between mb-2">
          <span class="card-title">${escapeHtml(a.agent)}</span>
          <span class="badge ${a.status === 'ok' ? 'badge-success' : 'badge-danger'}">${a.status}</span>
        </div>
        <pre style="white-space:pre-wrap;font-size:11px;color:var(--text-muted)">${escapeHtml(a.response || '')}</pre>
      </div>`).join('')}</div>`;
    status.textContent = `${agents.length} agents`;
    status.className = 'badge badge-success';
  } catch (err) {
    status.textContent = 'error';
    status.className = 'badge badge-danger';
    showToast(`Broadcast failed: ${err.message}`, 'error');
  }
}
