# pyrefly: ignore [missing-import]
import streamlit as st
import pandas as pd

# Configuração da Página
st.set_page_config(page_title="Gestão à Vista", page_icon="📊", layout="wide")

# Título do Dashboard
st.title("📊 Painel de Gestão à Vista")
st.markdown("Bem-vindo ao dashboard. Estes dados são gerados automaticamente pelo nosso robô.")

# Função para carregar os dados
@st.cache_data
def carregar_dados():
    try:
        # Lê o CSV gerado pelo robo.py
        df = pd.DataFrame(pd.read_csv("dados_extraidos.csv"))
        return df
    except FileNotFoundError:
        st.warning("O arquivo 'dados_extraidos.csv' ainda não foi gerado. Rode o script do robô primeiro!")
        return None

df = carregar_dados()

if df is not None:
    # Cria colunas para os KPIs (Indicadores Principais)
    col1, col2, col3 = st.columns(3)
    
    total_valor = df['Valor'].sum()
    total_projetos = len(df)
    aprovados = len(df[df['Status'] == 'Aprovado'])
    
    with col1:
        st.metric("Valor Total", f"R$ {total_valor:,.2f}")
    with col2:
        st.metric("Total de Clientes/Projetos", total_projetos)
    with col3:
        st.metric("Projetos Aprovados", aprovados)
        
    st.markdown("---")
    
    # Divide a tela em duas colunas para os gráficos
    grafico_col1, grafico_col2 = st.columns(2)
    
    with grafico_col1:
        st.subheader("Status dos Projetos")
        # Conta a quantidade por status
        status_count = df['Status'].value_counts()
        st.bar_chart(status_count)
        
    with grafico_col2:
        st.subheader("Valores por Data")
        # Agrupa os valores por data
        valores_por_data = df.groupby('Data')['Valor'].sum()
        st.line_chart(valores_por_data)
        
    st.markdown("---")
    
    # Tabela com os dados brutos
    st.subheader("📋 Tabela de Dados Extraídos")
    # Filtro simples
    status_filtro = st.selectbox("Filtrar por Status:", ["Todos"] + list(df['Status'].unique()))
    
    if status_filtro != "Todos":
        df_filtrado = df[df['Status'] == status_filtro]
    else:
        df_filtrado = df
        
    st.dataframe(df_filtrado, use_container_width=True)

    # Botão para atualizar os dados manualmente na tela
    if st.button("Atualizar Dados"):
        st.cache_data.clear()
        st.rerun()
