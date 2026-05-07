// Script Dashboard W1 - TV Version
document.addEventListener('DOMContentLoaded', () => {
    carregarUltimaAtualizacao();
    carregarDadosCSV();
});

function parseNumero(str) {
    if (!str || str.trim() === '-' || str.trim() === '') return 0;
    // Remove "R$", espaços, e pontos de milhar. Depois troca vírgula por ponto decimal.
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
    // Adiciona um timestamp para evitar cache do navegador
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
    // Adiciona um timestamp para evitar cache do navegador
    Papa.parse('dados_extraidos.csv?t=' + new Date().getTime(), {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            renderizarTabela(results.data);
        }
    });
}

function renderizarTabela(data) {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    
    tbody.innerHTML = ''; 

    // Nomes Alvo
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
        
        // Limpa o nome: remove (P), remove o símbolo ◦ e espaços extras
        const nomeCurto = row['Consultor/Nível']
            .split(' (')[0]
            .replace(/[^\w\sÀ-ú]/g, '') // Remove símbolos como ◦ ou marcadores
            .trim(); 
        
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

    // Atualiza as Metas do Escritório
    atualizarBarrasMetas(totalEscritorioAP, totalEscritorioPP);
}

function atualizarBarrasMetas(realizadoAP, realizadoPP) {
    // Configurações das Metas
    const metas = {
        semanal: { ap: 50000, pp: 925 },
        mensal: { ap: 200000, pp: 3700 }
    };

    // Função auxiliar para calcular e atualizar
    const aplicarProgresso = (realizado, meta, barId, labelId) => {
        const pct = Math.min((realizado / meta) * 100, 100).toFixed(1);
        const bar = document.getElementById(barId);
        const label = document.getElementById(labelId);
        if (bar) bar.style.width = pct + '%';
        if (label) label.textContent = pct + '%';
    };

    // Semana
    aplicarProgresso(realizadoAP, metas.semanal.ap, 'barWeeklyAP', 'pctWeeklyAP');
    aplicarProgresso(realizadoPP, metas.semanal.pp, 'barWeeklyPP', 'pctWeeklyPP');

    // Mês
    aplicarProgresso(realizadoAP, metas.mensal.ap, 'barMonthlyAP', 'pctMonthlyAP');
    aplicarProgresso(realizadoPP, metas.mensal.pp, 'barMonthlyPP', 'pctMonthlyPP');
}

// AUTO-REFRESH: Atualiza os dados a cada 30 minutos (1.800.000 ms)
setInterval(() => {
    console.log("Atualizando dados automaticamente...");
    carregarUltimaAtualizacao();
    carregarDadosCSV();
}, 30 * 60 * 1000);
