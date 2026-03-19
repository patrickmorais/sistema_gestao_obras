(async function () {
  const supa = window.SGO_SUPABASE;

  // Verifica sessão Supabase
  const { data: sessionData } = await supa.auth.getSession();
  if (!sessionData.session) {
    localStorage.removeItem('sgo_user');
    window.location.href = './login.html';
    return;
  }

  // Dados do usuário (localStorage para mock restante)
  let user;
  const userRaw = localStorage.getItem('sgo_user');
  try {
    user = userRaw ? JSON.parse(userRaw) : null;
  } catch {
    user = null;
  }
  if (!user) {
    const su = sessionData.session.user;
    user = {
      name: su.user_metadata?.name || su.email.split('@')[0],
      email: su.email,
      avatarSvg: su.user_metadata?.avatar_url ||
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96'%3E%3Cdefs%3E%3CradialGradient id='g' cx='30%25' cy='25%25'%3E%3Cstop stop-color='%2360a5fa' offset='0'/%3E%3Cstop stop-color='%235eead4' offset='1'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect width='96' height='96' rx='48' fill='url(%23g)'/%3E%3Cpath d='M48 52c10.5 0 19-8.5 19-19S58.5 14 48 14 29 22.5 29 33s8.5 19 19 19zm0 8c-17.1 0-31 9.6-31 21.5V86h62v-4.5C79 69.6 65.1 60 48 60z' fill='rgba(7,11,20,.55)'/%3E%3C/svg%3E"
    };
    localStorage.setItem('sgo_user', JSON.stringify(user));
  }

  const userName = document.getElementById('userName');
  const userAvatar = document.getElementById('userAvatar');
  const logoutBtn = document.getElementById('logoutBtn');
  const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  const pageTitle = document.getElementById('pageTitle');
  const brandSubtitle = document.getElementById('brandSubtitle');
  const viewContainer = document.getElementById('viewContainer');

  if (userName) userName.textContent = user?.name || 'Usuário';
  if (userAvatar) userAvatar.src = user?.avatarSvg || '';

  logoutBtn?.addEventListener('click', async () => {
    await supa.auth.signOut();
    localStorage.removeItem('sgo_user');
    window.location.href = './login.html';
  });

  function isMobileLayout() {
    return window.matchMedia && window.matchMedia('(max-width: 860px)').matches;
  }

  function setSidebarOpen(open) {
    if (!isMobileLayout()) return;
    document.body.classList.toggle('sidebar-open', Boolean(open));
    if (sidebarOverlay) sidebarOverlay.setAttribute('aria-hidden', open ? 'false' : 'true');
  }

  setSidebarOpen(false);

  function setSidebarCollapsed(collapsed) {
    if (isMobileLayout()) return;
    document.body.classList.toggle('sidebar-collapsed', Boolean(collapsed));
    localStorage.setItem('sgo_sidebar_collapsed', collapsed ? '1' : '0');
  }

  (function initSidebarState() {
    const saved = localStorage.getItem('sgo_sidebar_collapsed');
    if (saved === '1') document.body.classList.add('sidebar-collapsed');
  })();

  sidebarToggleBtn?.addEventListener('click', () => {
    if (isMobileLayout()) {
      setSidebarOpen(!document.body.classList.contains('sidebar-open'));
      return;
    }
    setSidebarCollapsed(!document.body.classList.contains('sidebar-collapsed'));
  });

  sidebarOverlay?.addEventListener('click', () => setSidebarOpen(false));

  window.addEventListener('resize', () => {
    if (!isMobileLayout()) setSidebarOpen(false);
  });

  document.querySelectorAll('.nav-group-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const group = btn.getAttribute('data-group');
      const wrapper = btn.closest('.nav-group');
      if (!wrapper || !group) return;
      wrapper.classList.toggle('open');
    });
  });

  function getStoredObras() {
    const raw = localStorage.getItem('sgo_obras');
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function setStoredObras(obras) {
    localStorage.setItem('sgo_obras', JSON.stringify(obras));
  }

  function getObras() {
    const stored = getStoredObras();
    if (stored) return stored;
    const seed = (window.SGO_MOCK?.obras || []).slice();
    setStoredObras(seed);
    return seed;
  }

  function moneyBRL(n) {
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function setActiveNav(route) {
    document.querySelectorAll('.nav-item, .nav-subitem').forEach((el) => {
      const r = el.getAttribute('data-route');
      if (r && r === route) el.classList.add('active');
      else el.classList.remove('active');
    });
  }

  let charts = [];
  function destroyCharts() {
    charts.forEach((c) => {
      try { c.destroy(); } catch {}
    });
    charts = [];
  }

  function slicePeriod(series, period) {
    const p = Number(period);
    if (!p || p <= 0) return series;
    return {
      labels: series.labels.slice(-p),
      orcado: series.orcado.slice(-p),
      realizado: series.realizado.slice(-p)
    };
  }

  function computeTotals(series) {
    const totalOrcado = (series.orcado || []).reduce((a, b) => a + b, 0);
    const totalRealizado = (series.realizado || []).reduce((a, b) => a + b, 0);
    const desvio = totalRealizado - totalOrcado;
    const percentual = totalOrcado > 0 ? (totalRealizado / totalOrcado) * 100 : 0;
    return { totalOrcado, totalRealizado, desvio, percentual };
  }

  function renderDashboard() {
    destroyCharts();

    const obras = getObras();
    const mock = window.SGO_MOCK;

    viewContainer.innerHTML = `
      <div class="card">
        <div class="toolbar">
          <div>
            <div class="card-title">Dashboard</div>
            <div class="card-subtitle">Filtros e indicadores (dados de teste)</div>
          </div>

          <div class="filters">
            <div class="field select">
              <label for="dashObra">Obra</label>
              <select id="dashObra" name="dashObra">
                <option value="all">Todas</option>
                ${obras.map(o => `<option value="${o.id}">${o.id} - ${o.nome}</option>`).join('')}
              </select>
            </div>

            <div class="field select">
              <label for="dashPeriodo">Período</label>
              <select id="dashPeriodo" name="dashPeriodo">
                <option value="3">Últimos 3 meses</option>
                <option value="6" selected>Últimos 6 meses</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div style="height:14px"></div>

      <div class="grid cols-3" id="dashKpis"></div>

      <div style="height:14px"></div>

      <div class="card">
        <div class="card-title">Realizado x Orçado (colunas agrupadas)</div>
        <div class="card-subtitle">Comparativo mensal</div>
        <canvas id="chartOrcadoRealizado" height="90"></canvas>
      </div>

      <div style="height:14px"></div>

      <div class="grid cols-2">
        <div class="card">
          <div class="card-title">Evolução Física por Etapa</div>
          <div class="card-subtitle">Percentual acumulado por etapa</div>
          <canvas id="chartEvolucao" height="140"></canvas>
        </div>

        <div class="card">
          <div class="card-title">Status de Progresso por Obra</div>
          <div class="card-subtitle">Resumo (mock)</div>
          <div id="obrasStatus"></div>
        </div>
      </div>
    `;

    const obraSel = document.getElementById('dashObra');
    const periodoSel = document.getElementById('dashPeriodo');

    function resolveSeries(obraId) {
      if (obraId && obraId !== 'all' && mock.dashboardPorObra && mock.dashboardPorObra[obraId]) {
        return mock.dashboardPorObra[obraId].orcadoVsRealizado;
      }
      return mock.orcadoVsRealizado;
    }

    function resolveEvolucao(obraId) {
      if (obraId && obraId !== 'all' && mock.dashboardPorObra && mock.dashboardPorObra[obraId]) {
        return mock.dashboardPorObra[obraId].evolucaoFisicaEtapas;
      }
      return mock.evolucaoFisicaEtapas;
    }

    function renderStatusList() {
      const elStatus = document.getElementById('obrasStatus');
      if (!elStatus) return;

      elStatus.innerHTML = getObras()
        .map((o) => {
          const cls = o.status === 'Concluída' ? 'ok' : (o.status === 'Atrasada' ? 'bad' : 'warn');
          return `
            <div style="display:grid; gap:8px; padding:10px 0; border-bottom:1px solid rgba(255,255,255,.08)">
              <div style="display:flex; align-items:center; justify-content:space-between; gap:10px">
                <div style="font-weight:900">${o.nome}</div>
                <span class="pill ${cls}">${o.status}</span>
              </div>
              <div class="progress" aria-label="Progresso"><div style="width:${Number(o.progresso) || 0}%"></div></div>
              <div style="display:flex; align-items:center; justify-content:space-between; color:rgba(255,255,255,.72); font-size:12px; font-weight:800">
                <span>${o.cidade || ''}</span>
                <span>${Number(o.progresso) || 0}%</span>
              </div>
            </div>
          `;
        })
        .join('');
    }

    function renderKpis(series) {
      const kpisEl = document.getElementById('dashKpis');
      if (!kpisEl) return;
      const { totalOrcado, totalRealizado, desvio, percentual } = computeTotals(series);

      const obrasAll = getObras();
      const emAndamento = obrasAll.filter(o => o.status === 'Em andamento').length;
      const atrasadas = obrasAll.filter(o => o.status === 'Atrasada').length;

      kpisEl.innerHTML = `
        <div class="card">
          <div class="card-title">Orçado (período)</div>
          <div class="kpi">
            <div>
              <div class="kpi-value">${moneyBRL(totalOrcado)}</div>
              <div class="kpi-label">Somatório do período</div>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-title">Realizado (período)</div>
          <div class="kpi">
            <div>
              <div class="kpi-value">${moneyBRL(totalRealizado)}</div>
              <div class="kpi-label">Somatório do período</div>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-title">Eficiência + Status</div>
          <div class="kpi" style="align-items:flex-end">
            <div>
              <div class="kpi-value">${percentual.toFixed(1)}%</div>
              <div class="kpi-label">Realizado / Orçado</div>
            </div>
            <div style="text-align:right">
              <div style="font-weight:1000">${moneyBRL(desvio)}</div>
              <div class="kpi-label">Desvio</div>
            </div>
          </div>
          <div style="height:10px"></div>
          <div style="display:flex; gap:8px; flex-wrap:wrap">
            <span class="pill warn">Em andamento: ${emAndamento}</span>
            <span class="pill bad">Atrasadas: ${atrasadas}</span>
          </div>
        </div>
      `;
    }

    function renderCharts() {
      destroyCharts();

      const obraId = obraSel ? obraSel.value : 'all';
      const periodo = periodoSel ? Number(periodoSel.value) : 6;

      const seriesBase = resolveSeries(obraId);
      const series = slicePeriod(seriesBase, periodo);
      const evolucao = resolveEvolucao(obraId);

      renderKpis(series);
      renderStatusList();

      const ctx1 = document.getElementById('chartOrcadoRealizado');
      if (ctx1 && window.Chart) {
        const c = new Chart(ctx1, {
          type: 'bar',
          data: {
            labels: series.labels,
            datasets: [
              { label: 'Orçado', data: series.orcado, backgroundColor: 'rgba(37,99,235,.55)' },
              { label: 'Realizado', data: series.realizado, backgroundColor: 'rgba(14,165,233,.55)' }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
              legend: { labels: { color: 'rgba(255,255,255,.85)' } },
              tooltip: {
                callbacks: {
                  label: (ctx) => `${ctx.dataset.label}: ${moneyBRL(ctx.parsed.y)}`
                }
              }
            },
            scales: {
              x: { ticks: { color: 'rgba(255,255,255,.7)' }, grid: { color: 'rgba(255,255,255,.06)' } },
              y: {
                ticks: {
                  color: 'rgba(255,255,255,.7)',
                  callback: (v) => new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(v)
                },
                grid: { color: 'rgba(255,255,255,.06)' }
              }
            }
          }
        });
        charts.push(c);
      }

      const ctx2 = document.getElementById('chartEvolucao');
      if (ctx2 && window.Chart) {
        const c = new Chart(ctx2, {
          type: 'line',
          data: {
            labels: evolucao.labels,
            datasets: [
              {
                label: 'Evolução física (%)',
                data: evolucao.valores,
                borderColor: 'rgba(14,165,233,.85)',
                backgroundColor: 'rgba(14,165,233,.12)',
                pointBackgroundColor: 'rgba(37,99,235,.85)',
                tension: 0.3,
                fill: true
              }
            ]
          },
          options: {
            responsive: true,
            plugins: {
              legend: { labels: { color: 'rgba(255,255,255,.85)' } },
              tooltip: { callbacks: { label: (ctx) => `${ctx.parsed.y}%` } }
            },
            scales: {
              x: { ticks: { color: 'rgba(255,255,255,.7)' }, grid: { color: 'rgba(255,255,255,.06)' } },
              y: {
                suggestedMin: 0,
                suggestedMax: 100,
                ticks: { color: 'rgba(255,255,255,.7)', callback: (v) => `${v}%` },
                grid: { color: 'rgba(255,255,255,.06)' }
              }
            }
          }
        });
        charts.push(c);
      }
    }

    obraSel?.addEventListener('change', renderCharts);
    periodoSel?.addEventListener('change', renderCharts);
    renderCharts();
  }

  function renderCadastroObras() {
    destroyCharts();

    const obras = getObras();

    viewContainer.innerHTML = `
      <div class="grid cols-1">
        <div class="card">
          <div class="card-title">Nova Obra</div>
          <div class="card-subtitle">Cadastro/Alteração de Dados</div>

          <form id="obraForm" class="form-grid" autocomplete="off">
            <input type="hidden" id="obraMode" value="create" />
            <input type="hidden" id="obraOriginalId" value="" />

            <div class="form-grid cols-2">
              <div class="field">
                <label for="obraId">Código</label>
                <input id="obraId" name="obraId" type="text" placeholder="OB-004" required />
              </div>
              <div class="field">
                <label for="obraStatus">Status</label>
                <select id="obraStatus" name="obraStatus" required>
                  <option value="Não iniciada">Não iniciada</option>
                  <option value="Em andamento">Em andamento</option>
                  <option value="Atrasada">Atrasada</option>
                  <option value="Concluída">Concluída</option>
                </select>
              </div>
            </div>

            <div class="field">
              <label for="obraNome">Nome</label>
              <input id="obraNome" name="obraNome" type="text" placeholder="Nome da obra" required />
            </div>

            <div class="form-grid cols-2">
              <div class="field">
                <label for="obraCliente">Cliente</label>
                <input id="obraCliente" name="obraCliente" type="text" placeholder="Cliente" required />
              </div>
              <div class="field">
                <label for="obraCidade">Cidade</label>
                <input id="obraCidade" name="obraCidade" type="text" placeholder="Cidade" required />
              </div>
            </div>

            <div class="field">
              <label for="obraProgresso">Progresso (%)</label>
              <input id="obraProgresso" name="obraProgresso" type="number" min="0" max="100" value="0" required />
            </div>

            <div class="actions">
              <button class="btn btn-primary" type="submit" id="obraSaveBtn">Salvar</button>
            </div>

            <div id="obraFormMsg" class="form-error" role="alert" hidden></div>
          </form>
        </div>

        <div class="card">
          <div class="card-title">Obras Cadastradas</div>
          <div class="card-subtitle">Editar / Excluir</div>
          <div id="obrasTable"></div>
        </div>
      </div>
    `;

    const form = document.getElementById('obraForm');
    const msg = document.getElementById('obraFormMsg');

    const modeEl = document.getElementById('obraMode');
    const originalIdEl = document.getElementById('obraOriginalId');

    const idEl = document.getElementById('obraId');
    const statusEl = document.getElementById('obraStatus');
    const nomeEl = document.getElementById('obraNome');
    const clienteEl = document.getElementById('obraCliente');
    const cidadeEl = document.getElementById('obraCidade');
    const progressoEl = document.getElementById('obraProgresso');

    function showMsg(text) {
      if (!msg) return;
      msg.textContent = text;
      msg.hidden = false;
    }

    function hideMsg() {
      if (!msg) return;
      msg.textContent = '';
      msg.hidden = true;
    }

    function clearFieldErrors() {
      form.querySelectorAll('.field-error').forEach((el) => el.remove());
      form.querySelectorAll('.input-error').forEach((el) => el.classList.remove('input-error'));
    }

    function validateRequired() {
      clearFieldErrors();
      let valid = true;
      form.querySelectorAll('input[required], select[required]').forEach((input) => {
        if (!input.value.trim()) {
          valid = false;
          input.classList.add('input-error');
          const msg = document.createElement('span');
          msg.className = 'field-error';
          msg.textContent = 'Campo obrigatório';
          input.parentElement.appendChild(msg);
        }
      });
      return valid;
    }

    form.addEventListener('input', (e) => {
      const inp = e.target;
      if (inp.classList.contains('input-error')) {
        inp.classList.remove('input-error');
        const err = inp.parentElement.querySelector('.field-error');
        if (err) err.remove();
      }
    });

    form.addEventListener('change', (e) => {
      const inp = e.target;
      if (inp.classList.contains('input-error')) {
        inp.classList.remove('input-error');
        const err = inp.parentElement.querySelector('.field-error');
        if (err) err.remove();
      }
    });

    function resetForm() {
      hideMsg();
      clearFieldErrors();
      if (modeEl) modeEl.value = 'create';
      if (originalIdEl) originalIdEl.value = '';
      if (idEl) idEl.value = '';
      if (statusEl) statusEl.value = 'Não iniciada';
      if (nomeEl) nomeEl.value = '';
      if (clienteEl) clienteEl.value = '';
      if (cidadeEl) cidadeEl.value = '';
      if (progressoEl) progressoEl.value = '0';
      idEl?.focus();
    }

    function renderTable(rows) {
      const tbl = document.getElementById('obrasTable');
      if (!tbl) return;

      tbl.innerHTML = `
        <table class="table" aria-label="Obras">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nome</th>
              <th>Status</th>
              <th>Progresso</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((o) => {
              const cls = o.status === 'Concluída' ? 'ok' : (o.status === 'Atrasada' ? 'bad' : 'warn');
              return `
                <tr>
                  <td>${o.codigo}</td>
                  <td>${o.nome}</td>
                  <td><span class="pill ${cls}">${o.status}</span></td>
                  <td>${Number(o.progresso) || 0}%</td>
                  <td>
                    <div class="actions">
                      <button class="btn btn-ghost btn-small" type="button" data-action="edit" data-codigo="${o.codigo}">Editar</button>
                      <button class="btn btn-danger btn-small" type="button" data-action="delete" data-codigo="${o.codigo}">Excluir</button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
    }

    async function loadAndRenderTable() {
      const supa = window.SGO_SUPABASE;
      const { data, error } = await supa.from('cad_obras').select('*').order('created_at', { ascending: false });
      if (error) { console.error('Erro ao carregar obras:', error.message); return; }
      renderTable(data || []);
    }

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideMsg();
      if (!validateRequired()) return;

      const codigo = String(idEl?.value || '').trim().toUpperCase();
      const nome = String(nomeEl?.value || '').trim();
      const cliente = String(clienteEl?.value || '').trim();
      const cidade = String(cidadeEl?.value || '').trim();
      const status = String(statusEl?.value || '').trim();
      const progresso = Math.max(0, Math.min(100, Number(progressoEl?.value || 0)));

      const supa = window.SGO_SUPABASE;
      const saveBtn = document.getElementById('obraSaveBtn');
      if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Salvando…'; }

      const mode = modeEl?.value || 'create';

      if (mode === 'edit') {
        const originalCodigo = String(originalIdEl?.value || '').trim().toUpperCase();
        const { error } = await supa
          .from('cad_obras')
          .update({ codigo, nome, cliente, cidade, status, progresso })
          .eq('codigo', originalCodigo);

        if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Salvar'; }
        if (error) { showMsg('Erro ao atualizar: ' + error.message); return; }
      } else {
        const { error } = await supa
          .from('cad_obras')
          .insert([{ codigo, nome, cliente, cidade, status, progresso }]);

        if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Salvar'; }
        if (error) {
          if (error.code === '23505') { showMsg('Já existe uma obra com esse código.'); }
          else { showMsg('Erro ao salvar: ' + error.message); }
          return;
        }
      }

      await loadAndRenderTable();
      resetForm();
    });

    document.getElementById('obrasTable')?.addEventListener('click', async (e) => {
      const btn = e.target?.closest?.('button');
      if (!btn) return;
      const action = btn.getAttribute('data-action');
      const codigo = String(btn.getAttribute('data-codigo') || '').trim();
      if (!action || !codigo) return;

      const supa = window.SGO_SUPABASE;

      if (action === 'edit') {
        const { data } = await supa.from('cad_obras').select('*').eq('codigo', codigo).single();
        if (!data) return;
        hideMsg();
        if (modeEl) modeEl.value = 'edit';
        if (originalIdEl) originalIdEl.value = data.codigo;
        if (idEl) idEl.value = data.codigo;
        if (statusEl) statusEl.value = data.status;
        if (nomeEl) nomeEl.value = data.nome;
        if (clienteEl) clienteEl.value = data.cliente;
        if (cidadeEl) cidadeEl.value = data.cidade;
        if (progressoEl) progressoEl.value = String(Number(data.progresso) || 0);
        idEl?.focus();
        return;
      }

      if (action === 'delete') {
        if (!confirm('Excluir obra ' + codigo + '?')) return;
        const { error } = await supa.from('cad_obras').delete().eq('codigo', codigo);
        if (error) { showMsg('Erro ao excluir: ' + error.message); return; }
        await loadAndRenderTable();
        resetForm();
      }
    });

    loadAndRenderTable();
  }

  // ── TELA: Criação de Orçamentos ──
  function renderCriacaoOrcamentos() {
    destroyCharts();

    viewContainer.innerHTML = `
      <div class="grid cols-1">
        <div class="card">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px">
            <div>
              <div class="card-title">Criar Orçamento</div>
              <div class="card-subtitle">Orçamentos integrados com Supabase</div>
            </div>
            <button class="btn btn-orange" type="button" id="btnNovoOrcamento">+ Novo</button>
          </div>
          <div id="orcamentosTable"></div>
        </div>
      </div>

      <!-- Modal Criar Orçamento -->
      <div class="modal-overlay" id="modalOrcamento" hidden>
        <div class="modal-card">
          <div class="modal-header">
            <div class="card-title">Novo Orçamento</div>
            <button class="modal-close" type="button" id="modalOrcClose">&times;</button>
          </div>

          <form id="orcamentoForm" class="form-grid" autocomplete="off">
            <div class="field">
              <label for="orcCodigo">Código do orçamento</label>
              <input id="orcCodigo" name="codigo" type="text" placeholder="ORC-1001" required />
            </div>

            <div class="field">
              <label for="orcObra">Obra</label>
              <select id="orcObra" name="obra" required>
                <option value="">Selecione uma obra...</option>
              </select>
            </div>

            <div class="field">
              <label for="orcCliente">Cliente</label>
              <input id="orcCliente" name="cliente" type="text" readonly placeholder="Preenchido ao selecionar a obra" />
            </div>

            <div class="field">
              <label for="orcStatusObra">Status da obra</label>
              <select id="orcStatusObra" name="status_obra" required>
                <option value="Em Orçamento">Em Orçamento</option>
                <option value="Orçamento Aprovado">Orçamento Aprovado</option>
                <option value="Paralisada">Paralisada</option>
              </select>
            </div>

            <div class="actions" style="margin-top:8px">
              <button class="btn btn-orange" type="submit" id="orcSaveBtn">Criar</button>
              <button class="btn btn-ghost" type="button" id="modalOrcCancel">Cancelar</button>
            </div>

            <div id="orcFormMsg" class="form-error" role="alert" hidden></div>
          </form>
        </div>
      </div>
    `;

    const modal       = document.getElementById('modalOrcamento');
    const form        = document.getElementById('orcamentoForm');
    const msg         = document.getElementById('orcFormMsg');
    const obraSelect  = document.getElementById('orcObra');
    const clienteEl   = document.getElementById('orcCliente');
    const codigoEl    = document.getElementById('orcCodigo');
    const statusObraEl = document.getElementById('orcStatusObra');

    function showMsg(text) { if (!msg) return; msg.textContent = text; msg.hidden = false; }
    function hideMsg()     { if (!msg) return; msg.textContent = ''; msg.hidden = true; }

    function clearFieldErrors() {
      form.querySelectorAll('.field-error').forEach((el) => el.remove());
      form.querySelectorAll('.input-error').forEach((el) => el.classList.remove('input-error'));
    }

    function validateRequired() {
      clearFieldErrors();
      let valid = true;
      form.querySelectorAll('input[required], select[required]').forEach((input) => {
        if (!input.value.trim()) {
          valid = false;
          input.classList.add('input-error');
          const m = document.createElement('span');
          m.className = 'field-error';
          m.textContent = 'Campo obrigatório';
          input.parentElement.appendChild(m);
        }
      });
      return valid;
    }

    form.addEventListener('input', (e) => {
      const inp = e.target;
      if (inp.classList.contains('input-error')) {
        inp.classList.remove('input-error');
        const err = inp.parentElement.querySelector('.field-error');
        if (err) err.remove();
      }
    });

    form.addEventListener('change', (e) => {
      const inp = e.target;
      if (inp.classList.contains('input-error')) {
        inp.classList.remove('input-error');
        const err = inp.parentElement.querySelector('.field-error');
        if (err) err.remove();
      }
    });

    async function openModal() {
      modal.hidden = false;
      await loadObras();
    }
    function closeModal() {
      modal.hidden = true;
      form.reset();
      if (clienteEl) clienteEl.value = '';
      hideMsg();
      clearFieldErrors();
    }

    // Carregar obras do Supabase para o combobox
    async function loadObras() {
      const supa = window.SGO_SUPABASE;
      // Limpar opções anteriores mantendo o placeholder
      obraSelect.innerHTML = '<option value="">Selecione uma obra...</option>';
      const { data, error } = await supa.from('cad_obras').select('codigo, nome, cliente').order('nome');
      if (error) { console.error('Erro ao carregar obras:', error.message); return; }
      (data || []).forEach((o) => {
        const opt = document.createElement('option');
        opt.value = o.codigo;
        opt.textContent = o.codigo + ' – ' + o.nome;
        opt.dataset.cliente = o.cliente || '';
        obraSelect.appendChild(opt);
      });
    }

    // Preencher Cliente ao selecionar uma obra
    obraSelect.addEventListener('change', () => {
      const sel = obraSelect.selectedOptions?.[0];
      if (clienteEl) clienteEl.value = sel?.dataset?.cliente || '';
    });

    // Eventos
    document.getElementById('btnNovoOrcamento')?.addEventListener('click', openModal);
    document.getElementById('modalOrcClose')?.addEventListener('click', closeModal);
    document.getElementById('modalOrcCancel')?.addEventListener('click', closeModal);

    modal?.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideMsg();
      if (!validateRequired()) return;

      const codigo        = String(codigoEl?.value || '').trim().toUpperCase();
      const obraCode      = String(obraSelect?.value || '').trim();
      const selectedOpt   = obraSelect?.selectedOptions?.[0];
      const obraNome      = selectedOpt ? selectedOpt.textContent : obraCode;
      const status_obra   = String(statusObraEl?.value || '').trim();

      closeModal();
      window.location.hash = '#/orcamento/detalhe?codigo=' + encodeURIComponent(codigo) + '&obra=' + encodeURIComponent(obraNome) + '&status_obra=' + encodeURIComponent(status_obra);
    });
  }

  // ── TELA: Detalhe do Orçamento ──
  function renderDetalheOrcamento(params) {
    destroyCharts();

    const codigo = params.get('codigo') || '';
    const obra = params.get('obra') || '';
    const statusObra = params.get('status_obra') || 'Em Orçamento';

    viewContainer.innerHTML = `
      <div class="card">
        <div class="orc-detalhe-header">
          <!-- Coluna: Botão Voltar + Navegação + Código/Obra -->
          <div class="orc-detalhe-col" style="display:flex;align-items:center;gap:14px">
            <button class="btn btn-ghost" type="button" id="btnVoltarOrc" style="display:inline-flex;align-items:center;justify-content:center;padding:10px 12px;flex-shrink:0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            </button>
            <div>
              <div style="font-size:12px;color:var(--muted);font-weight:700">Obras / Orçamentos</div>
              <div style="font-size:16px;font-weight:900;margin-top:4px">${codigo}</div>
            </div>
          </div>

          <!-- Separador -->
          <div class="orc-detalhe-sep"></div>

          <!-- Coluna: Base -->
          <div class="orc-detalhe-col">
            <div style="font-size:13px;font-weight:800;margin-bottom:8px">Base de Dados</div>
            <label style="display:flex;align-items:center;gap:12px;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap">
              <span style="display:inline-block;width:90px">Base Própria</span> <input type="checkbox" id="chkBasePropria" checked />
            </label>
            <label style="display:flex;align-items:center;gap:12px;font-size:13px;font-weight:600;cursor:pointer;margin-top:6px;white-space:nowrap">
              <span style="display:inline-block;width:90px">Base SINAPI</span> <input type="checkbox" id="chkBaseSinapi" />
            </label>
          </div>

          <!-- Separador -->
          <div class="orc-detalhe-sep"></div>

          <!-- Coluna: Status -->
          <div class="orc-detalhe-col">
            <div style="font-size:13px;font-weight:800;margin-bottom:8px">Status</div>
            <div style="font-size:13px;font-weight:600">Obra: <span class="pill warn" style="margin-left:4px">${statusObra}</span></div>
            <div style="font-size:13px;font-weight:600;margin-top:6px">Proposta: <span class="pill" style="margin-left:4px">Em Elaboração</span></div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btnVoltarOrc')?.addEventListener('click', () => {
      window.location.hash = '#/orcamento/criacao';
    });
  }

  // ── TELA: Catálogo de Insumos ──
  function renderCatalogoInsumos() {
    destroyCharts();

    let allInsumos = [];
    let sortCol = 'codigo';
    let sortAsc = true;

    viewContainer.innerHTML = `
      <div class="card">
        <div class="card-title">Catálogo de Insumos</div>
        <div class="card-subtitle">Filtros de pesquisa</div>
        <div class="filter-bar">
          <div class="field search-wrap">
            <label>&nbsp;</label>
            <span class="search-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </span>
            <input id="insBusca" type="text" placeholder="Digite sua busca" />
          </div>
          <div class="field">
            <label>Base</label>
            <select id="insBase"><option value="">Selecione</option></select>
          </div>
          <div class="field">
            <label>Grupo</label>
            <select id="insGrupo"><option value="">Selecione</option></select>
          </div>
          <div class="field">
            <label>Tipo</label>
            <select id="insTipo"><option value="">Selecione</option></select>
          </div>
        </div>
      </div>

      <div style="height:14px"></div>

      <div class="card" style="padding:0; overflow:hidden">
        <div class="insumo-header">
          <span><input type="checkbox" id="insSelectAll" /></span>
          <button class="sort-btn" data-sort="codigo">Código <span class="sort-caret">▼</span></button>
          <button class="sort-btn" data-sort="descricao">Descrição <span class="sort-caret">▼</span></button>
          <span>Tipo</span>
          <span>Unidade</span>
          <button class="sort-btn" data-sort="grupo">Grupo <span class="sort-caret">▼</span></button>
          <span>Base</span>
          <span>Custo Unitário</span>
        </div>
      </div>

      <div class="card" style="padding:0; overflow:hidden">
        <div class="insumo-scroll" id="insumosBody" style="max-height:calc(100vh - var(--topbar-h) - 320px); overflow-y:auto"></div>
      </div>
    `;

    const buscaEl  = document.getElementById('insBusca');
    const baseEl   = document.getElementById('insBase');
    const grupoEl  = document.getElementById('insGrupo');
    const tipoEl   = document.getElementById('insTipo');
    const bodyEl   = document.getElementById('insumosBody');
    const selectAllEl = document.getElementById('insSelectAll');

    function populateFilters(data) {
      const bases  = [...new Set(data.map(d => d.base).filter(Boolean))].sort();
      const grupos = [...new Set(data.map(d => d.grupo).filter(Boolean))].sort();
      const tipos  = [...new Set(data.map(d => d.tipo).filter(Boolean))].sort();

      bases.forEach(v  => { const o = document.createElement('option'); o.value = v; o.textContent = v; baseEl.appendChild(o); });
      grupos.forEach(v => { const o = document.createElement('option'); o.value = v; o.textContent = v; grupoEl.appendChild(o); });
      tipos.forEach(v  => { const o = document.createElement('option'); o.value = v; o.textContent = v; tipoEl.appendChild(o); });
    }

    function getFiltered() {
      const busca = (buscaEl?.value || '').toLowerCase();
      const base  = baseEl?.value || '';
      const grupo = grupoEl?.value || '';
      const tipo  = tipoEl?.value || '';

      let rows = allInsumos.filter(r => {
        if (busca && !String(r.codigo).toLowerCase().includes(busca) && !String(r.descricao).toLowerCase().includes(busca)) return false;
        if (base && r.base !== base) return false;
        if (grupo && r.grupo !== grupo) return false;
        if (tipo && r.tipo !== tipo) return false;
        return true;
      });

      rows.sort((a, b) => {
        const va = a[sortCol] ?? '';
        const vb = b[sortCol] ?? '';
        const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb), 'pt-BR');
        return sortAsc ? cmp : -cmp;
      });

      return rows;
    }

    function renderRows() {
      const rows = getFiltered();
      if (!rows.length) {
        bodyEl.innerHTML = '<div class="insumo-row" style="grid-column:1/-1; text-align:center; color:var(--muted)">Nenhum insumo encontrado</div>';
        return;
      }
      bodyEl.innerHTML = rows.map(r => `
        <div class="insumo-row">
          <span><input type="checkbox" class="ins-check" data-id="${r.id}" /></span>
          <span>${r.codigo}</span>
          <span>${r.descricao}</span>
          <span>${r.tipo}</span>
          <span>${r.unidade}</span>
          <span>${r.grupo || ''}</span>
          <span>${r.base || ''}</span>
          <span>${Number(r.custo_unitario || 0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' })}</span>
        </div>
      `).join('');
    }

    // Ordenação
    viewContainer.querySelectorAll('.sort-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const col = btn.dataset.sort;
        if (sortCol === col) { sortAsc = !sortAsc; }
        else { sortCol = col; sortAsc = true; }

        viewContainer.querySelectorAll('.sort-caret').forEach(c => c.textContent = '▼');
        btn.querySelector('.sort-caret').textContent = sortAsc ? '▲' : '▼';
        renderRows();
      });
    });

    // Filtros
    buscaEl?.addEventListener('input', renderRows);
    baseEl?.addEventListener('change', renderRows);
    grupoEl?.addEventListener('change', renderRows);
    tipoEl?.addEventListener('change', renderRows);

    // Selecionar todos
    selectAllEl?.addEventListener('change', () => {
      bodyEl.querySelectorAll('.ins-check').forEach(cb => { cb.checked = selectAllEl.checked; });
    });

    // Carregar dados
    async function loadInsumos() {
      const supa = window.SGO_SUPABASE;
      const { data, error } = await supa.from('catalogo_insumo').select('*').order('codigo');
      if (error) { console.error('Erro ao carregar insumos:', error.message); return; }
      allInsumos = data || [];
      populateFilters(allInsumos);
      renderRows();
    }

    loadInsumos();
  }

  function renderPlaceholder(title, rows) {
    destroyCharts();

    const bodyRows = (rows || []).map((r) => {
      const tds = Object.values(r).map((v) => `<td>${String(v)}</td>`).join('');
      return `<tr>${tds}</tr>`;
    }).join('');

    const headers = rows && rows[0] ? Object.keys(rows[0]) : [];
    const ths = headers.map((h) => `<th>${h}</th>`).join('');

    viewContainer.innerHTML = `
      <div class="card">
        <div class="card-title">${title}</div>
        <div class="card-subtitle">Dados de teste (sem banco de dados)</div>
        <table class="table" aria-label="Tabela">
          <thead><tr>${ths}</tr></thead>
          <tbody>${bodyRows || '<tr><td colspan="99">Sem dados</td></tr>'}</tbody>
        </table>
      </div>
    `;
  }

  const ROUTES = {
    '#/dashboard': {
      title: 'Dashboard',
      subtitle: 'Indicadores e gráficos',
      render: renderDashboard
    },

    '#/obras/cadastro': {
      title: 'Cadastro de Obras',
      subtitle: 'Obras > Cadastro',
      render: renderCadastroObras
    },
    '#/obras/gestao': {
      title: 'Gestão de Obras',
      subtitle: 'Obras > Gestão',
      render: () => renderPlaceholder('Gestão de Obras (mock)', getObras().map(o => ({ Obra: o.nome, Status: o.status, Progresso: `${Number(o.progresso) || 0}%` })))
    },
    '#/obras/relatorios': {
      title: 'Relatórios de Gestão',
      subtitle: 'Obras > Relatórios',
      render: () => renderPlaceholder('Relatórios de Gestão (mock)', [
        { Relatorio: 'Status por obra', GeradoEm: '2026-03-07', Formato: 'PDF (mock)' },
        { Relatorio: 'Curva S', GeradoEm: '2026-03-07', Formato: 'Excel (mock)' }
      ])
    },

    '#/catalogo/insumo': { title: 'Insumos', subtitle: 'Catálogo > Insumos', render: renderCatalogoInsumos },
    '#/catalogo/composicoes': { title: 'Composições', subtitle: 'Catálogo > Composições', render: () => renderPlaceholder('Composições', []) },

    '#/orcamento/criacao': { title: 'Criar Orçamento', subtitle: 'Orçamento', render: renderCriacaoOrcamentos },
    '#/orcamento/proposta': { title: 'Proposta Comercial', subtitle: 'Orçamento', render: () => renderPlaceholder('Proposta Comercial (mock)', [
      { Proposta: 'PROP-77', Cliente: 'Construtora Alpha', Valor: 'R$ 2.520.000,00', Validade: '15 dias' }
    ]) },
    '#/orcamento/cronograma': { title: 'Cronograma', subtitle: 'Orçamento', render: () => renderPlaceholder('Cronograma (mock)', [
      { Etapa: 'Fundação', Inicio: '2026-01-10', Fim: '2026-02-20', Status: 'Concluída' },
      { Etapa: 'Estrutura', Inicio: '2026-02-21', Fim: '2026-04-15', Status: 'Em andamento' }
    ]) },
    '#/orcamento/relatorios': { title: 'Relatórios de Orçamentos', subtitle: 'Orçamento', render: () => renderPlaceholder('Relatórios de Orçamentos (mock)', [
      { Relatorio: 'Orçado x Realizado', Periodo: 'Jan-Jun', Status: 'Disponível' }
    ]) },
    '#/orcamento/integracoes': { title: 'Integrações', subtitle: 'Orçamento', render: () => renderPlaceholder('Integrações (mock)', [
      { Integracao: 'Gestão de Obras', Estado: 'Planejado' },
      { Integracao: 'Compras', Estado: 'Planejado' },
      { Integracao: 'Financeiro', Estado: 'Planejado' }
    ]) },

    '#/financeiro/recebimentos': { title: 'Recebimentos', subtitle: 'Financeiro', render: () => renderPlaceholder('Recebimentos (mock)', window.SGO_MOCK.financeiro.recebimentos) },
    '#/financeiro/cobranca': { title: 'Cobrança Fácil', subtitle: 'Financeiro', render: () => renderPlaceholder('Cobrança Fácil (mock)', [
      { Cliente: 'Grupo Horizonte', Vencimento: '2026-03-12', Valor: 'R$ 90.000,00', Status: 'A vencer' }
    ]) },
    '#/financeiro/pagamentos': { title: 'Pagamentos', subtitle: 'Financeiro', render: () => renderPlaceholder('Pagamentos (mock)', window.SGO_MOCK.financeiro.pagamentos) },
    '#/financeiro/fluxo-caixa': { title: 'Fluxo de Caixa', subtitle: 'Financeiro', render: () => renderPlaceholder('Fluxo de Caixa (mock)', [
      { Mes: 'Mar/2026', Entradas: 'R$ 215.000,00', Saidas: 'R$ 126.500,00', Saldo: 'R$ 88.500,00' }
    ]) },
    '#/financeiro/resultados': { title: 'Resultados', subtitle: 'Financeiro', render: () => renderPlaceholder('Resultados (mock)', [
      { Indicador: 'Margem (estimada)', Valor: '12,4%' },
      { Indicador: 'Inadimplência', Valor: '1,8%' }
    ]) },

    '#/compras/solicitacoes': { title: 'Solicitações', subtitle: 'Compras', render: () => renderPlaceholder('Solicitações (mock)', [
      { Solicitacao: 'SC-311', Obra: 'Residencial Aurora', Item: 'Cimento CP-II', Status: 'Aprovada' }
    ]) },
    '#/compras/cotacoes': { title: 'Cotações', subtitle: 'Compras', render: () => renderPlaceholder('Cotações (mock)', [
      { Cotacao: 'CQ-81', Fornecedores: 4, Status: 'Em coleta' }
    ]) },
    '#/compras/integracao-oc': { title: 'Integração com Ordem de Compra', subtitle: 'Compras', render: () => renderPlaceholder('Integração com OC (mock)', [
      { Etapa: 'Aprovação', Estado: 'Planejado' },
      { Etapa: 'Geração de OC', Estado: 'Planejado' }
    ]) },
    '#/compras/emissao-oc': { title: 'Emissão de Ordem de Compras', subtitle: 'Compras', render: () => renderPlaceholder('Emissão de OC (mock)', [
      { OC: 'OC-554', Fornecedor: 'Cimento Bom', Valor: 'R$ 34.000,00', Status: 'Emitida' }
    ]) },
    '#/compras/orcado-comprado': { title: 'Relatório Orçado x Comprado', subtitle: 'Compras', render: () => renderPlaceholder('Orçado x Comprado (mock)', [
      { Obra: 'Residencial Aurora', Orcado: 'R$ 410.000,00', Comprado: 'R$ 387.000,00', Desvio: 'R$ -23.000,00' }
    ]) },
    '#/compras/integracao': { title: 'Integração com Orçamento e Financeiro', subtitle: 'Compras', render: () => renderPlaceholder('Integração com Orçamento/Financeiro (mock)', [
      { Integracao: 'Orçamento', Estado: 'Planejado' },
      { Integracao: 'Financeiro', Estado: 'Planejado' }
    ]) },

    '#/relatorios/orcado-realizado': { title: 'Orçado x Realizado', subtitle: 'Relatórios', render: () => renderPlaceholder('Orçado x Realizado (mock)', [
      { Obra: 'Residencial Aurora', Orcado: 'R$ 2.450.000,00', Realizado: 'R$ 2.310.000,00' }
    ]) },
    '#/relatorios/desempenho': { title: 'Desempenho de Custo', subtitle: 'Relatórios', render: () => renderPlaceholder('Desempenho de Custo (mock)', [
      { KPI: 'CPI', Valor: '0,97', Interpretacao: 'Atenção' },
      { KPI: 'SPI', Valor: '1,03', Interpretacao: 'Ok' }
    ]) },
    '#/relatorios/apontamento': { title: 'Apontamento de Mão de Obra', subtitle: 'Relatórios', render: () => renderPlaceholder('Apontamento (mock)', [
      { Colaborador: 'Equipe A', Horas: 168, Obra: 'Residencial Aurora' },
      { Colaborador: 'Equipe B', Horas: 142, Obra: 'Centro Comercial Horizonte' }
    ]) },
    '#/relatorios/estoque': { title: 'Estoque disponível', subtitle: 'Relatórios', render: () => renderPlaceholder('Estoque disponível (mock)', [
      { Item: 'Cimento', Quantidade: 320, Unidade: 'sacos', Deposito: 'Central' }
    ]) },
    '#/relatorios/movimentacao': { title: 'Movimentação de Insumos', subtitle: 'Relatórios', render: () => renderPlaceholder('Movimentação de Insumos (mock)', [
      { Data: '2026-03-04', Item: 'Aço CA-50', Tipo: 'Saída', Quantidade: 1200, Unidade: 'kg' }
    ]) },
    '#/relatorios/fluxo-dre': { title: 'Fluxo de Caixa e DRE', subtitle: 'Relatórios', render: () => renderPlaceholder('Fluxo de Caixa e DRE (mock)', [
      { Demonstrativo: 'DRE', Periodo: 'Jan-Jun', Status: 'Disponível' }
    ]) },

    '#/medicao/criacao': { title: 'Criação de Medições', subtitle: 'Medição de obras', render: () => renderPlaceholder('Criação de Medições (mock)', [
      { Medicao: 'MED-09', Obra: 'Residencial Aurora', Competencia: 'Fev/2026', Status: 'Aprovada' }
    ]) },
    '#/medicao/integracao': { title: 'Integração com Orçamento e Gestão de Obras', subtitle: 'Medição de obras', render: () => renderPlaceholder('Integração (mock)', [
      { Integracao: 'Orçamento', Estado: 'Planejado' },
      { Integracao: 'Gestão', Estado: 'Planejado' }
    ]) },
    '#/medicao/relatorios': { title: 'Relatórios Gráficos', subtitle: 'Medição de obras', render: () => renderPlaceholder('Relatórios Gráficos (mock)', [
      { Grafico: 'Evolução física', Status: 'Disponível' },
      { Grafico: 'Curva de custos', Status: 'Planejado' }
    ]) },
    '#/medicao/app': { title: 'Aplicativo Medição de Obras', subtitle: 'Medição de obras', render: () => renderPlaceholder('Aplicativo de Medição (mock)', [
      { Plataforma: 'Web', Estado: 'Protótipo' }
    ]) },

    '#/estoque/depositos': { title: 'Depósitos ilimitados', subtitle: 'Estoque', render: () => renderPlaceholder('Depósitos (mock)', [
      { Deposito: 'Central', Cidade: 'São Paulo', Itens: 128 },
      { Deposito: 'Obra OB-002', Cidade: 'Campinas', Itens: 57 }
    ]) },
    '#/estoque/movimentacoes': { title: 'Movimentações', subtitle: 'Estoque', render: () => renderPlaceholder('Movimentações (mock)', [
      { Data: '2026-03-03', Tipo: 'Entrada', Item: 'Tijolo', Quantidade: 8000, Deposito: 'Central' },
      { Data: '2026-03-05', Tipo: 'Transferência', Item: 'Tijolo', Quantidade: 2500, Deposito: 'Obra OB-002' }
    ]) },
    '#/estoque/relatorios': { title: 'Relatórios de Estoque', subtitle: 'Estoque', render: () => renderPlaceholder('Relatórios de Estoque (mock)', [
      { Relatorio: 'Posição de estoque', GeradoEm: '2026-03-07', Status: 'Disponível' }
    ]) }
  };

  function navigate(route) {
    // Rota dinâmica: detalhe do orçamento
    if (route.startsWith('#/orcamento/detalhe')) {
      const qs = route.split('?')[1] || '';
      const params = new URLSearchParams(qs);
      setActiveNav('#/orcamento/criacao');
      if (pageTitle) pageTitle.textContent = 'Detalhe do Orçamento';
      if (brandSubtitle) brandSubtitle.textContent = 'Orçamento > Detalhe';
      renderDetalheOrcamento(params);
      return;
    }

    const r = ROUTES[route] ? route : '#/dashboard';

    setActiveNav(r);

    if (pageTitle) pageTitle.textContent = ROUTES[r].title;
    if (brandSubtitle) brandSubtitle.textContent = ROUTES[r].subtitle;

    ROUTES[r].render();
  }

  function onHashChange() {
    navigate(window.location.hash || '#/dashboard');
  }

  document.querySelectorAll('[data-route]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const route = btn.getAttribute('data-route');
      if (!route) return;
      window.location.hash = route;
      setSidebarOpen(false);
    });
  });

  window.addEventListener('hashchange', onHashChange);
  onHashChange();
})();
