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
    const tbody = document.getElementById('tableBody');
    const tfoot = document.getElementById('tableFooter');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (tfoot) tfoot.innerHTML = '';

    const consultoresAlvo = ["Gianlucca", "Daniela", "Tarek", "Mario"];
    const filtrados = data.filter(row => {
        const nome = row['Consultor/Nível'] || "";
        return consultoresAlvo.some(alvo => nome.toLowerCase().includes(alvo.toLowerCase()));
    });

    filtrados.sort((a, b) => parseNumero(b['Total']) - parseNumero(a['Total']));

    if (filtrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 50px;">Aguardando dados...</td></tr>';
        return;
    }

    let totais = { aa: 0, af: 0, ap: 0, apValor: 0, rec: 0, pp: 0 };

    filtrados.forEach(row => {
        const aa = parseNumero(row['AA']);
        const af = parseNumero(row['AF']);
        const ap = parseNumero(row['AP']);
        const valAP = parseNumero(row['AP [R$]']);
        const rec = parseNumero(row['Recs']);
        const valPP = parseNumero(row['Total']);

        totais.aa += aa;
        totais.af += af;
        totais.ap += ap;
        totais.apValor += valAP;
        totais.rec += rec;
        totais.pp += valPP;

        const tr = document.createElement('tr');
        const nomeCompleto = row['Consultor/Nível'].split(' (')[0].replace(/[^\w\sÀ-ú]/g, '').trim();
        const primeiroNome = nomeCompleto.split(' ')[0];

        tr.innerHTML = `
            <td>${primeiroNome}</td>
            <td class="center">${aa}</td>
            <td class="center">${af}</td>
            <td class="center">${ap}</td>
            <td class="center highlight-cell">${formatarNumero(valAP, true)}</td>
            <td class="center">${rec}</td>
            <td class="center highlight-cell">${formatarNumero(valPP)}</td>
        `;
        tbody.appendChild(tr);
    });

    if (tfoot) {
        const trTotal = document.createElement('tr');
        trTotal.className = 'total-row';
        trTotal.innerHTML = `
            <td><strong>TOTAL</strong></td>
            <td class="center"><strong>${totais.aa}</strong></td>
            <td class="center"><strong>${totais.af}</strong></td>
            <td class="center"><strong>${totais.ap}</strong></td>
            <td class="center highlight-cell"><strong>${formatarNumero(totais.apValor, true)}</strong></td>
            <td class="center"><strong>${totais.rec}</strong></td>
            <td class="center highlight-cell"><strong>${formatarNumero(totais.pp)}</strong></td>
        `;
        tfoot.appendChild(trTotal);
    }
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

    // Dividir os dados em 2 colunas
    const meio = Math.ceil(data.length / 2);
    const col1Data = data.slice(0, meio);
    const col2Data = data.slice(meio);

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
