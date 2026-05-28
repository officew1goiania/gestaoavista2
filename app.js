// Script Dashboard W1 - TV Version

// Mapeamento manual de fotos para os consultores (opcional)
// Chave: Nome Completo do Consultor (como aparece no CSV)
// Valor: Caminho relativo do arquivo de imagem (ex: 'fotos/joao.jpg')
const CONFIG_FOTOS = {
    "Jallyson Henrique Alves Sobrinho": "fotos/jallyson_henrique_alves_sobrinho.png",
    "Marconiedson Rocha Paraguassú": "fotos/marconiedson_rocha_paraguassu.png",
    "Victor Hugo Rocha Martins": "fotos/victor_hugo_rocha_martins.jpeg"
};

// Gera a URL da foto do consultor com base no seu nome completo
function obterFotoUrl(nomeCompleto) {
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
    carregarRankingRECCSV();
    carregarDadosSemanaCSV();
    iniciarCicloExibicao();
});

let currentView = 'results';
const SWITCH_TIME = 10; // segundos
let timeLeft = SWITCH_TIME;

function iniciarCicloExibicao() {
    const progressBar = document.getElementById('progress-bar');
    const viewResults = document.getElementById('view-results');
    const viewRanking = document.getElementById('view-ranking');
    const viewRankingAP = document.getElementById('view-ranking-ap');
    const viewRankingREC = document.getElementById('view-ranking-rec');

    setInterval(() => {
        timeLeft -= 0.1;
        if (timeLeft <= 0) {
            timeLeft = SWITCH_TIME;
            alternarVisualizacao(viewResults, viewRanking, viewRankingAP, viewRankingREC);
        }

        // Atualiza a barra de progresso
        const percent = ((SWITCH_TIME - timeLeft) / SWITCH_TIME) * 100;
        if (progressBar) progressBar.style.width = `${percent}%`;
    }, 100);
}

function alternarVisualizacao(results, ranking, rankingAP, rankingREC) {
    results.classList.remove('active');
    ranking.classList.remove('active');
    rankingAP.classList.remove('active');
    if (rankingREC) rankingREC.classList.remove('active');

    if (currentView === 'results') {
        ranking.classList.add('active');
        currentView = 'ranking';
    } else if (currentView === 'ranking') {
        rankingAP.classList.add('active');
        currentView = 'ranking-ap';
    } else if (currentView === 'ranking-ap') {
        if (rankingREC) rankingREC.classList.add('active');
        currentView = 'ranking-rec';
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
            renderizarTabela(results.data);
        }
    });
}

function carregarRankingCSV() {
    Papa.parse('ranking_muapd.csv?t=' + new Date().getTime(), {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function (results) {
            renderizarRanking(results.data);
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

        totais.aa     += parseNumero(row['AA']);
        totais.af     += parseNumero(row['AF']);
        totais.ap     += parseNumero(row['AP']);
        totais.apValor+= parseNumero(row['AP [R$]']);
        totais.rec    += parseNumero(row['Recs']);
        totais.pp     += parseNumero(row['Total']);
        totais.c      += parseNumero(row['C']);
        totais.sf     += parseNumero(row['SF']);
    });

    const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    set('total-aa',      totais.aa);
    set('total-af',      totais.af);
    set('total-ap',      totais.ap);
    set('total-apvalor', formatarNumero(totais.apValor, true));
    set('total-rec',     totais.rec);
    set('total-pp',      formatarNumero(totais.pp));

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

function renderizarRanking(data) {
    const grid = document.getElementById('ranking-grid');
    if (!grid) return;

    grid.innerHTML = '';

    // Filtrar para remover quem está com 0 ou menos agendamentos (AA)
    const dadosFiltrados = (data || []).filter(row => parseNumero(row['AA']) > 0);

    if (dadosFiltrados.length === 0) {
        const totalEl = document.getElementById('ranking-total-aa');
        if (totalEl) totalEl.textContent = 0;

        grid.innerHTML = `
            <div class="alert-empty-ranking">
                <div class="alert-empty-icon-wrapper">
                    <div class="alert-empty-pulse"></div>
                    <div class="alert-empty-icon">⚠️</div>
                </div>
                <div>
                    <h3 class="alert-empty-title">Atenção!</h3>
                    <p class="alert-empty-desc">Ninguém fez MUAPD hoje!</p>
                </div>
            </div>
        `;
        return;
    }

    // Calcular o Total de AA
    let totalAA = 0;
    dadosFiltrados.forEach(row => {
        totalAA += parseNumero(row['AA']);
    });
    const totalEl = document.getElementById('ranking-total-aa');
    if (totalEl) totalEl.textContent = totalAA;

    // Dividir os dados em 2 colunas
    const meio = Math.ceil(dadosFiltrados.length / 2);
    const col1Data = dadosFiltrados.slice(0, meio);
    const col2Data = dadosFiltrados.slice(meio);

    function criarListaLeaderboard(items, startOffset) {
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

            const valor = row['AA'] || '0';

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
                    <div class="leaderboard-score">${valor}</div>
                </div>
            `;
            listContainer.appendChild(card);
        });
        return listContainer;
    }

    grid.appendChild(criarListaLeaderboard(col1Data, 0));
    if (col2Data.length > 0) {
        grid.appendChild(criarListaLeaderboard(col2Data, meio));
    }
}

function carregarRankingAPCSV() {
    Papa.parse('ranking_ap.csv?t=' + new Date().getTime(), {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function (results) {
            renderizarRankingAP(results.data);
        }
    });
}

function carregarRankingRECCSV() {
    Papa.parse('ranking_rec.csv?t=' + new Date().getTime(), {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function (results) {
            renderizarRankingREC(results.data);
        }
    });
}

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

function renderizarRankingREC(data) {
    const grid = document.getElementById('ranking-rec-grid');
    if (!grid) return;

    grid.innerHTML = '';

    const dadosFiltrados = (data || []).filter(row => parseNumero(row['Recs']) > 0);

    if (dadosFiltrados.length === 0) {
        grid.innerHTML = '<div class="loading-text">-</div>';
        return;
    }

    // Pega os 10 primeiros
    const top10 = dadosFiltrados.slice(0, 10);

    // Dividir os dados em 2 colunas
    const meio = Math.ceil(top10.length / 2);
    const col1Data = top10.slice(0, meio);
    const col2Data = top10.slice(meio);

    function criarListaLeaderboardREC(items, startOffset) {
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

            const recs = row['Recs'] || '0';

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
                    <div class="leaderboard-score">${recs} RECs</div>
                </div>
            `;
            listContainer.appendChild(card);
        });
        return listContainer;
    }

    grid.appendChild(criarListaLeaderboardREC(col1Data, 0));
    if (col2Data.length > 0) {
        grid.appendChild(criarListaLeaderboardREC(col2Data, meio));
    }
}

// Auto-refresh a cada 10 minutos
setInterval(() => {
    carregarUltimaAtualizacao();
    carregarDadosCSV();
    carregarRankingCSV();
    carregarRankingAPCSV();
    carregarRankingRECCSV();
    carregarDadosSemanaCSV();
}, 10 * 60 * 1000);
