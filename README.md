# Painel de Gestão à Vista - W1 Goiânia

Este projeto consiste em um robô raspador (Python) que extrai dados de produção do CRM W1nner e envia os relatórios consolidados diretamente para um bucket **Cloudflare R2**. Um **Cloudflare Worker** atua como proxy seguro fornecendo esses dados para o frontend (Dashboard HTML/CSS/JS) protegido via **Cloudflare Access**.

---

## 🛠️ Arquitetura do Projeto

```
Robô Python (Local / GitHub Actions)
       ↓ (Upload direto)
Cloudflare R2 (Armazenamento dos CSVs/JSON)
       ↓ (Binding)
Cloudflare Worker (Proxy com CORS, Cache-Control e Content-Type)
       ↓ (Fetch)
Dashboard Frontend (Hospedado no Cloudflare Pages)
       ↓ (Segurança)
Cloudflare Access (Proteção contra acessos externos)
```

---

## 📦 1. Como Criar o Bucket no Cloudflare R2

1. Acesse o painel da [Cloudflare](https://dash.cloudflare.com/) e vá em **R2** no menu lateral esquerdo.
2. Clique em **Create bucket**.
3. Escolha o nome para o bucket (ex: `gestaoavista-bucket`) e clique em **Create bucket**.
4. **Gerar Credenciais API**:
   * No painel do R2 (fora do bucket específico), no lado direito, clique em **Manage R2 API Tokens**.
   * Clique em **Create API Token**.
   * Dê um nome ao token (ex: `Robo-Upload-Token`).
   * Em **Permissions**, selecione **Object Read & Write** (necessário para o robô fazer upload e ler histórico).
   * Em **Specify bucket(s)**, selecione **Apply to specific buckets** e marque o seu bucket criado.
   * Clique em **Create API Token**.
   * **IMPORTANTE**: Copie e salve em local seguro as credenciais exibidas:
     * **Access Key ID**
     * **Secret Access Key**
     * **Endpoint da Conta** (você usará o ID da conta que fica na URL do endpoint: `https://<account_id>.r2.cloudflarestorage.com`)

---

## 📡 2. Como Configurar e Publicar o Cloudflare Worker

O código do Worker está localizado na pasta `worker/`. Ele é responsável por servir as tabelas CSV e arquivos de histórico de forma segura, definindo CORS habilitado, cabeçalhos de tipo de conteúdo (`Content-Type`) adequados e removendo caches agressivos (`Cache-Control`) para que o painel mostre sempre a versão mais atualizada dos dados.

### Configuração:
1. Abra o arquivo `worker/wrangler.toml` no seu editor.
2. Altere o valor de `bucket_name` no final do arquivo para o nome exato do bucket que você criou (ex: `gestaoavista-bucket`):
   ```toml
   [[r2_buckets]]
   binding = "R2_BUCKET"
   bucket_name = "NOME_DO_SEU_BUCKET_CRIADO"
   ```

### Deploy:
1. No terminal, navegue até a pasta `worker`:
   ```bash
   cd worker
   ```
2. Caso não tenha o Wrangler instalado globalmente, faça o login na sua conta Cloudflare rodando:
   ```bash
   npx wrangler login
   ```
   *Uma aba do navegador se abrirá solicitando autorização. Autorize.*
3. Execute o deploy do Worker rodando:
   ```bash
   npx wrangler deploy
   ```
4. Após o deploy finalizar, copie a URL gerada para o Worker (ex: `https://gestaoavista-api.<seu-subdominio>.workers.dev`).

---

## 🔑 3. Como Configurar as Variáveis de Ambiente (`.env` e GitHub Secrets)

### Configuração Local (.env):
Renomeie ou copie o arquivo `.env.example` para `.env` na raiz do projeto e preencha as seguintes chaves com os valores criados no passo do R2:
```env
CONTA1_EMAIL="email1@gmail.com"
CONTA1_SENHA="senha_conta_1"
CONTA2_EMAIL="email2@gmail.com"
CONTA2_SENHA="senha_conta_2"

# Configurações do Cloudflare R2
R2_ACCOUNT_ID="O_ID_DA_SUA_CONTA_CLOUDFLARE"
R2_ACCESS_KEY_ID="SUA_ACCESS_KEY_ID_GERADA"
R2_SECRET_ACCESS_KEY="SUA_SECRET_ACCESS_KEY_GERADA"
R2_BUCKET="NOME_DO_SEU_BUCKET_R2"
```

### Configuração no GitHub Actions (Secrets):
Se a extração dos dados for executada na nuvem pelo GitHub Actions a cada 20 minutos (conforme definido em `.github/workflows/scraper.yml`), você deve configurar essas variáveis como **Repository Secrets**:
1. No seu repositório do GitHub, vá em **Settings** -> **Secrets and variables** -> **Actions**.
2. Clique em **New repository secret** e adicione cada uma das chaves abaixo com seus respectivos valores reais:
   * `CONTA1_EMAIL`
   * `CONTA1_SENHA`
   * `CONTA2_EMAIL`
   * `CONTA2_SENHA`
   * `R2_ACCOUNT_ID`
   * `R2_ACCESS_KEY_ID`
   * `R2_SECRET_ACCESS_KEY`
   * `R2_BUCKET`

---

## 🖥️ 4. Como Configurar o Frontend e Hospedar na Cloudflare

### Apontando para o Worker:
1. Abra o arquivo `app.js` na raiz do projeto.
2. Na constante `WORKER_URL` no topo do arquivo, adicione a URL gerada pelo deploy do seu Worker:
   ```javascript
   const WORKER_URL = "https://gestaoavista-api.<seu-subdominio>.workers.dev";
   ```
3. Salve o arquivo.

### Deploy do Frontend no Cloudflare Pages:
1. No painel da Cloudflare, vá em **Workers & Pages** -> **Create application** -> selecione a aba **Pages**.
2. Clique em **Connect to Git** e conecte seu repositório do GitHub.
3. Selecione o repositório deste projeto.
4. Na etapa de **Build settings**:
   * **Framework preset**: Selecione `None` (projeto estático simples).
   * **Build command**: Deixe em branco.
   * **Build output directory**: Coloque `.` (raiz do projeto, onde estão o `index.html`, `app.js`, `style.css` e a pasta `fotos`).
5. Clique em **Save and Deploy**.
6. Sua página estática será compilada e hospedada em uma URL do Cloudflare Pages (ex: `https://gestaoavista.pages.dev`).

---

## 🔒 5. Como Proteger o Dashboard com o Cloudflare Access

Para evitar que pessoas não autorizadas acessem os dados internos expostos no Dashboard, proteja-o usando o **Cloudflare Access (Zero Trust)**:

1. No painel do Cloudflare, vá em **Zero Trust** (menu lateral).
2. Se for o primeiro acesso, configure uma conta Zero Trust gratuita (selecione o plano de $0).
3. Vá em **Access** -> **Applications**.
4. Clique em **Add an application** e escolha a opção **Self-hosted**.
5. Preencha as configurações básicas:
   * **Application name**: `Gestão à Vista W1 Goiânia`
   * **Session Duration**: Defina por quanto tempo o usuário fica logado (ex: `1 month` se for uma TV fixa no escritório).
   * **Application URL**: Insira o subdomínio e domínio configurados no Cloudflare Pages (ex: `gestaoavista.pages.dev` ou seu domínio customizado).
6. Clique em **Next**.
7. Na página de política de acesso (**Policies**):
   * **Policy name**: `Acesso Permitido`
   * **Action**: `Allow`
   * Em **Configure rules**, no campo **Selector**, selecione **Emails** (ou **Emails Ending In** para aceitar todo o domínio da sua empresa, ex: `@w1.com.br`).
   * No campo de valor, digite os e-mails dos usuários permitidos (ex: `consultor1@w1.com.br`).
8. Clique em **Next** e depois em **Add application**.

Agora, ao acessar o Dashboard, os usuários serão redirecionados para uma tela de login segura do Cloudflare onde precisarão digitar seu e-mail e confirmar com um código PIN enviado no ato.
