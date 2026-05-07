document.addEventListener('DOMContentLoaded', () => {
    carregarUltimaAtualizacao();
    carregarDadosCSV();
});

// Helper para converter string de número (ex: "102,0752") para Float
function parseNumero(str) {
    if (!str || str.trim() === '-' || str.trim() === '') return 0;
    // Remove pontos (milhar) e troca vírgula por ponto (decimal)
    let formatado = str.toString().replace(/\./g, '').replace(',', '.');
    return parseFloat(formatado) || 0;
}

// Helper para formatar de volta para visualização
function formatarNumero(num) {
    if (Number.isInteger(num)) return num.toString();
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function carregarUltimaAtualizacao() {
    fetch('last_update.txt')
        .then(response => {
            if (!response.ok) throw new Error("Arquivo não encontrado");
            return response.text();
        })
        .then(isoString => {
            const date = new Date(isoString);
            const formatado = date.toLocaleString('pt-BR', { 
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            });
            document.getElementById('update-time').textContent = formatado;
        })
        .catch(error => {
            document.getElementById('update-time').textContent = "Horário não disponível";
            console.error("Erro ao carregar horário:", error);
        });
}

function carregarDadosCSV() {
    Papa.parse('dados_extraidos.csv', {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            const data = results.data;
            processarDados(data);
        },
        error: function(err) {
            console.error("Erro ao ler o CSV:", err);
            alert("Não foi possível carregar os dados. O arquivo CSV foi gerado?");
        }
    });
}

function processarDados(data) {
    // Filtra para remover linhas "vazias" ou de cabeçalho duplicado
    const validData = data.filter(row => row['Consultor/Nível'] && row['Consultor/Nível'] !== 'Consultor/Nível');
    
    // O TOTAL geralmente vem como uma linha específica. Vamos separá-la
    const linhaTotal = validData.find(row => row['Consultor/Nível'].includes('TOTAL') || row['Consultor/Nível'].includes('EFICIÊNCIAS'));
    const consultores = validData.filter(row => !row['Consultor/Nível'].includes('TOTAL') && !row['Consultor/Nível'].includes('EFICIÊNCIAS'));

    atualizarKPIs(linhaTotal, consultores);
    renderizarGraficos(consultores);
    renderizarTabela(consultores);
}

function atualizarKPIs(linhaTotal, consultores) {
    let sumPrevistos = 0;
    let sumTotal = 0;
    let sumEntrevistas = 0;
    let sumClientes = 0;

    if (linhaTotal) {
        sumPrevistos = parseNumero(linhaTotal['Previstos']);
        sumTotal = parseNumero(linhaTotal['Total']);
        sumEntrevistas = parseNumero(linhaTotal['E']);
        sumClientes = parseNumero(linhaTotal['C']);
    } else {
        // Fallback: calcula somando todos os consultores se não achar a linha TOTAL
        consultores.forEach(row => {
            sumPrevistos += parseNumero(row['Previstos']);
            sumTotal += parseNumero(row['Total']);
            sumEntrevistas += parseNumero(row['E']);
            sumClientes += parseNumero(row['C']);
        });
    }

    document.getElementById('kpi-previsto').textContent = formatarNumero(sumPrevistos);
    document.getElementById('kpi-realizado').textContent = formatarNumero(sumTotal);
    document.getElementById('kpi-entrevistas').textContent = formatarNumero(sumEntrevistas);
    document.getElementById('kpi-clientes').textContent = formatarNumero(sumClientes);
}

function renderizarGraficos(consultores) {
    // Ordenar os consultores por PPs Totais para o gráfico ficar bonito
    const topConsultores = [...consultores]
        .sort((a, b) => parseNumero(b['Total']) - parseNumero(a['Total']))
        .slice(0, 10); // Pega os 10 melhores para não poluir o gráfico

    const labels = topConsultores.map(c => c['Consultor/Nível'].replace('(P)', '').trim().split(' ')[0]); // Pega só o primeiro nome
    
    const dataServico = topConsultores.map(c => parseNumero(c['PPs S']));
    const dataConsultoria = topConsultores.map(c => parseNumero(c['PPs C']));
    const dataMeta = topConsultores.map(c => parseNumero(c['Meta PPs']));
    const dataRealizado = topConsultores.map(c => parseNumero(c['Total']));

    // Gráfico de Barras Empilhadas (Serviço vs Consultoria)
    const ctxPps = document.getElementById('ppsChart').getContext('2d');
    new Chart(ctxPps, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'PPs Serviço',
                    data: dataServico,
                    backgroundColor: 'rgba(59, 130, 246, 0.8)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 1
                },
                {
                    label: 'PPs Consultoria',
                    data: dataConsultoria,
                    backgroundColor: 'rgba(139, 92, 246, 0.8)',
                    borderColor: 'rgba(139, 92, 246, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { stacked: true, grid: { color: 'rgba(255,255,255,0.05)' } },
                y: { stacked: true, grid: { color: 'rgba(255,255,255,0.05)' } }
            },
            plugins: {
                legend: { labels: { color: '#f8fafc' } }
            },
            color: '#f8fafc'
        }
    });

    // Gráfico de Linha/Barra (Realizado vs Meta)
    const ctxMeta = document.getElementById('metaChart').getContext('2d');
    new Chart(ctxMeta, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    type: 'line',
                    label: 'Meta',
                    data: dataMeta,
                    borderColor: 'rgba(16, 185, 129, 1)',
                    backgroundColor: 'rgba(16, 185, 129, 1)',
                    borderWidth: 2,
                    tension: 0.4
                },
                {
                    type: 'bar',
                    label: 'Realizado',
                    data: dataRealizado,
                    backgroundColor: 'rgba(245, 158, 11, 0.8)',
                    borderColor: 'rgba(245, 158, 11, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
                x: { grid: { color: 'rgba(255,255,255,0.05)' } }
            },
            plugins: {
                legend: { labels: { color: '#f8fafc' } }
            },
            color: '#f8fafc'
        }
    });
}

function renderizarTabela(consultores) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = ''; // Limpa a tabela

    consultores.forEach(row => {
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td class="bold">${row['Consultor/Nível'].replace('(P)', '').trim()}</td>
            <td>${formatarNumero(parseNumero(row['E']))}</td>
            <td>${formatarNumero(parseNumero(row['C']))}</td>
            <td>${formatarNumero(parseNumero(row['PPs S']))}</td>
            <td>${formatarNumero(parseNumero(row['PPs C']))}</td>
            <td>${formatarNumero(parseNumero(row['Previstos']))}</td>
            <td class="highlight">${formatarNumero(parseNumero(row['Total']))}</td>
        `;
        tbody.appendChild(tr);
    });

    // Filtro de busca
    document.getElementById('searchInput').addEventListener('keyup', function(e) {
        const term = e.target.value.toLowerCase();
        const linhas = tbody.getElementsByTagName('tr');
        
        Array.from(linhas).forEach(linha => {
            const nome = linha.cells[0].textContent.toLowerCase();
            if (nome.includes(term)) {
                linha.style.display = '';
            } else {
                linha.style.display = 'none';
            }
        });
    });
}
