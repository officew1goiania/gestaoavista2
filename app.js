// Script Dashboard W1 - TV Version
document.addEventListener('DOMContentLoaded', () => {
    carregarUltimaAtualizacao();
    carregarDadosCSV();
    carregarRankingCSV(); 
});

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
        complete: function(results) {
            renderizarTabela(results.data);
        }
    });
}

function carregarRankingCSV() {
    Papa.parse('ranking_muapd.csv?t=' + new Date().getTime(), {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            renderizarRanking(results.data);
        }
    });
}

function renderizarTabela(data) {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    
    tbody.innerHTML = ''; 

    const consultoresAlvo = ["Gianlucca", "Daniela", "Tarek"];
    const filtrados = data.filter(row => {
        const nome = row['Consultor/Nível'] || "";
        return consultoresAlvo.some(alvo => nome.toLowerCase().includes(alvo.toLowerCase()));
    });

    if (filtrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 50px;">Aguardando dados...</td></tr>';
        return;
    }

    let totalEscritorioAP = 0;
    let totalEscritorioPP = 0;

    filtrados.forEach(row => {
        const valAP = parseNumero(row['AP [R$]']);
        const valPP = parseNumero(row['Total']);
        totalEscritorioAP += valAP;
        totalEscritorioPP += valPP;

        const tr = document.createElement('tr');
        const nomeCurto = row['Consultor/Nível'].split(' (')[0].replace(/[^\w\sÀ-ú]/g, '').trim(); 
        
        tr.innerHTML = `
            <td>${nomeCurto}</td>
            <td class="center">${formatarNumero(parseNumero(row['AA']))}</td>
            <td class="center">${formatarNumero(parseNumero(row['AF']))}</td>
            <td class="center">${formatarNumero(parseNumero(row['AP']))}</td>
            <td class="center">${formatarNumero(valAP, true)}</td>
            <td class="center">${formatarNumero(parseNumero(row['Recs']))}</td>
            <td class="center highlight-cell">${formatarNumero(valPP)}</td>
        `;
        tbody.appendChild(tr);
    });

    atualizarBarrasMetas(totalEscritorioAP, totalEscritorioPP);
}

function renderizarRanking(data) {
    const tbody = document.getElementById('rankingBody');
    if (!tbody) return;
    
    tbody.innerHTML = ''; 

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 50px;">Nenhum ranking disponível...</td></tr>';
        return;
    }

    data.forEach((row, index) => {
        const tr = document.createElement('tr');
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : (index + 1);
        
        tr.innerHTML = `
            <td class="center">${medal}</td>
            <td>${row['Consultor']}</td>
            <td class="center highlight-cell">${row['AA']}</td>
        `;
        tbody.appendChild(tr);
    });
}

function iniciarAlternanciaTelas() {
    let telaAtual = 'producao'; 
    const tempoTroca = 10 * 60 * 1000; 

    setInterval(() => {
        const prodView = document.getElementById('production-view');
        const rankView = document.getElementById('ranking-view');
        const title = document.getElementById('view-title');
        const subtitle = document.getElementById('view-subtitle');

        if (telaAtual === 'producao') {
            prodView.style.display = 'none';
            rankView.style.display = 'block';
            title.textContent = "Ranking MUAPD - Office Goiânia";
            subtitle.textContent = "Agendamentos de Tel Party (Total)";
            telaAtual = 'ranking';
        } else {
            rankView.style.display = 'none';
            prodView.style.display = 'block';
            title.textContent = "Gestão à Vista - Office Goiânia";
            subtitle.textContent = "Produção parcial do mês";
            telaAtual = 'producao';
        }
    }, tempoTroca);
}

function atualizarBarrasMetas(realizadoAP, realizadoPP) {
    const metas = {
        semanal: { ap: 50000, pp: 925 },
        mensal: { ap: 200000, pp: 3700 }
    };

    const aplicarProgresso = (realizado, meta, barId, labelId) => {
        const pct = Math.min((realizado / meta) * 100, 100).toFixed(1);
        const bar = document.getElementById(barId);
        const label = document.getElementById(labelId);
        if (bar) bar.style.width = pct + '%';
        if (label) label.textContent = pct + '%';
    };

    aplicarProgresso(realizadoAP, metas.semanal.ap, 'barWeeklyAP', 'pctWeeklyAP');
    aplicarProgresso(realizadoPP, metas.semanal.pp, 'barWeeklyPP', 'pctWeeklyPP');
    aplicarProgresso(realizadoAP, metas.mensal.ap, 'barMonthlyAP', 'pctMonthlyAP');
    aplicarProgresso(realizadoPP, metas.mensal.pp, 'barMonthlyPP', 'pctMonthlyPP');
}

setInterval(() => {
    carregarUltimaAtualizacao();
    carregarDadosCSV();
    carregarRankingCSV();
}, 30 * 60 * 1000);
