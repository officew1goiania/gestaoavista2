document.addEventListener('DOMContentLoaded', () => {
    carregarUltimaAtualizacao();
    carregarDadosCSV();
});

// Helper para converter string de número (ex: "167,8270") para Float
function parseNumero(str) {
    if (!str || str.trim() === '-' || str.trim() === '') return 0;
    // Remove pontos (milhar) e troca vírgula por ponto (decimal)
    let formatado = str.toString().replace(/\./g, '').replace(',', '.');
    return parseFloat(formatado) || 0;
}

// Helper para formatar de volta para visualização
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
    tbody.innerHTML = ''; 

    // Lista de consultores que devem aparecer na TV
    const consultoresAlvo = ["Gianlucca", "Daniela", "Tarek"];

    // Filtra e ordena
    const filtrados = data.filter(row => {
        const nome = row['Consultor/Nível'] || "";
        return consultoresAlvo.some(alvo => nome.toLowerCase().includes(alvo.toLowerCase()));
    });

    // Se não encontrar ninguém, avisa
    if (filtrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 50px;">Aguardando dados dos consultores...</td></tr>';
        return;
    }

    filtrados.forEach(row => {
        const tr = document.createElement('tr');
        
        // Extração dos campos solicitados
        const nomeCurto = row['Consultor/Nível'].split(' (')[0]; // Remove o (P) ou (S)
        const aa = parseNumero(row['AA']);
        const af = parseNumero(row['AF']);
        const ap = parseNumero(row['AP']);
        const apValor = parseNumero(row['AP [R$]']);
        const recs = parseNumero(row['Recs']);
        const total = parseNumero(row['Total']);

        tr.innerHTML = `
            <td>${nomeCurto}</td>
            <td class="center">${formatarNumero(aa)}</td>
            <td class="center">${formatarNumero(af)}</td>
            <td class="center">${formatarNumero(ap)}</td>
            <td class="center">${formatarNumero(apValor, true)}</td>
            <td class="center">${formatarNumero(recs)}</td>
            <td class="center highlight-cell">${formatarNumero(total)}</td>
        `;
        tbody.appendChild(tr);
    });
}
