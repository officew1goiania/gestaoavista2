import os
from dotenv import load_dotenv
# pyrefly: ignore [missing-import]
from playwright.sync_api import sync_playwright
import pandas as pd
from bs4 import BeautifulSoup
from datetime import datetime
import time

# Carrega as variáveis de ambiente do arquivo .env
load_dotenv()

# Configurações de Acesso
URL_LOGIN = "https://w1nner.w1consultoria.com.br/painel-consultor/entrar"
URL_DADOS = "https://w1nner.w1consultoria.com.br/painel-consultor/centro-de-economia"

# Lê os dois logins configurados no .env
CONTAS = [
    {"email": os.getenv("CONTA1_EMAIL"), "senha": os.getenv("CONTA1_SENHA")},
    {"email": os.getenv("CONTA2_EMAIL"), "senha": os.getenv("CONTA2_SENHA")}
]

def extrair_dados_da_conta(page, email, senha):
    print(f"\n--- Iniciando extração para a conta: {email} ---")
    
    # 1. Faz o Login
    print(f"Acessando {URL_LOGIN}...")
    page.goto(URL_LOGIN)
    
    print("Preenchendo credenciais...")
    page.fill("id=consultant_person_email", email)
    page.fill("id=consultant_person_password", senha)
    page.click("input[name='commit']")
    
    print("Aguardando login...")
    page.wait_for_load_state("networkidle")
    
    # Verifica se o login falhou
    if "entrar" in page.url:
        print(f"ERRO: Login falhou para {email}. Verifique as credenciais no arquivo .env.")
        return None
    print("Login realizado com sucesso!")

    # 2. Navegação e Extração
    print(f"Acessando a página de dados: {URL_DADOS}")
    page.goto(URL_DADOS)
    page.wait_for_load_state("networkidle")

    print("Aplicando filtros...")
    try:
        # Lógica inteligente para lidar com o estado residual da sessão (toggle problem)
        page.evaluate("""() => {
            document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                const label = cb.parentElement ? cb.parentElement.innerText.toLowerCase() : '';
                
                // Se for "Selecionar todos" e estiver marcado, desmarca
                if (label.includes('selecionar todos') && cb.checked) {
                    cb.click();
                }
            });
            
            // Depois de limpar o 'todos', garantir que Goiânia esteja marcado
            document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                const label = cb.parentElement ? cb.parentElement.innerText.toLowerCase() : '';
                if (label.includes('w1 goiânia') && !cb.checked) {
                    cb.click();
                }
                // Garante que os outros não estejam marcados
                if (!label.includes('w1 goiânia') && !label.includes('selecionar todos') && cb.checked) {
                    cb.click();
                }
            });
        }""")
    except Exception as e:
        print(f"Aviso: Erro no filtro inteligente JS: {e}")

    print("Clicando no botão Filtrar...")
    page.wait_for_timeout(2000)
    
    try:
        # A IDENTIDADE ÚNICA: Clica no botão que tem a classe js-btn-filter
        # Essa classe só existe no botão de Filtrar da página de Resultados
        page.evaluate("""() => {
            const btn = document.querySelector('button.js-btn-filter');
            if (btn) {
                btn.click();
            } else {
                // Fallback de segurança caso a classe mude
                const fallback = document.querySelector('form.economy_center button.btn-positive');
                if (fallback) fallback.click();
            }
        }""")
        print("Clique disparado via seletor exclusivo .js-btn-filter")
    except Exception as e:
        print(f"Aviso: Erro no clique JS: {e}. Tentando teclado...")
        page.keyboard.press("Enter")

    print("Aguardando carregamento da tabela (pausa fixa de 15 segundos)...")
    
    # 1. Pausa explícita e obrigatória de 15 segundos conforme solicitado
    time.sleep(15)

    print("Extraindo dados da página...")
    html_da_pagina = page.content()
    
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html_da_pagina, 'html.parser')
    tabela = soup.find('table', {'id': 'js-economy-center-table'})
    
    if not tabela:
        print("ERRO: Tabela 'js-economy-center-table' não encontrada no HTML gerado.")
        return None
        
    print("Processando a tabela detalhada linha por linha...")
    
    # Nomes das colunas extraídas exatamente do HTML para garantir 100% de alinhamento
    colunas = [
        "Consultor/Nível", "Meta AA", "AA", "Meta AF", "AF", "Meta AP", "AP", 
        "Meta AP [R$]", "AP [R$]", "Meta Recs", "Recs", "Meta AC", "AC", "Meta C", "C", 
        "Meta CL", "CL", "Meta PPs C", "PPs C", "Meta SAC", "SA", "SF", "Meta PPs S", 
        "PPs S", "Meta AE", "AE", "E", "Meta PPs", "Previstos", "Período", "Total"
    ]
    
    corpo = tabela.find('tbody')
    linhas = corpo.find_all('tr') if corpo else tabela.find_all('tr')[2:]
    
    dados_extraidos = []
    for linha in linhas:
        tds = linha.find_all(['td', 'th'])
        # Pula linhas ocultas ou de configuração
        if not tds or len(tds) < 5: 
            continue
            
        valores = [td.text.strip().replace('\\n', '').replace('\\t', '') for td in tds]
        
        # Garante o alinhamento com as colunas
        while len(valores) < len(colunas):
            valores.append("")
        valores = valores[:len(colunas)]
        
        row_dict = dict(zip(colunas, valores))
        row_dict['Conta_Origem'] = email
        dados_extraidos.append(row_dict)
        
    df = pd.DataFrame(dados_extraidos)
    print(f"SUCESSO! {len(df)} linhas formatadas e extraídas da conta {email}.")
    return df

def extrair_dados_semana_conta(page, email):
    from datetime import datetime, timedelta
    print(f"Acessando a página de dados para extração semanal: {URL_DADOS}")
    page.goto(URL_DADOS)
    page.wait_for_load_state("networkidle")

    # Calcula as datas da semana atual (Domingo a Sábado)
    hoje = datetime.now()
    idx = (hoje.weekday() + 1) % 7 # 0 para Domingo
    domingo = hoje - timedelta(days=idx)
    sabado = domingo + timedelta(days=6)
    str_domingo = domingo.strftime("%d/%m/%Y")
    str_sabado = sabado.strftime("%d/%m/%Y")
    print(f"Filtrando semana: {str_domingo} até {str_sabado}")

    print("Preenchendo datas...")
    try:
        # Preenche as datas forçando o valor via JavaScript para garantir que o componente do site aceite
        page.evaluate(f"document.getElementById('economy_center_start_date').value = '{str_domingo}'")
        page.evaluate(f"document.getElementById('economy_center_end_date').value = '{str_sabado}'")
        # Também usamos o Playwright para disparar eventos caso necessário
        page.fill("#economy_center_start_date", str_domingo)
        page.fill("#economy_center_end_date", str_sabado)
    except Exception as e:
        print(f"Erro ao preencher datas: {e}")

    print("Aplicando filtros de escritório...")
    try:
        # Lógica inteligente para lidar com o estado residual da sessão (toggle problem)
        page.evaluate("""() => {
            document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                const label = cb.parentElement ? cb.parentElement.innerText.toLowerCase() : '';
                
                // Se for "Selecionar todos" e estiver marcado, desmarca
                if (label.includes('selecionar todos') && cb.checked) {
                    cb.click();
                }
            });
            
            // Depois de limpar o 'todos', garantir que Goiânia esteja marcado
            document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                const label = cb.parentElement ? cb.parentElement.innerText.toLowerCase() : '';
                if (label.includes('w1 goiânia') && !cb.checked) {
                    cb.click();
                }
                // Garante que os outros não estejam marcados
                if (!label.includes('w1 goiânia') && !label.includes('selecionar todos') && cb.checked) {
                    cb.click();
                }
            });
        }""")
    except Exception as e:
        print(f"Aviso: Erro no filtro inteligente JS: {e}")

    print("Clicando no botão Filtrar (Semana)...")
    page.wait_for_timeout(2000)
    
    try:
        page.evaluate("""() => {
            const btn = document.querySelector('button.js-btn-filter');
            if (btn) {
                btn.click();
            } else {
                const fallback = document.querySelector('form.economy_center button.btn-positive');
                if (fallback) fallback.click();
            }
        }""")
    except Exception as e:
        page.keyboard.press("Enter")

    print("Aguardando carregamento da tabela semanal (pausa fixa de 15 segundos)...")
    time.sleep(15)

    print("Extraindo dados da página (Semana)...")
    html_da_pagina = page.content()
    
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html_da_pagina, 'html.parser')
    tabela = soup.find('table', {'id': 'js-economy-center-table'})
    
    if not tabela:
        print("ERRO: Tabela semanal não encontrada.")
        return None
        
    colunas = [
        "Consultor/Nível", "Meta AA", "AA", "Meta AF", "AF", "Meta AP", "AP", 
        "Meta AP [R$]", "AP [R$]", "Meta Recs", "Recs", "Meta AC", "AC", "Meta C", "C", 
        "Meta CL", "CL", "Meta PPs C", "PPs C", "Meta SAC", "SA", "SF", "Meta PPs S", 
        "PPs S", "Meta AE", "AE", "E", "Meta PPs", "Previstos", "Período", "Total"
    ]
    
    corpo = tabela.find('tbody')
    linhas = corpo.find_all('tr') if corpo else tabela.find_all('tr')[2:]
    
    dados_extraidos = []
    for linha in linhas:
        tds = linha.find_all(['td', 'th'])
        if not tds or len(tds) < 5: 
            continue
            
        valores = [td.text.strip().replace('\\n', '').replace('\\t', '') for td in tds]
        while len(valores) < len(colunas):
            valores.append("")
        valores = valores[:len(colunas)]
        
        row_dict = dict(zip(colunas, valores))
        row_dict['Conta_Origem'] = email
        dados_extraidos.append(row_dict)
        
    df = pd.DataFrame(dados_extraidos)
    print(f"SUCESSO SEMANAL! {len(df)} linhas extraídas da conta {email}.")
    return df

def extrair_ranking_muapd(page):
    print("Acessando Rankings...")
    url_ranking = "https://w1nner.w1consultoria.com.br/painel-consultor/indicadores/rankings"
    
    try:
        page.goto(url_ranking)
        page.wait_for_load_state("networkidle")
        
        # 1. Acessa Tel Party
        page.get_by_role("link", name="Tel Party").click()
        page.wait_for_timeout(2000)

        # 2. Limpa TUDO via JavaScript Agressivo
        print("Limpando todos os escritórios...")
        page.evaluate("""() => {
            // Desmarca todos os checkboxes de escritório
            document.querySelectorAll('input[name="office_ids[]"]').forEach(cb => {
                if(cb.checked) cb.click();
            });
            // Configura filtros de data (Desmarca compromisso, Marca criação)
            document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                const text = cb.parentElement.innerText.toLowerCase();
                if(text.includes('compromisso') && cb.checked) cb.click();
                if(text.includes('criação') && !cb.checked) cb.click();
            });
        }""")

        # 3. Marca Goiânia especificamente
        print("Marcando Goiânia...")
        page.locator("label").filter(has_text="W1 Goiânia").locator("input").check()

        # 4. Filtra
        page.evaluate("() => { document.querySelector('.js-btn-filter').click(); }")
        print("Aguardando ranking (15s)...")
        page.wait_for_timeout(15000)

        # 5. Extração com Filtro de Segurança em Python
        html = page.content()
        soup = BeautifulSoup(html, 'html.parser')
        tabela = soup.find('table')
        
        dados_ranking = []
        if tabela:
            linhas = tabela.find_all('tr')
            for linha in linhas:
                cols = linha.find_all('td')
                # #=0, Consultor=1, Cargo=2, Escritório=3, AA=4
                if len(cols) >= 5:
                    nome = cols[1].get_text(strip=True)
                    escritorio = cols[3].get_text(strip=True)
                    aa_texto = cols[4].get_text(strip=True)
                    
                    # TRAVA DE SEGURANÇA: Só aceita se for Goiânia
                    if "Goiânia" in escritorio and nome != "-" and nome != "Total":
                        try:
                            aa_val = int(aa_texto)
                            dados_ranking.append({'Consultor': nome, 'AA': aa_val})
                        except:
                            continue
        
        df = pd.DataFrame(dados_ranking, columns=['Consultor', 'AA'])
        if not df.empty:
            df = df.sort_values(by='AA', ascending=False)
            print(f"Sucesso: {len(df)} consultores de Goiânia filtrados.")
        else:
            print("Aviso: Nenhum dado de Goiânia encontrado na tabela.")
            
        return df

    except Exception as e:
        print(f"Erro no Ranking: {e}")
        page.screenshot(path="erro_ranking.png")
        return None

def extrair_ranking_rec(page):
    """Clica em cada partner (P) para expandir tabela filha e extrai RECs por consultor."""
    print("Extraindo Ranking de RECs por consultor...")

    try:
        page.goto(URL_DADOS)
        page.wait_for_load_state("networkidle")

        # Aplica filtro W1 Goiânia
        try:
            page.get_by_text("Selecionar todos", exact=False).first.click()
            time.sleep(1)
        except Exception:
            pass
        try:
            page.get_by_text("W1 Goiânia", exact=False).first.click()
        except Exception:
            pass

        page.wait_for_timeout(2000)
        page.evaluate("""() => {
            const btn = document.querySelector('button.js-btn-filter');
            if (btn) btn.click();
        }""")

        print("Aguardando tabela principal (15s)...")
        time.sleep(15)

        # Clica em cada linha de Partner (P) para expandir a sub-tabela de consultores
        print("Expandindo linhas de Partner (P)...")
        n_clicados = page.evaluate("""() => {
            const tabela = document.getElementById('js-economy-center-table');
            if (!tabela) return 0;
            let clicados = 0;
            tabela.querySelectorAll('tbody tr').forEach(tr => {
                const td = tr.querySelector('td');
                if (td && td.innerText.includes('(P)')) {
                    td.click();
                    clicados++;
                }
            });
            return clicados;
        }""")
        print(f"Clicou em {n_clicados} Partner(s). Aguardando expansão (5s)...")
        page.wait_for_timeout(5000)

        # Extrai o HTML já expandido
        html = page.content()
        soup = BeautifulSoup(html, 'html.parser')
        tabela = soup.find('table', {'id': 'js-economy-center-table'})

        if not tabela:
            print("ERRO: Tabela não encontrada para ranking RECs.")
            return None

        # Índices baseados nas colunas do CSV (0-indexed)
        # Consultor/Nível=0, Recs=10
        IDX_NOME = 0
        IDX_RECS = 10

        dados = []
        corpo = tabela.find('tbody')
        linhas = corpo.find_all('tr') if corpo else []

        for linha in linhas:
            cols = linha.find_all('td')
            if len(cols) <= IDX_RECS:
                continue
            nome = cols[IDX_NOME].get_text(strip=True)
            nome_lower = nome.lower()
            # Pula partners, eficiências, totais e vazios
            if (not nome or '(p)' in nome_lower or
                    'eficiência' in nome_lower or 'eficiencias' in nome_lower or
                    nome_lower == 'total'):
                continue
            # Remove prefixo de indentação de linhas filhas (◦, •, etc.)
            nome_limpo = nome.replace('◦', '').replace('•', '').strip()
            # Pega apenas o primeiro nome para exibição
            recs_str = cols[IDX_RECS].get_text(strip=True)
            try:
                recs = int(recs_str)
            except Exception:
                recs = 0
            if recs > 0 and nome_limpo:
                dados.append({'Consultor': nome_limpo, 'Recs': recs})

        df = pd.DataFrame(dados, columns=['Consultor', 'Recs'])
        if not df.empty:
            print(f"Ranking REC extraído: {len(df)} consultores.")
        else:
            print("Aviso: Nenhum dado de REC por consultor encontrado.")
        return df

    except Exception as e:
        import traceback
        print(f"Erro ao extrair ranking REC: {e}")
        print(traceback.format_exc())
        page.screenshot(path="erro_ranking_rec.png")
        return None


def extrair_ranking_ap(page):
    print("Acessando Rankings para AP...")
    url_ranking = "https://w1nner.w1consultoria.com.br/painel-consultor/indicadores/rankings"
    
    try:
        page.goto(url_ranking)
        page.wait_for_load_state("networkidle")
        
        # 1. Acessa a aba APs
        print("Selecionando a aba APs...")
        try:
            page.get_by_role("link", name="APs", exact=True).click()
        except Exception:
            page.get_by_text("APs", exact=True).click()
        page.wait_for_timeout(2000)

        # 2. Seleciona "W1 Goiânia" no campo Escritório da produção
        print("Selecionando o escritório W1 Goiânia...")
        try:
            # Primeiro tenta via JavaScript (mais robusto no HTML subjacente)
            page.evaluate("""() => {
                const selects = Array.from(document.querySelectorAll('select'));
                let targetSelect = null;
                
                for (const select of selects) {
                    if (select.id) {
                        const label = document.querySelector(`label[for="${select.id}"]`);
                        if (label && label.innerText.toLowerCase().includes('escritório')) {
                            targetSelect = select;
                            break;
                        }
                    }
                    if (select.name.toLowerCase().includes('office') || select.id.toLowerCase().includes('office')) {
                        targetSelect = select;
                        break;
                    }
                }
                
                if (!targetSelect) {
                    for (const select of selects) {
                        const options = Array.from(select.options);
                        if (options.some(opt => opt.text.includes('W1 Goiânia'))) {
                            targetSelect = select;
                            break;
                        }
                    }
                }
                
                if (targetSelect) {
                    // Desmarca todas as opções para limpar escolhas anteriores
                    Array.from(targetSelect.options).forEach(opt => {
                        opt.selected = false;
                    });
                    
                    const optionToSelect = Array.from(targetSelect.options).find(opt => opt.text.includes('W1 Goiânia'));
                    if (optionToSelect) {
                        optionToSelect.selected = true;
                        targetSelect.dispatchEvent(new Event('change', { bubbles: true }));
                        
                        // Atualiza a UI do Chosen
                        if (window.jQuery && window.jQuery(targetSelect).trigger) {
                            window.jQuery(targetSelect).trigger('chosen:updated');
                            window.jQuery(targetSelect).trigger('change');
                        }
                    }
                }
            }""")
            page.wait_for_timeout(500)
        except Exception as e:
            print(f"Aviso ao selecionar via JS: {e}")

        # Como garantia, se for um Chosen Multi-Select que necessita de clique na interface:
        try:
            chosen_choices = page.locator(".chosen-choices")
            if chosen_choices.count() > 0:
                print("Interagindo diretamente com a interface do Chosen...")
                search_input = page.locator(".chosen-choices input.chosen-search-input")
                if search_input.count() > 0:
                    search_input.first.click()
                    page.wait_for_timeout(500)
                    search_input.first.fill("W1 Goiânia")
                    page.wait_for_timeout(500)
                    page.keyboard.press("Enter")
                    print("Digitado e selecionado W1 Goiânia via interface Chosen.")
        except Exception as e:
            print(f"Aviso ao tentar interface física do Chosen: {e}")
            
        page.wait_for_timeout(1000)

        # 3. Filtra
        print("Clicando no botão Filtrar...")
        try:
            page.evaluate("""() => {
                const btn = document.querySelector('.js-btn-filter');
                if (btn) {
                    btn.click();
                } else {
                    const fallback = document.querySelector('button[type="submit"]') || document.querySelector('.btn-positive');
                    if (fallback) fallback.click();
                }
            }""")
        except Exception as e:
            print(f"Aviso no clique de filtro AP: {e}")
            page.keyboard.press("Enter")

        print("Aguardando ranking de AP (15s)...")
        page.wait_for_timeout(15000)

        # 4. Extração dos dados
        html = page.content()
        soup = BeautifulSoup(html, 'html.parser')
        
        # Encontra a tabela js-ranking
        tabela = soup.find('table', class_='js-ranking')
        if not tabela:
            tabela = soup.find('table')
            
        dados_ranking = []
        if tabela:
            # Encontra cabeçalhos para mapeamento dinâmico
            thead = tabela.find('thead')
            headers = [th.get_text(strip=True).lower() for th in thead.find_all('th')] if thead else []
            
            idx_consultor = 2
            idx_valor = 5
            idx_qtd = 6
            
            if headers:
                for idx, h in enumerate(headers):
                    if h == 'consultor':
                        idx_consultor = idx
                    elif 'valor' in h and 'médio' not in h:
                        idx_valor = idx
                    elif 'quantidade' in h or 'qtd' in h:
                        idx_qtd = idx
                        
            tbody = tabela.find('tbody')
            linhas = tbody.find_all('tr') if tbody else tabela.find_all('tr')[1:]
            
            for linha in linhas:
                cols = linha.find_all('td')
                if len(cols) > max(idx_consultor, idx_valor, idx_qtd):
                    nome = cols[idx_consultor].get_text(strip=True)
                    if nome == "-" or nome == "Total" or not nome:
                        continue
                    
                    valor = cols[idx_valor].get_text(strip=True)
                    qtd = cols[idx_qtd].get_text(strip=True)
                    
                    dados_ranking.append({
                        'Consultor': nome,
                        'Valor': valor,
                        'Quantidade': qtd
                    })
                    
        df = pd.DataFrame(dados_ranking, columns=['Consultor', 'Valor', 'Quantidade'])
        if not df.empty:
            print(f"Sucesso: {len(df)} consultores no ranking AP extraídos.")
        else:
            print("Aviso: Nenhum dado de ranking AP extraído da tabela.")
            
        return df

    except Exception as e:
        print(f"Erro no Ranking AP: {e}")
        page.screenshot(path="erro_ranking_ap.png")
        return None

def extrair_dados_google_sheets():
    """Busca dados da equipe externa na planilha do Google Sheets"""
    print("\n[GOOGLE SHEETS] Buscando dados do Time Mario...")
    url_planilha = "https://docs.google.com/spreadsheets/d/1MmoY1eIDApfLynUS3cKKc7OrEekEPEGSZjqz9ViOPW0/export?format=csv&gid=0"
    
    try:
        df_externo = pd.read_csv(url_planilha)
        # Mapear colunas para o padrão do nosso CSV
        # Planilha: Consultor, AA, AF, AP, AP [R$], REC, PP, C/S
        # Nosso CSV: Consultor/Nível, AA, AF, AP, AP [R$], Recs, Total
        
        # Suporta tanto 'Consultor' quanto o cabeçalho antigo 'Equipe'
        renames = {
            'Consultor': 'Consultor/Nível',
            'Equipe': 'Consultor/Nível',
            'REC': 'Recs',
            'PP': 'Total'
        }
        df_externo = df_externo.rename(columns=renames)
        
        # Remove espaços extras dos nomes dos consultores (e não encurta mais para o primeiro nome)
        df_externo['Consultor/Nível'] = df_externo['Consultor/Nível'].astype(str).str.strip()
        
        print(f"✓ Dados do Time Mario carregados: {len(df_externo)} consultor(es).")
        return df_externo
    except Exception as e:
        print(f"✗ Erro ao buscar dados da planilha externa: {e}")
        return None

def executar_robo():
    print("Iniciando o robô...")
    
    # Cria os arquivos vazios logo de cara para evitar erro no Git Add
    for arq in ["dados_extraidos.csv", "ranking_muapd.csv", "ranking_ap.csv"]:
        if not os.path.exists(arq):
            with open(arq, "w", encoding="utf-8") as f:
                f.write("") 

    todos_os_dados = []
    todos_os_dados_semana = []
    rankings_acumulados = []
    rankings_ap_acumulados = []
    rankings_rec_acumulados = []
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        for conta in CONTAS:
            if not conta["email"] or not conta["senha"]:
                continue
                
            context = browser.new_context(viewport={'width': 1280, 'height': 1600})
            page = context.new_page()
            
            try:
                # 1. Extração de Produção
                df_conta = extrair_dados_da_conta(page, conta["email"], conta["senha"])
                if df_conta is not None:
                    todos_os_dados.append(df_conta)
                
                # 2. Extração de Ranking MUAPD (Já logado na conta)
                df_ranking = extrair_ranking_muapd(page)
                if df_ranking is not None:
                    rankings_acumulados.append(df_ranking)

                # 3. Extração de Ranking AP (Já logado na conta)
                df_ranking_ap = extrair_ranking_ap(page)
                if df_ranking_ap is not None:
                    rankings_ap_acumulados.append(df_ranking_ap)

                # 4. Extração de Ranking REC (Já logado na conta)
                df_ranking_rec = extrair_ranking_rec(page)
                if df_ranking_rec is not None:
                    rankings_rec_acumulados.append(df_ranking_rec)

                # 5. Extração de Produção Semanal (Já logado na conta)
                df_semana = extrair_dados_semana_conta(page, conta["email"])
                if df_semana is not None:
                    todos_os_dados_semana.append(df_semana)

            except Exception as e:
                import traceback
                erro_detalhado = traceback.format_exc()
                print(f"ERRO na conta {conta['email']}: {e}")
                with open(f"log_erro_{conta['email'].split('@')[0]}.txt", "w") as f:
                    f.write(erro_detalhado)
                page.screenshot(path=f"debug_erro_{conta['email'].split('@')[0]}.png")
            finally:
                page.close()
                context.close()

        browser.close()
        
    # 4. Busca dados externos (Time Mario)
    df_externo = extrair_dados_google_sheets()
    if df_externo is not None:
        todos_os_dados.append(df_externo)
        
        # Adiciona nos rankings acumulados
        if 'AA' in df_externo.columns:
            df_muapd_ext = df_externo[['Consultor/Nível', 'AA']].rename(columns={'Consultor/Nível': 'Consultor'})
            rankings_acumulados.append(df_muapd_ext)
            
        if 'AP [R$]' in df_externo.columns and 'AP' in df_externo.columns:
            df_ap_ext = df_externo[['Consultor/Nível', 'AP [R$]', 'AP']].rename(columns={
                'Consultor/Nível': 'Consultor',
                'AP [R$]': 'Valor',
                'AP': 'Quantidade'
            })
            rankings_ap_acumulados.append(df_ap_ext)
            
        if 'Recs' in df_externo.columns:
            df_rec_ext = df_externo[['Consultor/Nível', 'Recs']].rename(columns={'Consultor/Nível': 'Consultor'})
            rankings_rec_acumulados.append(df_rec_ext)
        
    # Salva Produção
    if todos_os_dados:
        df_final = pd.concat(todos_os_dados, ignore_index=True)
        df_final.to_csv("dados_extraidos.csv", index=False)
        from datetime import datetime
        with open("last_update.txt", "w", encoding="utf-8") as f:
            f.write(datetime.utcnow().isoformat() + "Z")
        print("Dados de produção consolidados e salvos.")

    # Salva Produção Semanal
    if todos_os_dados_semana:
        df_semana_final = pd.concat(todos_os_dados_semana, ignore_index=True)
        df_semana_final.to_csv("dados_semana.csv", index=False)
        print("Dados semanais consolidados e salvos.")

    # Salva Ranking MUAPD
    if rankings_acumulados:
        df_ranking_final = pd.concat(rankings_acumulados, ignore_index=True)
        # Limpeza e Ordenação
        df_ranking_final['AA'] = pd.to_numeric(df_ranking_final['AA'], errors='coerce').fillna(0)
        df_ranking_final = df_ranking_final[df_ranking_final['AA'] > 0]
        df_ranking_final = df_ranking_final.sort_values(by='AA', ascending=False).drop_duplicates(subset=['Consultor'])
        df_ranking_final.to_csv("ranking_muapd.csv", index=False)
        print("Ranking MUAPD salvo com sucesso.")

    # Salva Ranking AP
    if rankings_ap_acumulados:
        df_ranking_ap_final = pd.concat(rankings_ap_acumulados, ignore_index=True)
        # Limpeza e Ordenação por Valor Numérico
        def parse_valor_ranking(val_str):
            try:
                return float(str(val_str).replace('R$', '').replace('.', '').replace(',', '.').strip())
            except:
                return 0.0
        
        df_ranking_ap_final['Valor_Num'] = df_ranking_ap_final['Valor'].apply(parse_valor_ranking)
        df_ranking_ap_final = df_ranking_ap_final[df_ranking_ap_final['Valor_Num'] > 0]
        df_ranking_ap_final = df_ranking_ap_final.sort_values(by='Valor_Num', ascending=False).drop_duplicates(subset=['Consultor'])
        df_ranking_ap_final = df_ranking_ap_final.drop(columns=['Valor_Num'])
        df_ranking_ap_final = df_ranking_ap_final.head(10)
        df_ranking_ap_final.to_csv("ranking_ap.csv", index=False)
        print("Ranking AP consolidado e salvo.")

    # Salva Ranking REC
    if rankings_rec_acumulados:
        df_ranking_rec_final = pd.concat(rankings_rec_acumulados, ignore_index=True)
        # Limpeza e Ordenação
        df_ranking_rec_final['Recs'] = pd.to_numeric(df_ranking_rec_final['Recs'], errors='coerce').fillna(0).astype(int)
        df_ranking_rec_final = df_ranking_rec_final[df_ranking_rec_final['Recs'] > 0]
        df_ranking_rec_final = df_ranking_rec_final.sort_values(by='Recs', ascending=False).drop_duplicates(subset=['Consultor'])
        df_ranking_rec_final = df_ranking_rec_final.head(10)
        df_ranking_rec_final.to_csv("ranking_rec.csv", index=False)
        print("Ranking REC consolidado e salvo.")



if __name__ == "__main__":
    executar_robo()
