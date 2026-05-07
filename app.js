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
    fetch('last_update.txt')
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
    Papa.parse('dados_extraidos.csv', {
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

    filtrados.forEach(row => {
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
            <td class="center">${formatarNumero(parseNumero(row['AP [R$]']), true)}</td>
            <td class="center">${formatarNumero(parseNumero(row['Recs']))}</td>
            <td class="center highlight-cell">${formatarNumero(parseNumero(row['Total']))}</td>
        `;
        tbody.appendChild(tr);
    });
}
