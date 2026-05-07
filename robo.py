import os
from dotenv import load_dotenv
# pyrefly: ignore [missing-import]
from playwright.sync_api import sync_playwright
import pandas as pd
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
        # Clique via JS Puro (mais estável para elementos 'invisíveis')
        page.evaluate("""() => {
            let b = document.querySelector('button.btn-positive');
            if (!b) {
                const buttons = Array.from(document.querySelectorAll('button'));
                b = buttons.find(btn => btn.textContent.includes('Filtrar'));
            }
            if (b) b.click();
        }""")
        print("Clique via JavaScript disparado.")
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

def executar_robo():
    print("Iniciando o robô...")
    todos_os_dados = []
    
    with sync_playwright() as p:
        # headless=True é OBRIGATÓRIO para rodar no servidor em nuvem
        browser = p.chromium.launch(headless=True)

        for conta in CONTAS:
            if not conta["email"] or not conta["senha"]:
                continue
                
            # Cria um contexto com tela grande para garantir que botões no rodapé apareçam
            context = browser.new_context(viewport={'width': 1280, 'height': 1600})
            page = context.new_page()
            
            try:
                df_conta = extrair_dados_da_conta(page, conta["email"], conta["senha"])
                if df_conta is not None:
                    todos_os_dados.append(df_conta)
                else:
                    page.screenshot(path=f"erro_vazio_{conta['email'].split('@')[0]}.png")
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
        
    # Salva todos os dados combinados
    if todos_os_dados:
        print("\n--- Finalizando e combinando todos os dados ---")
        df_final = pd.concat(todos_os_dados, ignore_index=True)
        arquivo_saida = "dados_extraidos.csv"
        df_final.to_csv(arquivo_saida, index=False)
        print(f"SUCESSO TOTAL! {len(df_final)} linhas combinadas e salvas em {arquivo_saida}.")
        
        # Salva o horário UTC em formato ISO para o frontend exibir
        from datetime import datetime
        with open("last_update.txt", "w", encoding="utf-8") as f:
            f.write(datetime.utcnow().isoformat() + "Z")
        print("Arquivo last_update.txt gerado para o frontend.")
    else:
        print("\nNenhum dado pôde ser extraído de nenhuma conta.")

if __name__ == "__main__":
    executar_robo()
