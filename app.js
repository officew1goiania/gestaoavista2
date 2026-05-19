// Script Dashboard W1 - TV Version
document.addEventListener('DOMContentLoaded', () => {
    carregarUltimaAtualizacao();
    carregarDadosCSV();
    carregarRankingCSV();
    carregarRankingAPCSV();
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

    setInterval(() => {
        timeLeft -= 0.1;
        if (timeLeft <= 0) {
            timeLeft = SWITCH_TIME;
            alternarVisualizacao(viewResults, viewRanking, viewRankingAP);
        }

        // Atualiza a barra de progresso
        const percent = ((SWITCH_TIME - timeLeft) / SWITCH_TIME) * 100;
        if (progressBar) progressBar.style.width = `${percent}%`;
    }, 100);
}

function alternarVisualizacao(results, ranking, rankingAP) {
    results.classList.remove('active');
    ranking.classList.remove('active');
    rankingAP.classList.remove('active');

    if (currentView === 'results') {
        ranking.classList.add('active');
        currentView = 'ranking';
    } else if (currentView === 'ranking') {
        rankingAP.classList.add('active');
        currentView = 'ranking-ap';
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

    let totais = { aa: 0, af: 0, ap: 0, apValor: 0, rec: 0, pp: 0 };

    data.forEach(row => {
        const nome = row['Consultor/Nível'] || '';
        // Ignora linhas de cabeçalho ou separadoras
        if (!nome || nome.trim() === '' || nome.toLowerCase().includes('consultor')) return;

        totais.aa     += parseNumero(row['AA']);
        totais.af     += parseNumero(row['AF']);
        totais.ap     += parseNumero(row['AP']);
        totais.apValor+= parseNumero(row['AP [R$]']);
        totais.rec    += parseNumero(row['Recs']);
        totais.pp     += parseNumero(row['Total']);
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
}

function renderizarRanking(data) {
    const grid = document.getElementById('ranking-grid');
    if (!grid) return;

    grid.innerHTML = '';

    if (!data || data.length === 0) {
        grid.innerHTML = '<div class="loading-text">-</div>';
        return;
    }

    // Dividir os dados em 2 colunas
    const meio = Math.ceil(data.length / 2);
    const col1Data = data.slice(0, meio);
    const col2Data = data.slice(meio);

    function criarTabelaRanking(items, startOffset) {
        const table = document.createElement('table');
        table.className = 'ranking-column-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th width="60">#</th>
                    <th>Consultor</th>
                    <th style="text-align: center;">AA</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        const tbody = table.querySelector('tbody');

        items.forEach((row, index) => {
            const actualIndex = index + startOffset;
            const tr = document.createElement('tr');
            const medal = actualIndex === 0 ? '🥇' : actualIndex === 1 ? '🥈' : actualIndex === 2 ? '🥉' : (actualIndex + 1);
            const primeiroNome = row['Consultor'].split(' ')[0];

            tr.innerHTML = `
                <td style="text-align: center;">${medal}</td>
                <td>${primeiroNome}</td>
                <td style="text-align: center;" class="highlight-cell">${row['AA']}</td>
            `;
            tbody.appendChild(tr);
        });
        return table;
    }

    grid.appendChild(criarTabelaRanking(col1Data, 0));
    if (col2Data.length > 0) {
        grid.appendChild(criarTabelaRanking(col2Data, meio));
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

function renderizarRankingAP(data) {
    const grid = document.getElementById('ranking-ap-grid');
    if (!grid) return;

    grid.innerHTML = '';

    if (!data || data.length === 0) {
        grid.innerHTML = '<div class="loading-text">-</div>';
        return;
    }

    // Pega apenas os 5 primeiros
    const top5 = data.slice(0, 5);

    // Dividir os dados em 2 colunas
    const meio = Math.ceil(top5.length / 2);
    const col1Data = top5.slice(0, meio);
    const col2Data = top5.slice(meio);

    function criarTabelaRankingAP(items, startOffset) {
        const table = document.createElement('table');
        table.className = 'ranking-column-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th width="60">#</th>
                    <th>Consultor</th>
                    <th style="text-align: right; padding-right: 1.5vw;">Valor</th>
                    <th style="text-align: center; width: 80px;">Qtd</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        const tbody = table.querySelector('tbody');

        items.forEach((row, index) => {
            const actualIndex = index + startOffset;
            const tr = document.createElement('tr');
            const medal = actualIndex === 0 ? '🥇' : actualIndex === 1 ? '🥈' : actualIndex === 2 ? '🥉' : (actualIndex + 1);
            const primeiroNome = row['Consultor'].split(' ')[0];

            tr.innerHTML = `
                <td style="text-align: center;">${medal}</td>
                <td>${primeiroNome}</td>
                <td style="text-align: right; padding-right: 1.5vw;" class="highlight-cell">${row['Valor']}</td>
                <td style="text-align: center;">${row['Quantidade']}</td>
            `;
            tbody.appendChild(tr);
        });
        return table;
    }

    grid.appendChild(criarTabelaRankingAP(col1Data, 0));
    if (col2Data.length > 0) {
        grid.appendChild(criarTabelaRankingAP(col2Data, meio));
    }
}

// Auto-refresh a cada 10 minutos
setInterval(() => {
    carregarUltimaAtualizacao();
    carregarDadosCSV();
    carregarRankingCSV();
    carregarRankingAPCSV();
}, 10 * 60 * 1000);
