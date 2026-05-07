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
        page.get_by_text("Selecionar todos", exact=False).first.click()
        time.sleep(1)
    except Exception as e:
        print("Aviso: 'Selecionar todos' não encontrado ou não clicável.")

    try:
        page.get_by_text("W1 Goiânia", exact=False).first.click()
    except Exception as e:
        print("Aviso: 'W1 Goiânia' não encontrado.")

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
        
        df = pd.DataFrame(dados_ranking)
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

def extrair_dados_google_sheets():
    """Busca dados da equipe externa na planilha do Google Sheets"""
    print("\n[GOOGLE SHEETS] Buscando dados do Time Mario...")
    url_planilha = "https://docs.google.com/spreadsheets/d/1MmoY1eIDApfLynUS3cKKc7OrEekEPEGSZjqz9ViOPW0/export?format=csv&gid=0"
    
    try:
        df_externo = pd.read_csv(url_planilha)
        # Mapear colunas para o padrão do nosso CSV
        # Planilha: Equipe, AA, AF, AP, AP [R$], REC, PP
        # Nosso CSV: Consultor/Nível, AA, AF, AP, AP [R$], Recs, Total
        
        df_externo = df_externo.rename(columns={
            'Equipe': 'Consultor/Nível',
            'REC': 'Recs',
            'PP': 'Total'
        })
        
        # Garante que o nome da equipe seja curto para o dashboard
        df_externo['Consultor/Nível'] = df_externo['Consultor/Nível'].apply(lambda x: str(x).split(' ')[0])
        
        print(f"✓ Dados do Time Mario carregados: {len(df_externo)} equipe(s).")
        return df_externo
    except Exception as e:
        print(f"✗ Erro ao buscar dados da planilha externa: {e}")
        return None

def executar_robo():
    print("Iniciando o robô...")
    
    # Cria os arquivos vazios logo de cara para evitar erro no Git Add
    for arq in ["dados_extraidos.csv", "ranking_muapd.csv"]:
        if not os.path.exists(arq):
            with open(arq, "w", encoding="utf-8") as f:
                f.write("") 

    todos_os_dados = []
    rankings_acumulados = []
    
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
        
    # 3. Busca dados externos (Time Mario)
    df_externo = extrair_dados_google_sheets()
    if df_externo is not None:
        todos_os_dados.append(df_externo)
        
    # Salva Produção
    if todos_os_dados:
        df_final = pd.concat(todos_os_dados, ignore_index=True)
        df_final.to_csv("dados_extraidos.csv", index=False)
        from datetime import datetime
        with open("last_update.txt", "w", encoding="utf-8") as f:
            f.write(datetime.utcnow().isoformat() + "Z")
        print("Dados de produção consolidados e salvos.")

    # Salva Ranking
    if rankings_acumulados:
        df_ranking_final = pd.concat(rankings_acumulados, ignore_index=True)
        # Limpeza e Ordenação
        df_ranking_final['AA'] = pd.to_numeric(df_ranking_final['AA'], errors='coerce').fillna(0)
        df_ranking_final = df_ranking_final.sort_values(by='AA', ascending=False).drop_duplicates(subset=['Consultor'])
        df_ranking_final.to_csv("ranking_muapd.csv", index=False)
        print("Ranking MUAPD salvo com sucesso.")

if __name__ == "__main__":
    executar_robo()
