// Script Dashboard W1 - TV Version

// Mapeamento manual de fotos para os consultores (opcional)
// Chave: Nome Completo do Consultor (como aparece no CSV)
// Valor: Caminho relativo do arquivo de imagem (ex: 'fotos/joao.jpg')
const CONFIG_FOTOS = {
    "Jallyson Henrique Alves Sobrinho": "fotos/jallyson_henrique_alves_sobrinho.png",
    "Victor Hugo Rocha Martins": "fotos/victor_hugo_rocha_martins.jpeg",
    "Durval Bernardes de Sousa Neto": "fotos/durval_bernardes_de_sousa_neto.jpeg",
    "Eduarda Cabral": "fotos/eduarda_cabral.jpeg",
    "Eduardo Verano Chaves Soares": "fotos/eduardo_verano_chaves_soares.jpeg",
    "Felipe Henrique Nunes Ungarelli": "fotos/felipe_henrique_nunes_ungarelli.png",
    "Gustavo Gomes de Alencar Cruz": "fotos/gustavo_cruz.png",
    "Micael Vinicius Bragança": "fotos/micael_vinicius_braganca.jpeg",
    "Iara Machado de Souza Azevedo": "fotos/iara_machado_de_souza_azevedo.jpeg",
    "Pedro Cano Benetton": "fotos/pedro_benetton.JPG",
    "Pedro Benetton": "fotos/pedro_benetton.JPG",
    "Daniela Calanca": "fotos/daniela_calanca.jpg",
    "Daniela Calanca da Silva": "fotos/daniela_calanca.jpg",
    "Saymon Santos": "fotos/saymon_de_gouveia_pereira_dos_santos.jpg",
    "Saymon Gouveia": "fotos/saymon_de_gouveia_pereira_dos_santos.jpg",
    "Eduardo Soares": "fotos/eduardo_verano_chaves_soares.jpeg",
    "Eduardo Verano": "fotos/eduardo_verano_chaves_soares.jpeg",
    "João Pedro Rosin Cardoso": "fotos/joao_pedro_rosin_cardoso.jpg",
    "André Giometti Rapcham": "fotos/andre_giometti_rapcham.jpg",
    "Felipe Costa Miguel": "fotos/felipe_costa_miguel.jpg",
    "Samuel Enrique Ivanaskas Duarte": "fotos/samuel_enrique_ivanaskas_duarte.jpeg",
    "Tarek Shamseddine Jarrah Mourad": "fotos/tarek_mourad.jpeg",
    "Tarek Mourad": "fotos/tarek_mourad.jpeg",
    "Victor Guilherme de Sousa Santos": "fotos/victor_guilherme_de_sousa_santos.jpeg",
    "Bryan Martins": "fotos/bryan_santos.jpg",
    "Bryan Martins dos Santos": "fotos/bryan_santos.jpg"
};

// Lista Mestre com todos os 27 consultores do Office Goiânia (ativos, correspondentes às fotos)
const TODOS_CONSULTORES = [
    "André Giometti Rapcham",
    "André Vinícius Santos e Silva",
    "Bryan Martins",
    "Daniela Calanca",
    "Durval Bernardes de Sousa Neto",
    "Eduarda Cabral",
    "Eduardo Verano",
    "Felipe Costa Miguel",
    "Felipe Henrique Nunes Ungarelli",
    "Gihad Nasih El Azanki",
    "Gustavo Gomes de Alencar Cruz",
    "Iara Machado de Souza Azevedo",
    "Jallyson Henrique Alves Sobrinho",
    "Jason Guilhardi Rosa e Silva",
    "João Pedro Rosin Cardoso",
    "João Victor Lima de Sousa",
    "Matheus Garcia de Brito Itagiba",
    "Micael Vinicius Bragança",
    "Murillo Caixeta",
    "Paulo Henrique Graciano",
    "Pedro Benetton",
    "Rafael Cabral Albernaz Rocha",
    "Samuel Enrique Ivanaskas Duarte",
    "Saymon Gouveia",
    "Tarek Mourad",
    "Victor Guilherme de Sousa Santos",
    "Victor Hugo Rocha Martins"
];

// Dicionário global para mapear nomes limpos aos seus cargos (ex: "FA I", "FA II")
const CARGOS_MAPEADOS = {
    "Daniela Calanca": "P",
    "Tarek Mourad": "P",
    "Gianlucca Venturi": "P",
    "Felipe Henrique Nunes Ungarelli": "FA III",
    "João Victor Lima de Sousa": "FA IV",
    "Matheus Garcia de Brito Itagiba": "FA III",
    "Victor Hugo Rocha Martins": "FA I",
    "Micael Vinicius Bragança": "FA II",
    "Paulo Henrique Graciano": "FA IV",
    "Murillo Caixeta": "FA III",
    "Eduarda Cabral": "FA III",
    "Jason Guilhardi Rosa e Silva": "FA II",
    "André Vinícius Santos e Silva": "FA II",
    "Samuel Enrique Ivanaskas Duarte": "FA I",
    "Gustavo Gomes de Alencar Cruz": "FA I",
    "Bryan Martins": "FA III"
};

// Função para registrar dinamicamente cargos a partir dos dados dos CSVs
function registrarCargos(data, campoNome) {
    if (!data) return;
    data.forEach(row => {
        const nomeCompleto = row[campoNome] || '';
        if (!nomeCompleto) return;
        const matchCargo = nomeCompleto.match(/\(([^)]+)\)/);
        if (matchCargo) {
            const nomeLimpo = nomeCompleto.replace(/\s*\(.*\)\s*/g, '').trim();
            const nomeNorm = normalizarNome(nomeLimpo);
            CARGOS_MAPEADOS[nomeNorm] = matchCargo[1];
        }
    });
}

// Função para normalizar e renomear nomes de consultores solicitados pelo usuário
function normalizarNome(nome) {
    if (!nome) return '';
    return nome
        .replace(/Daniela Calanca da Silva/g, "Daniela Calanca")
        .replace(/Daniela Silva/g, "Daniela Calanca")
        .replace(/Saymon de Gouveia Pereira dos Santos/g, "Saymon Gouveia")
        .replace(/Saymon Santos/g, "Saymon Gouveia")
        .replace(/Eduardo Verano Chaves Soares/g, "Eduardo Verano")
        .replace(/Eduardo Soares/g, "Eduardo Verano")
        .replace(/Bryan Martins dos Santos/g, "Bryan Martins");
}

// Gera a URL da foto do consultor com base no seu nome completo
function obterFotoUrl(nomeCompleto) {
    nomeCompleto = normalizarNome(nomeCompleto);
    if (!nomeCompleto) return '';

    // Remove parênteses como "(FA I)", "(FA II)"
    const nomeLimpo = nomeCompleto.replace(/\s*\(.*\)\s*/g, '').trim();

    // Se existir mapeamento explícito na configuração, usa-o
    if (CONFIG_FOTOS[nomeLimpo]) {
        return CONFIG_FOTOS[nomeLimpo];
    }

    // Fallback: normaliza o nome para gerar o padrão "fotos/nome_sobrenome.jpg"
    const nomeNormalizado = nomeLimpo
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // remove acentos
        .replace(/[^a-z0-9\s]/g, '')     // remove caracteres especiais
        .trim()
        .replace(/\s+/g, '_');          // substitui espaços por _

    return `fotos/${nomeNormalizado}.jpg`;
}

// Gera um gradiente dinâmico com base no nome do consultor para o avatar de fallback
function obterCorGradiente(nome) {
    nome = normalizarNome(nome);
    if (!nome) return 'linear-gradient(135deg, var(--w1-teal) 0%, var(--w1-dark) 100%)';
    const cores = [
        ['#00D2C8', '#05171E'], // Teal -> Dark
        ['#3B82F6', '#1E40AF'], // Blue -> Dark Blue
        ['#EC4899', '#9D174D'], // Pink -> Dark Pink
        ['#10B981', '#065F46'], // Green -> Dark Green
        ['#8B5CF6', '#5B21B6'], // Purple -> Dark Purple
        ['#F59E0B', '#92400E'], // Amber -> Dark Amber
        ['#F43F5E', '#9F1239'], // Rose -> Dark Rose
        ['#06B6D4', '#0891B2']  // Cyan -> Dark Cyan
    ];
    let hash = 0;
    for (let i = 0; i < nome.length; i++) {
        hash = nome.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % cores.length;
    return `linear-gradient(135deg, ${cores[index][0]} 0%, ${cores[index][1]} 100%)`;
}

document.addEventListener('DOMContentLoaded', () => {
    carregarUltimaAtualizacao();
    carregarDadosCSV();
    carregarRankingCSV();
    carregarRankingAPCSV();
    carregarRankingPPCSV();
    carregarDadosSemanaCSV();
    iniciarCicloExibicao();
    inicializarSyncManual();
});

let currentView = 'results';
const SWITCH_TIME = 10; // segundos
let timeLeft = SWITCH_TIME;
let checkStatusInterval = null;
let isWorkflowRunning = false;

function iniciarCicloExibicao() {
    const progressBar = document.getElementById('progress-bar');
    const bgTimerBar = document.getElementById('bg-timer-bar');
    const viewResults = document.getElementById('view-results');
    const viewRanking = document.getElementById('view-ranking');
    const viewRankingAP = document.getElementById('view-ranking-ap');
    const viewRankingPP = document.getElementById('view-ranking-pp');

    setInterval(() => {
        timeLeft -= 0.1;
        if (timeLeft <= 0) {
            timeLeft = SWITCH_TIME;
            alternarVisualizacao(viewResults, viewRanking, viewRankingAP, viewRankingPP);
        }

        // Atualiza a barra de progresso
        const percent = ((SWITCH_TIME - timeLeft) / SWITCH_TIME) * 100;
        if (progressBar) progressBar.style.width = `${percent}%`;

        // Atualiza o contorno do timer no fundo (circular)
        if (bgTimerBar) {
            const offset = 289 - (percent / 100) * 289;
            bgTimerBar.style.strokeDashoffset = offset;
        }
    }, 100);
}

function alternarVisualizacao(results, ranking, rankingAP, rankingPP) {
    results.classList.remove('active');
    ranking.classList.remove('active');
    rankingAP.classList.remove('active');
    if (rankingPP) rankingPP.classList.remove('active');

    if (currentView === 'results') {
        ranking.classList.add('active');
        currentView = 'ranking';
    } else if (currentView === 'ranking') {
        rankingAP.classList.add('active');
        currentView = 'ranking-ap';
    } else if (currentView === 'ranking-ap') {
        if (rankingPP) rankingPP.classList.add('active');
        currentView = 'ranking-pp';
    } else {
        results.classList.add('active');
        currentView = 'results';
    }
}

function parseNumero(str) {
    if (!str || str.trim() === '-' || str.trim() === '') return 0;
    let formatado = str.toString()
        .replace(/R\$/g, '')
        .replace(/\s/g, '')
        .replace(/\./g, '')
        .replace(',', '.')
        .trim();
    return parseFloat(formatado) || 0;
}

function formatarNumero(num, ehMoeda = false) {
    if (ehMoeda) {
        return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
    if (Number.isInteger(num)) return num.toString();
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function obterIniciais(nome) {
    nome = normalizarNome(nome);
    if (!nome) return 'W1';
    // Remove parênteses como "(FA I)", "(FA II)"
    const nomeLimpo = nome.replace(/\s*\(.*\)\s*/g, '').trim();
    const partes = nomeLimpo.split(/\s+/);
    if (partes.length === 0) return 'W1';
    if (partes.length === 1) {
        return partes[0].substring(0, 2).toUpperCase();
    }
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

function obterNomeExibicao(nome) {
    nome = normalizarNome(nome);
    if (!nome) return '';
    // Remove parênteses como "(FA I)", "(FA II)"
    const nomeLimpo = nome.replace(/\s*\(.*\)\s*/g, '').trim();
    const partes = nomeLimpo.split(/\s+/);
    if (partes.length === 0) return '';
    if (partes.length === 1) return partes[0];
    return partes[0] + ' ' + partes[partes.length - 1];
}

function carregarUltimaAtualizacao() {
    fetch('last_update.txt?t=' + new Date().getTime())
        .then(response => response.text())
        .then(isoString => {
            const date = new Date(isoString);
            document.getElementById('update-time').textContent = date.toLocaleString('pt-BR');
        })
        .catch(() => {
            document.getElementById('update-time').textContent = "Sincronizando...";
        });
}

function carregarDadosCSV() {
    Papa.parse('dados_extraidos.csv?t=' + new Date().getTime(), {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function (results) {
            registrarCargos(results.data, 'Consultor/Nível');
            renderizarTabela(results.data);
        }
    });
}

function carregarRankingPPCSV() {
    Papa.parse('ranking_pp.csv?t=' + new Date().getTime(), {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function (results) {
            registrarCargos(results.data, 'Consultor');
            renderizarRankingPP(results.data);
        }
    });
}

function carregarRankingCSV() {
    Papa.parse('ranking_muapd.csv?t=' + new Date().getTime(), {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function (results) {
            registrarCargos(results.data, 'Consultor');
            
            // Carrega o histórico JSON
            fetch('historico_muapd.json?t=' + new Date().getTime())
                .then(response => {
                    if (!response.ok) throw new Error("Sem histórico");
                    return response.json();
                })
                .then(historico => {
                    renderizarRankingEMaratona(results.data, historico);
                })
                .catch(() => {
                    // Fallback se falhar
                    renderizarRankingEMaratona(results.data, {});
                });
        }
    });
}

function renderizarTabela(data) {
    if (!data || data.length === 0) return;

    let totais = { aa: 0, af: 0, ap: 0, apValor: 0, rec: 0, pp: 0, c: 0, sf: 0 };
    let metas = { apValor: 0, pp: 0 };

    // Extrai as metas diretamente dos quadros do topo da tela
    const elApMes = document.querySelector('.goal-box.ap-mes .goal-value');
    const elPpMes = document.querySelector('.goal-box.pp-mes .goal-value');
    if (elApMes) metas.apValor = parseNumero(elApMes.textContent);
    if (elPpMes) metas.pp = parseNumero(elPpMes.textContent);

    data.forEach(row => {
        const nome = (row['Consultor/Nível'] || '').trim();
        if (!nome) return;
        const nomeLower = nome.toLowerCase();

        // Ignora linhas de eficiências, TOTAL, etc.
        if (
            nomeLower.includes('eficiência') ||
            nomeLower.includes('eficiencias') ||
            nomeLower === 'total' ||
            nomeLower.includes('consultor')
        ) return;

        totais.aa += parseNumero(row['AA']);
        totais.af += parseNumero(row['AF']);
        totais.ap += parseNumero(row['AP']);
        totais.apValor += parseNumero(row['AP [R$]']);
        totais.rec += parseNumero(row['Recs']);
        totais.pp += parseNumero(row['Total']);
        totais.c += parseNumero(row['C']);
        totais.sf += parseNumero(row['SF']);
    });

    const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    set('total-aa', totais.aa);
    set('total-af', totais.af);
    set('total-ap', totais.ap);
    set('total-apvalor', formatarNumero(totais.apValor, true));
    set('total-rec', totais.rec);
    set('total-pp', formatarNumero(totais.pp));

    // Atualiza barras de progresso
    const updateProgress = (metric, atual, meta) => {
        const bgEl = document.getElementById(`bar-${metric}`);
        const textEl = document.getElementById(`text-${metric}`);
        if (!bgEl || !textEl) return;

        const percent = meta > 0 ? (atual / meta) * 100 : 0;
        bgEl.style.width = `${Math.min(percent, 100)}%`;

        // Formata a meta para exibição
        const metaFormatada = metric === 'apvalor' ? formatarNumero(meta, true) : formatarNumero(meta);
        textEl.innerHTML = `<strong>${percent.toFixed(1)}%</strong> da meta (${metaFormatada})`;

        // Muda cor caso atinja a meta
        if (percent >= 100) {
            bgEl.style.backgroundColor = '#10b981'; // Verde sucesso
        }
    };

    const metaRec = (totais.af + totais.c + totais.sf) * 5;

    updateProgress('apvalor', totais.apValor, metas.apValor);
    updateProgress('pp', totais.pp, metas.pp);
    updateProgress('rec', totais.rec, metaRec);
}

function carregarDadosSemanaCSV() {
    Papa.parse('dados_semana.csv?t=' + new Date().getTime(), {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function (results) {
            registrarCargos(results.data, 'Consultor/Nível');
            renderizarTabelaSemana(results.data);
        }
    });
}

function renderizarTabelaSemana(data) {
    if (!data || data.length === 0) return;

    let totaisSemana = { apValor: 0, pp: 0 };
    let metasSemana = { apValor: 0, pp: 0 };

    // Extrai as metas da semana diretamente dos quadros do topo da tela
    const elApSemana = document.querySelector('.goal-box.ap-semana .goal-value');
    const elPpSemana = document.querySelector('.goal-box.pp-semana .goal-value');
    if (elApSemana) metasSemana.apValor = parseNumero(elApSemana.textContent);
    if (elPpSemana) metasSemana.pp = parseNumero(elPpSemana.textContent);

    data.forEach(row => {
        const nome = (row['Consultor/Nível'] || '').trim();
        if (!nome) return;
        const nomeLower = nome.toLowerCase();

        if (
            nomeLower.includes('eficiência') ||
            nomeLower.includes('eficiencias') ||
            nomeLower === 'total' ||
            nomeLower.includes('consultor')
        ) return;

        totaisSemana.apValor += parseNumero(row['AP [R$]']);
        totaisSemana.pp += parseNumero(row['Total']);
    });

    const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    set('total-apvalor-semana', formatarNumero(totaisSemana.apValor, true));
    set('total-pp-semana', formatarNumero(totaisSemana.pp));

    const updateProgressSemana = (metric, atual, meta) => {
        const bgEl = document.getElementById(`bar-${metric}-semana`);
        const textEl = document.getElementById(`text-${metric}-semana`);
        if (!bgEl || !textEl) return;

        const percent = meta > 0 ? (atual / meta) * 100 : 0;
        bgEl.style.width = `${Math.min(percent, 100)}%`;

        const metaFormatada = metric === 'apvalor' ? formatarNumero(meta, true) : formatarNumero(meta);
        textEl.innerHTML = `<strong>${percent.toFixed(1)}%</strong> da meta (${metaFormatada})`;

        if (percent >= 100) {
            bgEl.style.backgroundColor = '#10b981'; // Verde sucesso
        }
    };

    updateProgressSemana('apvalor', totaisSemana.apValor, metasSemana.apValor);
    updateProgressSemana('pp', totaisSemana.pp, metasSemana.pp);
}

function renderizarRankingEMaratona(data, historico) {
    const grid = document.getElementById('ranking-grid');
    if (!grid) return;

    grid.innerHTML = '';

    // Mapeia os dados do CSV para acesso rápido (nome normalizado -> valor AA)
    const mapAA = {};
    (data || []).forEach(row => {
        const nomeCompleto = row['Consultor'] || '';
        const nomeLimpo = nomeCompleto.replace(/\s*\(.*\)\s*/g, '').trim();
        const nomeNorm = normalizarNome(nomeLimpo);
        mapAA[nomeNorm] = parseNumero(row['AA']);
    });

    // Calcula o Total de AA geral
    let totalAA = 0;
    Object.values(mapAA).forEach(val => {
        totalAA += val;
    });
    const totalEl = document.getElementById('ranking-total-aa');
    if (totalEl) totalEl.textContent = totalAA;

    // Constrói a lista com todos os 27 consultores
    const listaCompleta = TODOS_CONSULTORES.map(nomeConsultor => {
        const nomeNorm = normalizarNome(nomeConsultor);
        const aaVal = mapAA[nomeNorm] || 0;
        return {
            nomeCompleto: nomeConsultor,
            aa: aaVal
        };
    });

    // Ordenação: primeiro quem tem AA > 0 (decrescente por AA), depois quem tem AA == 0 (alfabético por nome de exibição)
    listaCompleta.sort((a, b) => {
        if (a.aa > 0 && b.aa > 0) {
            return b.aa - a.aa;
        }
        if (a.aa > 0 && b.aa === 0) {
            return -1;
        }
        if (a.aa === 0 && b.aa > 0) {
            return 1;
        }
        // Ambos zerados: ordem alfabética do nome de exibição
        const nomeA = obterNomeExibicao(a.nomeCompleto).toLowerCase();
        const nomeB = obterNomeExibicao(b.nomeCompleto).toLowerCase();
        return nomeA.localeCompare(nomeB, 'pt-BR');
    });

    // Divide em 2 colunas para caber a maratona à direita
    const totalItens = listaCompleta.length;
    const colunaTamanho = Math.ceil(totalItens / 2);
    const col1Data = listaCompleta.slice(0, colunaTamanho);
    const col2Data = listaCompleta.slice(colunaTamanho);

    function criarListaLeaderboard(items, startOffset) {
        const listContainer = document.createElement('div');
        listContainer.className = 'leaderboard-list';

        items.forEach((row, index) => {
            const actualIndex = index + startOffset;
            const card = document.createElement('div');
            const aaVal = row.aa;

            let rankClass = 'rank-other';
            let medal = '';

            if (aaVal > 0) {
                // Quem já fez ganha rank e medalha
                const rankPos = actualIndex + 1; // Posição no ranking ordenado
                medal = rankPos;
                if (actualIndex === 0) {
                    rankClass = 'rank-1';
                    medal = '🥇';
                } else if (actualIndex === 1) {
                    rankClass = 'rank-2';
                    medal = '🥈';
                } else if (actualIndex === 2) {
                    rankClass = 'rank-3';
                    medal = '🥉';
                }
            } else {
                // Zerados: classe rank-other e '❌' no lugar da posição
                rankClass = 'rank-other';
                medal = '❌';
            }

            card.className = `leaderboard-card ${rankClass}`;

            const nomeCompleto = row.nomeCompleto;
            const nomeExibicao = obterNomeExibicao(nomeCompleto);
            const iniciais = obterIniciais(nomeCompleto);

            // Tenta pegar o cargo dinamicamente, senão usa do mapping, senão padrão
            const nomeNorm = normalizarNome(nomeCompleto);
            const cargoMapeado = CARGOS_MAPEADOS[nomeNorm];
            const sublabel = cargoMapeado || 'Consultor';

            let detailsHtml = '';
            let scoreHtml = '';

            if (aaVal > 0) {
                // Feito com badge e quantidade
                detailsHtml = `
                    <span class="leaderboard-name">${nomeExibicao}</span>
                    <span class="leaderboard-subdetails">
                        ${sublabel}
                        <span class="feito-badge">feito!</span>
                    </span>
                `;
                scoreHtml = `
                    <div class="leaderboard-score-container">
                        <div class="leaderboard-score">${aaVal}</div>
                    </div>
                `;
            } else {
                // Zerado sem badge especial e com pontuação zero opaca
                detailsHtml = `
                    <span class="leaderboard-name">${nomeExibicao}</span>
                    <span class="leaderboard-subdetails">${sublabel}</span>
                `;
                scoreHtml = `
                    <div class="leaderboard-score-container">
                        <div class="leaderboard-score zero-score">0</div>
                    </div>
                `;
            }

            card.innerHTML = `
                <div class="leaderboard-rank">${medal}</div>
                <div class="leaderboard-avatar-container">
                    <div class="leaderboard-avatar-fallback" style="background: ${obterCorGradiente(nomeCompleto)}">${iniciais}</div>
                    <img src="${obterFotoUrl(nomeCompleto)}" onload="this.style.display='block';" onerror="this.style.display='none';" class="leaderboard-avatar-img" style="display: none;" alt="${nomeExibicao}">
                </div>
                <div class="leaderboard-details">
                    ${detailsHtml}
                </div>
                ${scoreHtml}
            `;
            listContainer.appendChild(card);
        });
        return listContainer;
    }

    grid.appendChild(criarListaLeaderboard(col1Data, 0));
    if (col2Data.length > 0) {
        grid.appendChild(criarListaLeaderboard(col2Data, colunaTamanho));
    }

    // ==========================================
    // RENDERIZAÇÃO DA MARATONA MUAPD (DIREITA)
    // ==========================================
    const chavesOrdenadas = Object.keys(historico || {})
        .filter(k => k >= "2026-07-06")
        .sort();

    let diasPassados = [];
    let diaAtual = null;

    if (chavesOrdenadas.length > 0) {
        // O último dia no histórico é o dia atual (hoje)
        diaAtual = chavesOrdenadas[chavesOrdenadas.length - 1];
        diasPassados = chavesOrdenadas.slice(0, chavesOrdenadas.length - 1);
    }

    // Calcula os participantes da maratona (devem ter MUAPD > 0 em todos os dias úteis registrados no histórico, inclusive hoje)
    const participantesMaratona = TODOS_CONSULTORES.filter(nomeConsultor => {
        const nomeNorm = normalizarNome(nomeConsultor);
        
        // Verifica se esteve ativo em todos os dias (incluindo o dia atual)
        for (const dia of chavesOrdenadas) {
            const ativosNoDia = (historico[dia] || []).map(n => normalizarNome(n.replace(/\s*\(.*\)\s*/g, '').trim()));
            if (!ativosNoDia.includes(nomeNorm)) {
                return false; // Falhou em algum dia ou ainda não marcou hoje
            }
        }
        return true;
    });

    // Ordenação da Maratona: ordem alfabética do nome de exibição
    participantesMaratona.sort((a, b) => {
        return obterNomeExibicao(a).localeCompare(obterNomeExibicao(b), 'pt-BR');
    });

    const maratonaListContainer = document.getElementById('maratona-list');
    if (maratonaListContainer) {
        maratonaListContainer.innerHTML = '';
        if (participantesMaratona.length === 0) {
            maratonaListContainer.innerHTML = '<div class="loading-text" style="color: rgba(255,255,255,0.3); padding-top: 5vh; font-size: 1rem; text-align: center;">Ninguém com consistência hoje</div>';
        } else {
            participantesMaratona.forEach(nomeConsultor => {
                const card = document.createElement('div');
                const nomeExibicao = obterNomeExibicao(nomeConsultor);
                const iniciais = obterIniciais(nomeConsultor);
                
                card.className = 'maratona-card completed';
                
                card.innerHTML = `
                    <div class="maratona-avatar-container">
                        <div class="maratona-avatar-fallback" style="background: ${obterCorGradiente(nomeConsultor)}">${iniciais}</div>
                        <img src="${obterFotoUrl(nomeConsultor)}" onload="this.style.display='block';" onerror="this.style.display='none';" class="maratona-avatar-img" style="display: none;" alt="${nomeExibicao}">
                    </div>
                    <div class="maratona-details">
                        <span class="maratona-name">${nomeExibicao}</span>
                    </div>
                    <span class="maratona-status-icon done" title="Consistente!">🔥</span>
                `;
                maratonaListContainer.appendChild(card);
            });
        }
    }
}

function carregarRankingAPCSV() {
    Papa.parse('ranking_ap.csv?t=' + new Date().getTime(), {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function (results) {
            registrarCargos(results.data, 'Consultor');
            renderizarRankingAP(results.data);
        }
    });
}

// carregarRankingRECCSV removido

function renderizarRankingAP(data) {
    const grid = document.getElementById('ranking-ap-grid');
    if (!grid) return;

    grid.innerHTML = '';

    const dadosFiltrados = (data || []).filter(row => parseNumero(row['Quantidade']) > 0);

    if (dadosFiltrados.length === 0) {
        grid.innerHTML = '<div class="loading-text">-</div>';
        return;
    }

    // Pega apenas os 10 primeiros
    const top10 = dadosFiltrados.slice(0, 10);

    // Dividir os dados em 2 colunas
    const meio = Math.ceil(top10.length / 2);
    const col1Data = top10.slice(0, meio);
    const col2Data = top10.slice(meio);

    function criarListaLeaderboardAP(items, startOffset) {
        const listContainer = document.createElement('div');
        listContainer.className = 'leaderboard-list';

        items.forEach((row, index) => {
            const actualIndex = index + startOffset;
            const card = document.createElement('div');

            let rankClass = 'rank-other';
            let medal = actualIndex + 1;
            if (actualIndex === 0) {
                rankClass = 'rank-1';
                medal = '🥇';
            } else if (actualIndex === 1) {
                rankClass = 'rank-2';
                medal = '🥈';
            } else if (actualIndex === 2) {
                rankClass = 'rank-3';
                medal = '🥉';
            }

            card.className = `leaderboard-card ${rankClass}`;

            const nomeCompleto = row['Consultor'] || '';
            const nomeExibicao = obterNomeExibicao(nomeCompleto);
            const iniciais = obterIniciais(nomeCompleto);

            let sublabel = 'Consultor';
            const matchCargo = nomeCompleto.match(/\(([^)]+)\)/);
            if (matchCargo) {
                sublabel = matchCargo[1];
            }

            const valor = row['Valor'] || 'R$ 0';
            const qtd = row['Quantidade'] || '0';

            card.innerHTML = `
                <div class="leaderboard-rank">${medal}</div>
                <div class="leaderboard-avatar-container">
                    <div class="leaderboard-avatar-fallback" style="background: ${obterCorGradiente(nomeCompleto)}">${iniciais}</div>
                    <img src="${obterFotoUrl(nomeCompleto)}" onload="this.style.display='block';" onerror="this.style.display='none';" class="leaderboard-avatar-img" style="display: none;" alt="${nomeExibicao}">
                </div>
                <div class="leaderboard-details">
                    <span class="leaderboard-name">${nomeExibicao}</span>
                    <span class="leaderboard-subdetails">${sublabel}</span>
                </div>
                <div class="leaderboard-score-container">
                    <div class="leaderboard-secondary-score">${qtd} APs</div>
                    <div class="leaderboard-score">${valor}</div>
                </div>
            `;
            listContainer.appendChild(card);
        });
        return listContainer;
    }

    grid.appendChild(criarListaLeaderboardAP(col1Data, 0));
    if (col2Data.length > 0) {
        grid.appendChild(criarListaLeaderboardAP(col2Data, meio));
    }
}

// renderizarRankingREC removido

function renderizarRankingPP(data) {
    const grid = document.getElementById('ranking-pp-grid');
    if (!grid) return;

    grid.innerHTML = '';

    const dadosFiltrados = (data || []).filter(row => parseNumero(row['PP']) > 0);

    if (dadosFiltrados.length === 0) {
        grid.innerHTML = '<div class="loading-text">-</div>';
        return;
    }

    // Pega os 10 primeiros (já ordenados e limpos no Python)
    const top10 = dadosFiltrados.slice(0, 10);

    // Dividir os dados em 2 colunas
    const meio = Math.ceil(top10.length / 2);
    const col1Data = top10.slice(0, meio);
    const col2Data = top10.slice(meio);

    function criarListaLeaderboardPP(items, startOffset) {
        const listContainer = document.createElement('div');
        listContainer.className = 'leaderboard-list';

        items.forEach((row, index) => {
            const actualIndex = index + startOffset;
            const card = document.createElement('div');

            let rankClass = 'rank-other';
            let medal = actualIndex + 1;
            if (actualIndex === 0) {
                rankClass = 'rank-1';
                medal = '🥇';
            } else if (actualIndex === 1) {
                rankClass = 'rank-2';
                medal = '🥈';
            } else if (actualIndex === 2) {
                rankClass = 'rank-3';
                medal = '🥉';
            }

            card.className = `leaderboard-card ${rankClass}`;

            const nomeCompleto = row['Consultor'] || '';
            const nomeExibicao = obterNomeExibicao(nomeCompleto);
            const iniciais = obterIniciais(nomeCompleto);

            let sublabel = 'Consultor';
            const matchCargo = nomeCompleto.match(/\(([^)]+)\)/);
            if (matchCargo) {
                sublabel = matchCargo[1];
            }

            const valorFormato = formatarNumero(parseNumero(row['PP']));

            card.innerHTML = `
                <div class="leaderboard-rank">${medal}</div>
                <div class="leaderboard-avatar-container">
                    <div class="leaderboard-avatar-fallback" style="background: ${obterCorGradiente(nomeCompleto)}">${iniciais}</div>
                    <img src="${obterFotoUrl(nomeCompleto)}" onload="this.style.display='block';" onerror="this.style.display='none';" class="leaderboard-avatar-img" style="display: none;" alt="${nomeExibicao}">
                </div>
                <div class="leaderboard-details">
                    <span class="leaderboard-name">${nomeExibicao}</span>
                    <span class="leaderboard-subdetails">${sublabel}</span>
                </div>
                <div class="leaderboard-score-container">
                    <div class="leaderboard-score">${valorFormato} PPs</div>
                </div>
            `;
            listContainer.appendChild(card);
        });
        return listContainer;
    }

    grid.appendChild(criarListaLeaderboardPP(col1Data, 0));
    if (col2Data.length > 0) {
        grid.appendChild(criarListaLeaderboardPP(col2Data, meio));
    }
}

// Auto-refresh a cada 10 minutos
setInterval(() => {
    carregarUltimaAtualizacao();
    carregarDadosCSV();
    carregarRankingCSV();
    carregarRankingAPCSV();
    carregarRankingPPCSV();
    carregarDadosSemanaCSV();
}, 10 * 60 * 1000);

// Função para configurar e gerenciar a sincronização manual
function inicializarSyncManual() {
    // Verifica se o token foi passado via parâmetro de URL (facilitando configuração na TV)
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('pat') || urlParams.get('token');
    if (urlToken && urlToken.trim().startsWith('ghp_')) {
        localStorage.setItem('github_pat_token', urlToken.trim());
        // Limpa o parâmetro da URL para segurança e estética
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
        alert('Token do GitHub configurado com sucesso neste dispositivo!');
    }

    const btnSync = document.getElementById('btn-sync');
    if (!btnSync) return;

    // Cria o Modal de Autenticação se não existir
    if (!document.getElementById('auth-modal-overlay')) {
        const modalHtml = `
            <div id="auth-modal-overlay" class="auth-modal-overlay">
                <div class="auth-modal">
                    <h3>Autenticação Requerida</h3>
                    <p>Para acionar o robô de atualização diretamente pelo painel, você precisa de um <strong>Personal Access Token (PAT)</strong> do GitHub com permissão de escrita em Actions:</p>
                    <ol>
                        <li>Acesse o GitHub -> Developer settings -> Personal access tokens -> Tokens (classic).</li>
                        <li>Gere um novo token clássico e marque a caixinha <strong>workflow</strong>.</li>
                        <li>Cole o token abaixo (ele ficará salvo de forma privada apenas na TV/computador atual).</li>
                    </ol>
                    <div class="auth-input-group">
                        <label for="github-pat-input">Token do GitHub (PAT)</label>
                        <input type="password" id="github-pat-input" class="auth-input" placeholder="ghp_xxxxxxxxxxxxxxxxxxxx">
                    </div>
                    <div class="auth-actions">
                        <button id="btn-auth-cancel" class="btn-cancel">Cancelar</button>
                        <button id="btn-auth-save" class="btn-save">Salvar e Acionar</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    const modalOverlay = document.getElementById('auth-modal-overlay');
    const patInput = document.getElementById('github-pat-input');
    const btnCancel = document.getElementById('btn-auth-cancel');
    const btnSave = document.getElementById('btn-auth-save');

    btnSync.addEventListener('click', (e) => {
        e.preventDefault();
        const savedToken = localStorage.getItem('github_pat_token');
        if (!savedToken) {
            modalOverlay.classList.add('active');
            patInput.focus();
        } else {
            acionarRobotWorkflow(savedToken);
        }
    });

    btnCancel.addEventListener('click', (e) => {
        e.preventDefault();
        modalOverlay.classList.remove('active');
        patInput.value = '';
    });

    btnSave.addEventListener('click', (e) => {
        e.preventDefault();
        const token = patInput.value.trim();
        if (token) {
            localStorage.setItem('github_pat_token', token);
            modalOverlay.classList.remove('active');
            acionarRobotWorkflow(token);
            setTimeout(() => {
                iniciarMonitoramentoWorkflow();
            }, 1000);
        } else {
            alert('Por favor, insira um token válido.');
        }
    });

    // Inicia monitoramento caso já tenha o token salvo ou monitoramento anônimo
    iniciarMonitoramentoWorkflow();
}

function iniciarMonitoramentoWorkflow() {
    if (checkStatusInterval) clearInterval(checkStatusInterval);

    // Se tiver token, checa a cada 15 segundos. Se não tiver, checa a cada 120 segundos (anônimo) para respeitar limite
    const token = localStorage.getItem('github_pat_token');
    const intervalTime = token ? 15000 : 120000;

    // Faz a primeira checagem imediata
    consultarStatusGitHub();

    checkStatusInterval = setInterval(() => {
        consultarStatusGitHub();
    }, intervalTime);
}

function consultarStatusGitHub() {
    const btnSync = document.getElementById('btn-sync');
    if (!btnSync) return;

    const syncText = btnSync.querySelector('.sync-text');
    const syncIcon = btnSync.querySelector('.sync-icon');

    const token = localStorage.getItem('github_pat_token');
    const headers = {
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    fetch('https://api.github.com/repos/officew1goiania/gestaoavista2/actions/workflows/scraper.yml/runs?per_page=1', {
        headers: headers
    })
    .then(response => {
        if (response.status === 401) {
            localStorage.removeItem('github_pat_token');
            resetarBotaoSync();
            iniciarMonitoramentoWorkflow(); // Reinicia como anônimo
            return;
        }
        if (!response.ok) throw new Error("Erro na requisição");
        return response.json();
    })
    .then(data => {
        if (!data || !data.workflow_runs || data.workflow_runs.length === 0) return;

        const latestRun = data.workflow_runs[0];
        const status = latestRun.status;
        const runningStatuses = ['queued', 'in_progress', 'waiting', 'requested', 'pending'];
        const token = localStorage.getItem('github_pat_token');

        if (runningStatuses.includes(status)) {
            // A Action está rodando
            if (!isWorkflowRunning) {
                isWorkflowRunning = true;
                // Aumenta a frequência de monitoramento (15 segundos para anônimo, 8 para com token)
                clearInterval(checkStatusInterval);
                const fastInterval = token ? 8000 : 15000;
                checkStatusInterval = setInterval(() => {
                    consultarStatusGitHub();
                }, fastInterval);
            }
            
            btnSync.disabled = true;
            btnSync.classList.add('loading');
            syncIcon.textContent = '🔄';
            syncText.textContent = 'Rodando...';
            btnSync.style.borderColor = 'rgba(250, 204, 21, 0.4)';
            btnSync.style.color = '#facc15';
            btnSync.style.background = 'rgba(250, 204, 21, 0.08)';
        } else {
            // Finalizada / Ociosa
            if (isWorkflowRunning) {
                // Acabou de finalizar!
                isWorkflowRunning = false;
                
                // Recarrega todos os dados
                carregarUltimaAtualizacao();
                carregarDadosCSV();
                carregarRankingCSV();
                carregarRankingAPCSV();
                carregarRankingPPCSV();
                carregarDadosSemanaCSV();

                // Mostra feedback de conclusão
                syncIcon.textContent = '✅';
                syncText.textContent = 'Atualizado!';
                btnSync.style.borderColor = 'rgba(16, 185, 129, 0.4)';
                btnSync.style.color = '#10b981';
                btnSync.style.background = 'rgba(16, 185, 129, 0.08)';

                setTimeout(() => {
                    resetarBotaoSync();
                    iniciarMonitoramentoWorkflow(); // Volta para a checagem normal
                }, 5000);
            } else {
                resetarBotaoSync();
            }
        }
    })
    .catch(err => {
        console.error("Erro ao verificar status do workflow:", err);
    });
}

function resetarBotaoSync() {
    const btnSync = document.getElementById('btn-sync');
    if (!btnSync || isWorkflowRunning) return;

    btnSync.disabled = false;
    btnSync.classList.remove('loading');
    btnSync.querySelector('.sync-icon').textContent = '🔄';
    btnSync.querySelector('.sync-text').textContent = 'Atualizar Agora';
    btnSync.style.borderColor = '';
    btnSync.style.color = '';
    btnSync.style.background = '';
}

function acionarRobotWorkflow(token) {
    const btnSync = document.getElementById('btn-sync');
    if (!btnSync) return;

    const syncText = btnSync.querySelector('.sync-text');
    const originalText = syncText.textContent;

    btnSync.disabled = true;
    btnSync.classList.add('loading');
    syncText.textContent = 'Enviando...';

    // Dispara a API do GitHub Actions (workflow_dispatch)
    fetch('https://api.github.com/repos/officew1goiania/gestaoavista2/actions/workflows/scraper.yml/dispatches', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28'
        },
        body: JSON.stringify({ ref: 'main' })
    })
    .then(response => {
        btnSync.classList.remove('loading');
        if (response.status === 204) {
            btnSync.querySelector('.sync-icon').textContent = '✅';
            syncText.textContent = 'Acionado!';
            
            // Aguarda 4 segundos e então força o estado ativo e o monitoramento imediato
            setTimeout(() => {
                isWorkflowRunning = true;
                iniciarMonitoramentoWorkflow();
            }, 4000);
        } else if (response.status === 401) {
            localStorage.removeItem('github_pat_token');
            btnSync.disabled = false;
            syncText.textContent = originalText;
            alert('Token do GitHub expirado ou inválido. Por favor, insira um novo token.');
            document.getElementById('auth-modal-overlay').classList.add('active');
            document.getElementById('github-pat-input').focus();
        } else {
            throw new Error('Falha no acionamento (Status: ' + response.status + ')');
        }
    })
    .catch(error => {
        btnSync.classList.remove('loading');
        btnSync.disabled = false;
        syncText.textContent = originalText;
        console.error(error);
        alert('Erro ao acionar o robô: ' + (error.message || 'Verifique sua conexão ou permissões do token.'));
    });
}
