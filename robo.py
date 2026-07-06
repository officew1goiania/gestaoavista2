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
                    cargo = cols[2].get_text(strip=True)
                    escritorio = cols[3].get_text(strip=True)
                    aa_texto = cols[4].get_text(strip=True)
                    
                    # TRAVA DE SEGURANÇA: Só aceita se for Goiânia
                    if "Goiânia" in escritorio and nome != "-" and nome != "Total":
                        try:
                            aa_val = int(aa_texto)
                            if cargo:
                                nome_completo = f"{nome} ({cargo})"
                            else:
                                nome_completo = nome
                            dados_ranking.append({'Consultor': nome_completo, 'AA': aa_val})
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
            idx_cargo = None
            idx_valor = 5
            idx_qtd = 6
            
            if headers:
                for idx, h in enumerate(headers):
                    if h == 'consultor':
                        idx_consultor = idx
                    elif 'cargo' in h:
                        idx_cargo = idx
                    elif 'valor' in h and 'médio' not in h:
                        idx_valor = idx
                    elif 'quantidade' in h or 'qtd' in h:
                        idx_qtd = idx
                        
            tbody = tabela.find('tbody')
            linhas = tbody.find_all('tr') if tbody else tabela.find_all('tr')[1:]
            
            for linha in linhas:
                cols = linha.find_all('td')
                maior_idx = max(idx_consultor, idx_valor, idx_qtd)
                if idx_cargo is not None:
                    maior_idx = max(maior_idx, idx_cargo)
                    
                if len(cols) > maior_idx:
                    nome = cols[idx_consultor].get_text(strip=True)
                    if nome == "-" or nome == "Total" or not nome:
                        continue
                    
                    cargo = cols[idx_cargo].get_text(strip=True) if idx_cargo is not None else ""
                    valor = cols[idx_valor].get_text(strip=True)
                    qtd = cols[idx_qtd].get_text(strip=True)
                    
                    if cargo:
                        nome_completo = f"{nome} ({cargo})"
                    else:
                        nome_completo = nome
                        
                    dados_ranking.append({
                        'Consultor': nome_completo,
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

def extrair_ranking_pp(page):
    print("Acessando Rankings para PP...")
    url_ranking = "https://w1nner.w1consultoria.com.br/painel-consultor/indicadores/rankings"
    
    try:
        page.goto(url_ranking)
        page.wait_for_load_state("networkidle")
        
        # 1. Acessa a aba PPs
        print("Selecionando a aba PPs...")
        try:
            page.get_by_role("link", name="PPs", exact=True).click()
        except Exception:
            page.get_by_text("PPs", exact=True).click()
        page.wait_for_timeout(2000)

        # 2. Seleciona "W1 Goiânia" no campo Escritório da produção e "Próprios" em Ranquear por
        print("Selecionando o escritório W1 Goiânia e 'Próprios' no ranking PP...")
        try:
            page.evaluate("""() => {
                const rankingBySelect = document.getElementById('indicators_pp_ranking_ranking_by');
                if (rankingBySelect) {
                    rankingBySelect.value = 'only_consultant';
                    rankingBySelect.dispatchEvent(new Event('change', { bubbles: true }));
                    if (window.jQuery && window.jQuery(rankingBySelect).trigger) {
                        window.jQuery(rankingBySelect).trigger('chosen:updated');
                        window.jQuery(rankingBySelect).trigger('change');
                    }
                }
                
                const officeSelect = document.getElementById('indicators_pp_ranking_productions_offices');
                if (officeSelect) {
                    // Desmarca todas as opções para limpar escolhas anteriores
                    Array.from(officeSelect.options).forEach(opt => {
                        opt.selected = false;
                    });
                    
                    const optionToSelect = Array.from(officeSelect.options).find(opt => opt.text.includes('W1 Goiânia') || opt.value === '33');
                    if (optionToSelect) {
                        optionToSelect.selected = true;
                        officeSelect.dispatchEvent(new Event('change', { bubbles: true }));
                        
                        // Atualiza a UI do Chosen
                        if (window.jQuery && window.jQuery(officeSelect).trigger) {
                            window.jQuery(officeSelect).trigger('chosen:updated');
                            window.jQuery(officeSelect).trigger('change');
                        }
                    }
                }
            }""")
            page.wait_for_timeout(500)
        except Exception as e:
            print(f"Aviso ao selecionar via JS para PP: {e}")

        # Como garantia, se for um Chosen Multi-Select que necessita de clique na interface:
        try:
            chosen_container = page.locator("#indicators_pp_ranking_productions_offices_chosen")
            if chosen_container.count() > 0:
                print("Interagindo diretamente com a interface do Chosen para PP Escritório...")
                search_input = chosen_container.locator("input.chosen-search-input")
                if search_input.count() > 0:
                    search_input.first.click()
                    page.wait_for_timeout(500)
                    search_input.first.fill("W1 Goiânia")
                    page.wait_for_timeout(500)
                    page.keyboard.press("Enter")
                    print("Digitado e selecionado W1 Goiânia via interface Chosen PP.")
        except Exception as e:
            print(f"Aviso ao tentar interface física do Chosen PP: {e}")
            
        page.wait_for_timeout(1000)

        # 3. Filtra usando o botão dentro de #tab-pp ou #new_indicators_pp_ranking
        print("Clicando no botão Filtrar (PP)...")
        try:
            page.evaluate("""() => {
                const btn = document.querySelector('#tab-pp .js-btn-filter') || document.querySelector('#new_indicators_pp_ranking .js-btn-filter') || document.querySelector('.js-btn-filter');
                if (btn) {
                    btn.click();
                } else {
                    const fallback = document.querySelector('button[type="submit"]') || document.querySelector('.btn-positive');
                    if (fallback) fallback.click();
                }
            }""")
        except Exception as e:
            print(f"Aviso no clique de filtro PP: {e}")
            page.keyboard.press("Enter")

        print("Aguardando ranking de PP (15s)...")
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
            thead = tabela.find('thead')
            headers = [th.get_text(strip=True).lower() for th in thead.find_all('th')] if thead else []
            
            idx_consultor = 2
            idx_cargo = 4
            idx_pp_totais = 7
            
            if headers:
                for idx, h in enumerate(headers):
                    if h == 'consultor':
                        idx_consultor = idx
                    elif 'cargo' in h:
                        idx_cargo = idx
                    elif 'totais' in h:
                        idx_pp_totais = idx
                        
            tbody = tabela.find('tbody')
            linhas = tbody.find_all('tr') if tbody else tabela.find_all('tr')[1:]
            
            for linha in linhas:
                cols = linha.find_all('td')
                if len(cols) > max(idx_consultor, idx_cargo, idx_pp_totais):
                    nome = cols[idx_consultor].get_text(strip=True)
                    if nome == "-" or nome == "Total" or not nome:
                        continue
                    
                    cargo = cols[idx_cargo].get_text(strip=True) if idx_cargo < len(cols) else ""
                    pp_str = cols[idx_pp_totais].get_text(strip=True)
                    
                    if cargo:
                        nome_completo = f"{nome} ({cargo})"
                    else:
                        nome_completo = nome
                        
                    dados_ranking.append({
                        'Consultor': nome_completo,
                        'PP': pp_str
                    })
                    
        df = pd.DataFrame(dados_ranking, columns=['Consultor', 'PP'])
        if not df.empty:
            print(f"Sucesso: {len(df)} consultores no ranking PP extraídos.")
        else:
            print("Aviso: Nenhum dado de ranking PP extraído da tabela.")
            
        return df

    except Exception as e:
        print(f"Erro no Ranking PP: {e}")
        page.screenshot(path="erro_ranking_pp.png")
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
        
        # Se a coluna Cargo existir, junta ao nome no formato "Nome (Cargo)" para alinhar com o padrão do CRM
        if 'Cargo' in df_externo.columns:
            df_externo['Consultor/Nível'] = df_externo.apply(
                lambda row: f"{str(row['Consultor/Nível'])} ({str(row['Cargo']).strip()})"
                if pd.notna(row['Cargo']) and str(row['Cargo']).strip() != ''
                else str(row['Consultor/Nível']),
                axis=1
            )
        
        print(f"[OK] Dados do Time Mario carregados: {len(df_externo)} consultor(es).")
        return df_externo
    except Exception as e:
        print(f"[ERRO] Erro ao buscar dados da planilha externa: {e}")
        return None

def substituir_nomes(df, coluna):
    if df is not None and coluna in df.columns:
        df[coluna] = df[coluna].astype(str)
        df[coluna] = df[coluna].str.replace("Daniela Calanca da Silva", "Daniela Calanca", regex=False)
        df[coluna] = df[coluna].str.replace("Daniela Silva", "Daniela Calanca", regex=False)
        df[coluna] = df[coluna].str.replace("Saymon de Gouveia Pereira dos Santos", "Saymon Gouveia", regex=False)
        df[coluna] = df[coluna].str.replace("Saymon Santos", "Saymon Gouveia", regex=False)
        df[coluna] = df[coluna].str.replace("Eduardo Verano Chaves Soares", "Eduardo Verano", regex=False)
        df[coluna] = df[coluna].str.replace("Eduardo Soares", "Eduardo Verano", regex=False)
    return df

def processar_conta(conta):
    email = conta["email"]
    senha = conta["senha"]
    if not email or not senha:
        return None
        
    resultado = {
        "df_conta": None,
        "df_ranking": None,
        "df_ranking_ap": None,
        "df_ranking_pp": None,
        "df_semana": None
    }
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 1600})
        page = context.new_page()
        
        try:
            # 1. Extração de Produção
            df_conta = extrair_dados_da_conta(page, email, senha)
            if df_conta is not None:
                resultado["df_conta"] = df_conta
            
            # 2. Extração de Ranking MUAPD (Já logado na conta)
            df_ranking = extrair_ranking_muapd(page)
            if df_ranking is not None:
                resultado["df_ranking"] = df_ranking

            # 3. Extração de Ranking AP (Já logado na conta)
            df_ranking_ap = extrair_ranking_ap(page)
            if df_ranking_ap is not None:
                resultado["df_ranking_ap"] = df_ranking_ap

            # 4.5. Extração de Ranking PP (Já logado na conta)
            df_ranking_pp = extrair_ranking_pp(page)
            if df_ranking_pp is not None:
                resultado["df_ranking_pp"] = df_ranking_pp

            # 5. Extração de Produção Semanal (Já logado na conta)
            df_semana = extrair_dados_semana_conta(page, email)
            if df_semana is not None:
                resultado["df_semana"] = df_semana

        except Exception as e:
            import traceback
            erro_detalhado = traceback.format_exc()
            print(f"ERRO na conta {email}: {e}")
            with open(f"log_erro_{email.split('@')[0]}.txt", "w") as f:
                f.write(erro_detalhado)
            page.screenshot(path=f"debug_erro_{email.split('@')[0]}.png")
        finally:
            page.close()
            context.close()
            browser.close()
            
    return resultado

def executar_robo():
    print("Iniciando o robô...")
    
    # Cria os arquivos vazios logo de cara para evitar erro no Git Add
    for arq in ["dados_extraidos.csv", "ranking_muapd.csv", "ranking_ap.csv", "ranking_pp.csv"]:
        if not os.path.exists(arq):
            with open(arq, "w", encoding="utf-8") as f:
                f.write("") 

    todos_os_dados = []
    todos_os_dados_semana = []
    rankings_acumulados = []
    rankings_ap_acumulados = []
    rankings_pp_acumulados = []
    
    # 1. Executa a busca no Google Sheets (Planilha do Mario)
    # Como o Sheets é por requisição simples, é instantâneo e roda em paralelo/início
    df_externo = extrair_dados_google_sheets()
    
    # 2. Executa as contas do CRM em paralelo
    import concurrent.futures
    contas_validas = [c for c in CONTAS if c["email"] and c["senha"]]
    resultados = []
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=len(contas_validas)) as executor:
        futuros = {executor.submit(processar_conta, conta): conta["email"] for conta in contas_validas}
        
        for futuro in concurrent.futures.as_completed(futuros):
            email = futuros[futuro]
            try:
                res = futuro.result()
                if res:
                    resultados.append(res)
                    print(f"Extração concluída com sucesso para a conta: {email}")
            except Exception as exc:
                print(f"Erro ao processar a conta {email}: {exc}")
                
    # 3. Consolida os resultados paralelos
    for res in resultados:
        if res["df_conta"] is not None:
            todos_os_dados.append(res["df_conta"])
        if res["df_ranking"] is not None:
            rankings_acumulados.append(res["df_ranking"])
        if res["df_ranking_ap"] is not None:
            rankings_ap_acumulados.append(res["df_ranking_ap"])
        if res["df_ranking_pp"] is not None:
            rankings_pp_acumulados.append(res["df_ranking_pp"])
        if res["df_semana"] is not None:
            todos_os_dados_semana.append(res["df_semana"])

    # 4. Adiciona dados externos do Google Sheets (Time Mario)
    if df_externo is not None:
        todos_os_dados.append(df_externo)
        
        # Adiciona nos rankings acumulados (exceto MUAPD/AA por solicitação do usuário)
        if 'AP [R$]' in df_externo.columns and 'AP' in df_externo.columns:
            df_ap_ext = df_externo[['Consultor/Nível', 'AP [R$]', 'AP']].rename(columns={
                'Consultor/Nível': 'Consultor',
                'AP [R$]': 'Valor',
                'AP': 'Quantidade'
            })
            rankings_ap_acumulados.append(df_ap_ext)
            
        if 'Total' in df_externo.columns:
            df_pp_ext = df_externo[['Consultor/Nível', 'Total']].rename(columns={
                'Consultor/Nível': 'Consultor',
                'Total': 'PP'
            })
            rankings_pp_acumulados.append(df_pp_ext)
        
    # Salva Produção
    if todos_os_dados:
        df_final = pd.concat(todos_os_dados, ignore_index=True)
        df_final = substituir_nomes(df_final, "Consultor/Nível")
        df_final.to_csv("dados_extraidos.csv", index=False)
        from datetime import datetime
        with open("last_update.txt", "w", encoding="utf-8") as f:
            f.write(datetime.utcnow().isoformat() + "Z")
        print("Dados de produção consolidados e salvos.")

    # Salva Produção Semanal
    if todos_os_dados_semana:
        df_semana_final = pd.concat(todos_os_dados_semana, ignore_index=True)
        df_semana_final = substituir_nomes(df_semana_final, "Consultor/Nível")
        df_semana_final.to_csv("dados_semana.csv", index=False)
        print("Dados semanais consolidados e salvos.")

    # Salva Ranking MUAPD
    if rankings_acumulados:
        df_ranking_final = pd.concat(rankings_acumulados, ignore_index=True)
        df_ranking_final = substituir_nomes(df_ranking_final, "Consultor")
        # Limpeza e Ordenação
        df_ranking_final['AA'] = pd.to_numeric(df_ranking_final['AA'], errors='coerce').fillna(0)
        df_ranking_final = df_ranking_final.sort_values(by='AA', ascending=False).drop_duplicates(subset=['Consultor'])
        df_ranking_final.to_csv("ranking_muapd.csv", index=False)
        print("Ranking MUAPD salvo com sucesso.")

        # Salva histórico de MUAPD (Maratona)
        try:
            import json
            import os
            from datetime import datetime, timezone, timedelta
            
            # Fuso horário de Brasília (UTC-3)
            fuso_br = timezone(timedelta(hours=-3))
            data_local = datetime.now(fuso_br)
            data_str = data_local.strftime("%Y-%m-%d")
            
            # Só atualiza em dias úteis (segunda=0 a sexta=4)
            if data_local.weekday() < 5:
                nome_arq_hist = "historico_muapd.json"
                historico = {}
                if os.path.exists(nome_arq_hist):
                    try:
                        with open(nome_arq_hist, "r", encoding="utf-8") as f:
                            historico = json.load(f)
                    except Exception as e:
                        print(f"Erro ao ler historico_muapd.json: {e}")
                
                # Lista de consultores com MUAPD > 0 hoje
                consultores_ativos = df_ranking_final[df_ranking_final['AA'] > 0]['Consultor'].tolist()
                
                # Registra/atualiza o dia de hoje
                historico[data_str] = consultores_ativos
                
                with open(nome_arq_hist, "w", encoding="utf-8") as f:
                    json.dump(historico, f, indent=4, ensure_ascii=False)
                print(f"Histórico de MUAPD atualizado para {data_str}: {len(consultores_ativos)} consultores ativos.")
            else:
                print("Final de semana. Histórico de MUAPD não atualizado.")
        except Exception as e:
            print(f"Erro ao salvar histórico de MUAPD: {e}")

    # Salva Ranking AP
    if rankings_ap_acumulados:
        df_ranking_ap_final = pd.concat(rankings_ap_acumulados, ignore_index=True)
        df_ranking_ap_final = substituir_nomes(df_ranking_ap_final, "Consultor")
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

    # Salva Ranking PP
    if rankings_pp_acumulados:
        df_ranking_pp_final = pd.concat(rankings_pp_acumulados, ignore_index=True)
        df_ranking_pp_final = substituir_nomes(df_ranking_pp_final, "Consultor")
        # Limpeza e Ordenação por valor numérico
        def parse_pp_ranking(val_str):
            try:
                return float(str(val_str).replace('.', '').replace(',', '.').strip())
            except:
                return 0.0
        
        df_ranking_pp_final['PP_Num'] = df_ranking_pp_final['PP'].apply(parse_pp_ranking)
        df_ranking_pp_final = df_ranking_pp_final[df_ranking_pp_final['PP_Num'] > 0]
        df_ranking_pp_final = df_ranking_pp_final.sort_values(by='PP_Num', ascending=False).drop_duplicates(subset=['Consultor'])
        df_ranking_pp_final = df_ranking_pp_final.drop(columns=['PP_Num'])
        df_ranking_pp_final = df_ranking_pp_final.head(10)
        df_ranking_pp_final.to_csv("ranking_pp.csv", index=False)
        print("Ranking PP consolidado e salvo.")



if __name__ == "__main__":
    executar_robo()
