const fs = require('fs');
const path = require('path');
const vm = require('vm');

const filePath = path.join(__dirname, 'public', 'index.html');
if (!fs.existsSync(filePath)) {
  console.error('❌ Arquivo public/index.html não encontrado!');
  process.exit(1);
}

let html = fs.readFileSync(filePath, 'utf8');

// 1. Injetar Estilos CSS dos Alertas
const cssAlertas = `
    /* Central de Alertas do Dashboard */
    .alerts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 1.25rem;
      margin-bottom: 1.5rem;
    }
    .alert-card {
      background: #ffffff;
      border-radius: var(--radius);
      border: 1px solid var(--border);
      padding: 1.25rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      position: relative;
    }
    .alert-card.alert-card-danger {
      border-left: 5px solid #dc2626;
    }
    .alert-card.alert-card-warning {
      border-left: 5px solid #eab308;
    }
    .alert-card.alert-card-success {
      border-left: 5px solid #16a34a;
    }
    .alert-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.85rem;
    }
    .alert-card-title {
      font-weight: 700;
      font-size: 0.95rem;
      color: #0f2a4a;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .alert-list {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      max-height: 260px;
      overflow-y: auto;
    }
    .alert-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.55rem 0.75rem;
      border-radius: 6px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      font-size: 0.85rem;
    }
    .alert-badge {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
    }
    .alert-badge.danger {
      background: #fee2e2;
      color: #991b1b;
    }
    .alert-badge.warning {
      background: #fef3c7;
      color: #92400e;
    }
    .alert-badge.success {
      background: #dcfce7;
      color: #166534;
    }
  </style>`;

if (!html.includes('.alerts-grid')) {
  html = html.replace('</style>', cssAlertas);
  console.log('✔ Estilos CSS dos alertas adicionados.');
}

// 2. Injetar a Seção HTML no Dashboard
const htmlAlertas = `
        <!-- CENTRAL DE ALERTAS INTELIGENTES -->
        <div id="dash-alerts-container" style="margin-top: 2rem;">
          <div class="section-title-wrap">
            <h2 class="section-title"><span>⚠️</span> Central de Alertas da Frota</h2>
          </div>
          <div class="alerts-grid" id="dash-alerts-grid">
            <!-- Renderizado dinamicamente via renderAlertasDashboard() -->
          </div>
        </div>

        <div class="section-title-wrap" id="dash-finance-title"`;

if (!html.includes('id="dash-alerts-container"')) {
  html = html.replace('<div class="section-title-wrap" id="dash-finance-title"', htmlAlertas);
  console.log('✔ Estrutura HTML da central de alertas inserida no Dashboard.');
}

// 3. Injetar a Função JavaScript
const jsFuncaoAlertas = `
    // =========================================================================
    // RENDERIZADOR DA CENTRAL DE ALERTAS DO DASHBOARD
    // =========================================================================
    function renderAlertasDashboard() {
      const container = document.getElementById('dash-alerts-grid');
      if (!container) return;

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      // 1. Alertas de Documentos
      const docsCriticos = [];
      const docsAtencao = [];

      (state.documentos || []).forEach(d => {
        if (!d.data_vencimento) return;
        const venc = new Date(d.data_vencimento);
        venc.setHours(0, 0, 0, 0);
        const diffDias = Math.ceil((venc - hoje) / (1000 * 60 * 60 * 24));

        if (diffDias < 0) {
          docsCriticos.push({ ...d, diffDias });
        } else if (diffDias <= 30) {
          docsAtencao.push({ ...d, diffDias });
        }
      });

      // 2. Alertas de Manutenção
      const manutCriticas = [];
      const manutAtencao = [];

      const kmPorPlaca = {};
      if (state.kmData && state.kmData[state.currentMonth]) {
        Object.keys(state.kmData[state.currentMonth]).forEach(placa => {
          const item = state.kmData[state.currentMonth][placa];
          kmPorPlaca[placa] = Number(item.final) || Number(item.inicial) || 0;
        });
      }

      (state.manutencoes || []).forEach(m => {
        if (!m.proxima_manutencao_km || !m.placa) return;
        const kmAtual = kmPorPlaca[m.placa] || Number(m.km) || 0;
        const proxKm = Number(m.proxima_manutencao_km);
        const diffKm = proxKm - kmAtual;

        if (diffKm <= 0) {
          manutCriticas.push({ ...m, kmAtual, ultrapassou: Math.abs(diffKm) });
        } else if (diffKm <= 1000) {
          manutAtencao.push({ ...m, kmAtual, faltam: diffKm });
        }
      });

      // Renderizar Card de Documentos
      let htmlDocs = '';
      const totalDocsAlerta = docsCriticos.length + docsAtencao.length;
      if (totalDocsAlerta === 0) {
        htmlDocs = \`
          <div class="alert-card alert-card-success">
            <div class="alert-card-header">
              <div class="alert-card-title"><span>📄</span> Documentos & Certidões</div>
              <span class="alert-badge success">100% em dia</span>
            </div>
            <p style="margin:0; font-size:0.85rem; color:#15803d;">Nenhum documento vencido ou a vencer nos próximos 30 dias.</p>
          </div>\`;
      } else {
        const cardClass = docsCriticos.length > 0 ? 'alert-card-danger' : 'alert-card-warning';
        const badgeText = docsCriticos.length > 0 ? \`\${docsCriticos.length} Vencido(s)\` : \`\${docsAtencao.length} a vencer\`;
        const badgeClass = docsCriticos.length > 0 ? 'danger' : 'warning';

        let itemsHtml = '';
        docsCriticos.forEach(d => {
          itemsHtml += \`
            <div class="alert-item">
              <div>
                <strong>\${d.entidade_nome}</strong> — \${d.tipo_documento}
                <div style="font-size:0.75rem; color:#64748b;">Venceu em: \${new Date(d.data_vencimento).toLocaleDateString('pt-BR')}</div>
              </div>
              <span class="alert-badge danger">Vencido há \${Math.abs(d.diffDias)}d</span>
            </div>\`;
        });
        docsAtencao.forEach(d => {
          itemsHtml += \`
            <div class="alert-item">
              <div>
                <strong>\${d.entidade_nome}</strong> — \${d.tipo_documento}
                <div style="font-size:0.75rem; color:#64748b;">Vencimento: \${new Date(d.data_vencimento).toLocaleDateString('pt-BR')}</div>
              </div>
              <span class="alert-badge warning">Vence em \${d.diffDias}d</span>
            </div>\`;
        });

        htmlDocs = \`
          <div class="alert-card \${cardClass}">
            <div class="alert-card-header">
              <div class="alert-card-title"><span>📄</span> Documentos (\${totalDocsAlerta} alertas)</div>
              <span class="alert-badge \${badgeClass}">\${badgeText}</span>
            </div>
            <div class="alert-list">\${itemsHtml}</div>
          </div>\`;
      }

      // Renderizar Card de Manutenções
      let htmlManut = '';
      const totalManutAlerta = manutCriticas.length + manutAtencao.length;
      if (totalManutAlerta === 0) {
        htmlManut = \`
          <div class="alert-card alert-card-success">
            <div class="alert-card-header">
              <div class="alert-card-title"><span>🔧</span> Manutenção Preventiva</div>
              <span class="alert-badge success">Revisões em dia</span>
            </div>
            <p style="margin:0; font-size:0.85rem; color:#15803d;">Nenhum veículo com revisão pendente ou próxima (menos de 1.000 km).</p>
          </div>\`;
      } else {
        const cardClass = manutCriticas.length > 0 ? 'alert-card-danger' : 'alert-card-warning';
        const badgeText = manutCriticas.length > 0 ? \`\${manutCriticas.length} Vencida(s)\` : \`\${manutAtencao.length} Próxima(s)\`;
        const badgeClass = manutCriticas.length > 0 ? 'danger' : 'warning';

        let itemsHtml = '';
        manutCriticas.forEach(m => {
          itemsHtml += \`
            <div class="alert-item">
              <div>
                <strong>\${m.placa}</strong> — \${m.descricao}
                <div style="font-size:0.75rem; color:#64748b;">KM Atual: \${formatNum(m.kmAtual)} | Previsto: \${formatNum(m.proxima_manutencao_km)}</div>
              </div>
              <span class="alert-badge danger">Passou \${formatNum(m.ultrapassou)} km</span>
            </div>\`;
        });
        manutAtencao.forEach(m => {
          itemsHtml += \`
            <div class="alert-item">
              <div>
                <strong>\${m.placa}</strong> — \${m.descricao}
                <div style="font-size:0.75rem; color:#64748b;">KM Atual: \${formatNum(m.kmAtual)} | Previsto: \${formatNum(m.proxima_manutencao_km)}</div>
              </div>
              <span class="alert-badge warning">Faltam \${formatNum(m.faltam)} km</span>
            </div>\`;
        });

        htmlManut = \`
          <div class="alert-card \${cardClass}">
            <div class="alert-card-header">
              <div class="alert-card-title"><span>🔧</span> Revisões & Manutenções (\${totalManutAlerta})</div>
              <span class="alert-badge \${badgeClass}">\${badgeText}</span>
            </div>
            <div class="alert-list">\${itemsHtml}</div>
          </div>\`;
      }

      container.innerHTML = htmlDocs + htmlManut;
    }
`;

if (!html.includes('function renderAlertasDashboard')) {
  const pontoInjecao = 'function renderAll() {';
  html = html.replace(pontoInjecao, jsFuncaoAlertas + '\n    ' + pontoInjecao);
  console.log('✔ Função renderAlertasDashboard inserida.');
}

// 4. Conectar chamadas nos carregamentos de dados
if (!html.includes('renderAlertasDashboard();')) {
  html = html.replace('renderDocumentos();', 'renderDocumentos(); renderAlertasDashboard();');
  html = html.replace('renderManutencoes();', 'renderManutencoes(); renderAlertasDashboard();');
  html = html.replace('loadDashboardData();', 'loadDashboardData(); renderAlertasDashboard();');
  console.log('✔ Chamadas de atualização em tempo real conectadas.');
}

// 5. Validar sintaxe
let errosFinais = 0;
const validador = /<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/gi;
let m;
while ((m = validador.exec(html)) !== null) {
  try {
    new vm.Script(m[1]);
  } catch (e) {
    errosFinais++;
    console.error('❌ Erro no script:', e.message);
  }
}

if (errosFinais === 0) {
  fs.writeFileSync(filePath, html, 'utf8');
  console.log('🎉 Central de Alertas injetada com SUCESSO! 0 erros de sintaxe.');
} else {
  console.error('⚠️ Não foi possível salvar devido a erros de sintaxe.');
}
