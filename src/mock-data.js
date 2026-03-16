window.SGO_MOCK = {
  obras: [
    { id: 'OB-001', nome: 'Residencial Aurora', cliente: 'Construtora Alpha', cidade: 'São Paulo', status: 'Em andamento', progresso: 62 },
    { id: 'OB-002', nome: 'Centro Comercial Horizonte', cliente: 'Grupo Horizonte', cidade: 'Campinas', status: 'Atrasada', progresso: 44 },
    { id: 'OB-003', nome: 'Reforma Hospital Central', cliente: 'Saúde Viva', cidade: 'Santos', status: 'Concluída', progresso: 100 }
  ],

  orcadoVsRealizado: {
    labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
    orcado: [420000, 380000, 510000, 465000, 530000, 490000],
    realizado: [390000, 410000, 470000, 455000, 505000, 520000]
  },

  evolucaoFisicaEtapas: {
    labels: ['Terraplanagem', 'Fundação', 'Estrutura', 'Alvenaria', 'Instalações', 'Acabamento'],
    valores: [100, 88, 72, 55, 41, 25]
  },

  dashboardPorObra: {
    'OB-001': {
      orcadoVsRealizado: {
        labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
        orcado: [180000, 160000, 220000, 195000, 230000, 215000],
        realizado: [170000, 175000, 205000, 192000, 225000, 235000]
      },
      evolucaoFisicaEtapas: {
        labels: ['Terraplanagem', 'Fundação', 'Estrutura', 'Alvenaria', 'Instalações', 'Acabamento'],
        valores: [100, 95, 80, 64, 52, 38]
      }
    },
    'OB-002': {
      orcadoVsRealizado: {
        labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
        orcado: [150000, 130000, 190000, 175000, 200000, 170000],
        realizado: [135000, 155000, 168000, 170000, 180000, 190000]
      },
      evolucaoFisicaEtapas: {
        labels: ['Terraplanagem', 'Fundação', 'Estrutura', 'Alvenaria', 'Instalações', 'Acabamento'],
        valores: [100, 82, 63, 46, 30, 18]
      }
    },
    'OB-003': {
      orcadoVsRealizado: {
        labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
        orcado: [90000, 90000, 100000, 95000, 100000, 105000],
        realizado: [85000, 80000, 97000, 93000, 100000, 95000]
      },
      evolucaoFisicaEtapas: {
        labels: ['Terraplanagem', 'Fundação', 'Estrutura', 'Alvenaria', 'Instalações', 'Acabamento'],
        valores: [100, 100, 100, 100, 100, 100]
      }
    }
  },

  financeiro: {
    recebimentos: [
      { data: '2026-03-01', obra: 'Residencial Aurora', descricao: 'Medição 03', valor: 125000, status: 'Recebido' },
      { data: '2026-03-05', obra: 'Centro Comercial Horizonte', descricao: 'Entrada', valor: 90000, status: 'Pendente' }
    ],
    pagamentos: [
      { data: '2026-03-02', fornecedor: 'Cimento Bom', descricao: 'NF 2381', valor: 34000, status: 'Pago' },
      { data: '2026-03-06', fornecedor: 'Elétrica Pro', descricao: 'Material elétrico', valor: 18200, status: 'Agendado' }
    ]
  }
};
