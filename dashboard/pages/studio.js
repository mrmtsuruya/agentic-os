async function renderStudio() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Studio</h1>
        <p class="page-subtitle">YouTube autopilot — research · SEO · script · generate · thumbnail · publish (human-approved)</p>
      </div>
      <div class="btn-group">
        <button class="btn btn-ghost" onclick="renderStudio()">🔄 Refresh</button>
      </div>
    </div>
    <div id="oauthBox" class="card mb-3"></div>
    <div class="card mb-3">
      <div class="form-group">
        <label class="form-label">Episode topic</label>
        <input id="studioTopic" class="form-input" placeholder="e.g. XAUUSD gold analysis this week" />
      </div>
      <div class="flex gap-2">
        <button class="btn btn-sm" onclick="studioDo('research')">🔍 Research</button>
        <button class="btn btn-sm" onclick="studioDo('seo')">🏷 SEO</button>
        <button class="btn btn-sm" onclick="studioDo('script')">📝 Script</button>
        <button class="btn btn-primary btn-sm" onclick="studioGenerate()">🎬 Generate video</button>
      </div>
      <pre id="studioOut" style="margin-top:10px;white-space:pre-wrap;font-size:11px;color:var(--text-muted);max-height:200px;overflow:auto"></pre>
    </div>
    <div class="page-header-left"><h3>Episodes (drafts)</h3></div>
    <div id="studioEpisodes"><div class="loading"><div class="loading-spinner"></div></div></div>
  `;
  await refreshOauthBox();
  await refreshEpisodes();
}

async function refreshOauthBox() {
  const box = document.getElementById('oauthBox');
  if (!box) return;
  try {
    const s = await api.studioOauthStatus();
    box.innerHTML = `<span class="badge ${s.configured ? 'badge-success' : 'badge-warning'}">YouTube OAuth: ${s.configured ? 'ready' : 'not configured'}</span>
      <span style="font-size:11px;color:var(--text-muted);margin-left:8px">${s.note}</span>`;
  } catch (e) {
    box.innerHTML = `<span class="badge badge-warning">oauth check failed</span>`;
  }
}

async function studioDo(stage) {
  const topic = document.getElementById('studioTopic').value.trim();
  if (!topic) { showToast('Enter a topic', 'error'); return; }
  const out = document.getElementById('studioOut');
  out.textContent = stage + '...';
  try {
    let r;
    if (stage === 'research') r = await api.studioResearch(topic);
    else if (stage === 'seo') r = await api.studioSeo(topic);
    else r = await api.studioScript(topic);
    out.textContent = JSON.stringify(r, null, 2);
  } catch (e) {
    out.textContent = 'Error: ' + e.message;
  }
}

async function studioGenerate() {
  const topic = document.getElementById('studioTopic').value.trim();
  if (!topic) { showToast('Enter a topic', 'error'); return; }
  const out = document.getElementById('studioOut');
  out.textContent = 'Generating video (TTS + slides + ffmpeg)... this may take a minute';
  try {
    const r = await api.studioGenerate(topic);
    out.textContent = JSON.stringify(r, null, 2);
    showToast('Draft created: ' + r.id, 'success');
    refreshEpisodes();
  } catch (e) {
    out.textContent = 'Error: ' + e.message;
  }
}

async function refreshEpisodes() {
  const box = document.getElementById('studioEpisodes');
  if (!box) return;
  try {
    const r = await api.studioEpisodes();
    const eps = r.episodes || [];
    box.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">${eps.map(e => `
      <div class="card">
        <div class="flex items-center justify-between mb-2">
          <span class="card-title">${escapeHtml((e.topic||'').slice(0,40))}</span>
          <span class="badge ${e.published ? 'badge-success' : 'badge-warning'}">${e.published ? 'LIVE' : 'DRAFT'}</span>
        </div>
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px">${e.id}</div>
        ${e.published ? '' : `<button class="btn btn-sm btn-primary" onclick="studioApprove('${e.id}')">✅ Approve & Publish</button>`}
      </div>`).join('')}</div>`;
  } catch (e) {
    box.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠</div><div class="empty-state-title">${escapeHtml(e.message)}</div></div>`;
  }
}

async function studioApprove(id) {
  if (!confirm('Publish this episode to YouTube? Requires OAuth. Continue?')) return;
  try {
    const r = await api.studioApprove(id);
    showToast('Published: ' + r.youtube_id, 'success');
    refreshEpisodes();
  } catch (e) {
    showToast('Publish failed: ' + e.message, 'error');
  }
}
