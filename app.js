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
    const tfoot = document.getElementById('tableFooter');
    if (!tbody) return;
    
    tbody.innerHTML = ''; 
    if (tfoot) tfoot.innerHTML = '';

    const consultoresAlvo = ["Gianlucca", "Daniela", "Tarek", "Mario"];
    const filtrados = data.filter(row => {
        const nome = row['Consultor/Nível'] || "";
        return consultoresAlvo.some(alvo => nome.toLowerCase().includes(alvo.toLowerCase()));
    });

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
        // PEGA APENAS O PRIMEIRO NOME
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
    const tbody = document.getElementById('rankingBody');
    if (!tbody) return;
    
    tbody.innerHTML = ''; 

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 50px;">-</td></tr>';
        return;
    }

    data.forEach((row, index) => {
        const tr = document.createElement('tr');
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : (index + 1);
        
        // APENAS O PRIMEIRO NOME NO RANKING TAMBÉM
        const primeiroNomeRanking = row['Consultor'].split(' ')[0];

        tr.innerHTML = `
            <td class="center">${medal}</td>
            <td>${primeiroNomeRanking}</td>
            <td class="center highlight-cell">${row['AA']}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Auto-refresh a cada 10 minutos para acompanhar o Robô
setInterval(() => {
    carregarUltimaAtualizacao();
    carregarDadosCSV();
    carregarRankingCSV();
}, 10 * 60 * 1000);
