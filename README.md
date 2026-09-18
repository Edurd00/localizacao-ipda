```markdown
# Localização IPDA — Sistema de Geolocalização, Patrimônio & Inteligência de Dados (GEO-VALIG)

Sistema Web corporativo, responsivo e de alta performance desenvolvido em **Next.js (App Router)** para gerenciamento geoespacial, roteamento inteligente, controle patrimonial, validação cadastral e suporte à tomada de decisão para mais de 12.000 congregações da Igreja Pentecostal Deus é Amor (IPDA).

---

## 🚀 Arquitetura, Escalabilidade & Desempenho (Enterprise Grade)

O sistema foi arquitetado para suportar alto volume de acessos simultâneos ao mapa e consultas analíticas avançadas com máxima otimização de banco de dados e persistência resiliente:

* **Full Route Caching (Edge CDN):** As rotas de alta frequência do mapa (`/api/igrejas/validadas` e `/api/organizacao`) são servidas diretamente da borda (Vercel Edge CDN) com tempo de expiração estático configurado (`export const revalidate = 86400`). O payload do mapa é otimizado via seleções filtradas (`.select()`) no PostgreSQL/Supabase.
* **Purga de Cache sob Demanda (ISR On-Demand):** O sincronismo e a revalidação de dados em tempo real acontecem via ISR. Sempre que um gestor atualiza coordenadas, contatos ou status patrimoniais, o gatilho `/api/revalidate` renova as tags nativas do Next.js sem interromper a navegação dos usuários.
* **Persistência Multi-Camada Resiliente:** O motor de dados opera com uma arquitetura de alta disponibilidade em 3 níveis (PostgreSQL Pool -> Supabase REST Fallback -> In-Memory Store), garantindo que operações críticas (como envios de formulários ou consultas públicas) nunca fiquem indisponíveis.
* **Modo Escuro (Dark Mode System):** Gerenciamento de tema desacoplado com injeção automática da classe `.dark` no elemento `<html>`, sincronização com o `localStorage` (`ipda-theme`) e fallback nativo para `prefers-color-scheme`.
* **Single Global Popup (DOM Otimizado):** Renderização dinâmica de modais do Leaflet desacoplada do loop principal de marcadores para garantir navegação fluida a 60 FPS mesmo em agrupamentos de mais de 9.800 pontos.

---

## 📁 Estrutura Completa do Projeto (App Router)

```text
Localizar/
├── public/                         # Arquivos estáticos e recursos de mídia
│   ├── img/                        # Favicon e logotipo oficial IPDA
│   └── globe.svg, next.svg, etc.
├── src/                            # Código-fonte da aplicação
│   ├── app/                        # Next.js App Router (Páginas e APIs Serverless)
│   │   ├── api/                    # Endpoints HTTP REST da aplicação
│   │   │   ├── admin/              # Importação de contatos e cargas administrativas
│   │   │   ├── auth/               # Autenticação, sessão e controle de acessos
│   │   │   ├── coligacoes/         # Gestão de malha e topologia hierárquica
│   │   │   ├── igrejas/            # Validação, geocoding e atualização cadastral
│   │   │   └── patrimonio/         # Módulo de Patrimônio e Inteligência BI
│   │   │       ├── dashboard/      # GET: Métricas e agregações para o Dashboard BI
│   │   │       ├── estatisticas/   # GET: Re-exportação mantida para retrocompatibilidade
│   │   │       ├── lista/          # GET: Listagem matricial e filtros avançados
│   │   │       ├── public-submit/  # POST: Recebimento público de formulários de bens
│   │   │       └── [totvs]/        # GET: Consulta pública por código TOTVS
│   │   ├── coligacoes/             # 🔗 Malha & Topologia Hierárquica
│   │   ├── gestao/                 # 📝 Gestão Cadastral & Contatos
│   │   ├── gestao-patrimonio/      # 📦 Gestão de Patrimônio & Dashboard BI
│   │   ├── mapa-geral/             # 📍 Mapa Geral de Igrejas
│   │   ├── organizacao/            # 🌐 Visualizador Público de Organização e Jurisdições
│   │   ├── patrimonio/             # 📄 Módulo do Formulário Público de Patrimônio
│   │   │   └── [totvs]/            # Formulário de preenchimento individual por TOTVS
│   │   ├── relatorios/             # 📊 Relatórios de Matriz e Membresia
│   │   ├── validacao/              # 🎯 Validação de Igrejas e Coordenadas
│   │   ├── globals.css             # Estilos globais e suporte ao Dark Mode
│   │   ├── layout.tsx              # Layout raiz da aplicação
│   │   └── page.tsx                # Redirecionamento e entrada do sistema
│   ├── components/                 # Componentes React de UI / UX
│   │   ├── GeneralMapComponent.tsx # Engine Principal do Mapa (Filtros, SWR, Rotas OSRM, Clustering)
│   │   ├── MapComponent.tsx        # Visualizador unitário do Leaflet
│   │   ├── ChurchDetailModal.tsx   # Modal detalhado da congregação
│   │   ├── PatrimonioDetailModal.tsx# Visualizador detalhado de submissões patrimoniais
│   │   ├── PatrimonioPDF.tsx       # Gerador e exportador de PDF no padrão oficial
│   │   ├── RouteCompareModal.tsx   # Comparador analítico de rotas e proximidade
│   │   ├── SpreadsheetUpload.tsx   # Leitor Excel/CSV de cargas em lote
│   │   └── ThemeToggle.tsx         # Alternador de Tema Claro/Escuro (Sun/Moon)
│   └── lib/                        # Camada de serviços, banco de dados e utilitários
│       ├── auth.ts                 # Regras de autorização e verificação de papéis
│       ├── db.ts                   # Conexões PostgreSQL Pool / Supabase e Query Builders
│       ├── geocoding.ts            # Normalizador de UFs e geocódigos
│       ├── patrimonio.ts           # Regras de negócio, inserções e agregações do Patrimônio
│       └── theme.tsx               # Contexto React do Gerenciador de Tema (Dark/Light)

```

---

## 📌 Módulos e Funcionalidades Principais

### 📦 1. Módulo de Patrimônio & Dashboard de BI (`/gestao-patrimonio`)

Módulo voltado ao levantamento de bens, inventário e inteligência para auditoria de compras.

* **Visão Geral / Histórico de Envios:**
* **Tabela Matricial Consolidada:** Exibição sintética de bens agrupados em 5 categorias essenciais (*Mobiliário*, *Eletrônicos*, *Som & Instrumentos*, *Cozinha & Segurança*, *Adicionais*) e *Total Geral*.
* **Accordion e Detalhes:** Opção de expandir a linha da igreja diretamente na tabela para abrir a lista completa dos itens cadastrados com quantidade, estado de conservação (*Ótimo*, *Bom*, *Regular*, *Ruim*) e observações.
* **Filtro por Sede Cascata (TOTVS):** Busca por código TOTVS de Sede Superior com renderização em árvore genealógica de todas as congregações filiadas.
* **Exportação Faltantes:** Geração de planilha Excel (`cobranca_patrimonio_faltantes.xlsx`) filtrando igrejas com preenchimento pendente para acionamento via WhatsApp.
* **Correção Manual de TOTVS:** Ferramenta administrativa para reatribuição de submissões registradas com código incorreto pelo dirigente.


* **Dashboard de Itens & BI:**
* **KPIs Globais:** Totais de itens cadastrados, número de bens em estado crítico (*Ruim*) e média de itens por templo.
* **Painel de Filtros Integrado:** Filtros por *Região Geográfica*, *Estado (UF)*, *Sede Estadual*, *Porte da Igreja* e checkbox de *Auditoria de Compras* (filtra apenas itens danificados para orçamento e substituição).
* **Gráficos Dinâmicos (Recharts):** Gráfico de Rosca (Distribuição por Categoria) e Gráfico de Barras Horizontais (Estado de Conservação com cores verde, laranja e vermelha).
* **Paginação no Backend:** Proteção de banco de dados com navegação paginada por metadados (`page` e `limit`).



---

### 📄 2. Formulário Público de Patrimônio (`/patrimonio/[totvs]`)

Interface otimizada para ser utilizada por dirigentes e encarregados locais, inclusive em dispositivos móveis ou por usuários idosos.

* **Acesso Simplificado:** Rota direta por TOTVS `/patrimonio/1234` ou busca geral por nome/código.
* **Privacidade e Proteção de Dados (Write-Only):** Exibe exclusivamente dados mínimos públicos de endereço. Nomes, telefones antigos ou e-mails sensíveis não são expostos.
* **Validação Obrigatória do Responsável:** Coleta de Nome Completo e WhatsApp com máscara de formatação automática.
* **Atualização Condicional de Contato:** Se o responsável informar seus dados e a igreja estiver sem dirigente cadastrado na tabela oficial, o sistema atualiza o cadastro automaticamente.
* **Trava de Duplicidade Anual (2026):** Bloqueio inteligente que impede múltiplos envios para a mesma congregação no mesmo ano de referência.

---

### 📝 3. Gestão Cadastral & Contatos (`/gestao`)

Painel dedicado à manutenção dos dados das congregações.

* **Edição Cadastral Completa:** Alteração de endereços físicos, bairros, municípios e CEPs.
* **Padronização de Nomes:** Normalização e padronização dos nomes oficiais das igrejas no banco de dados.
* **Gestão de Liderança:** Cadastro e atualização de dirigentes locais e tesoureiros com links diretos para conversa no WhatsApp (`wa.me`).
* **Cadastro de Novas Igrejas:** Inclusão de novas congregações diretamente no sistema com geração de código TOTVS e geocodificação inicial.

---

### 🔗 4. Malha & Topologia Hierárquica (`/coligacoes`)

Módulo responsável pela estrutura corporativa e vínculos verticais entre templos.

* **Árvore de Coligação Vertical:** Visualização da malha agrupada por Estado (UF) e Sedes.
* **Gestão de Portes:** Promoção, reclassificação ou rebaixamento de porte (*Estadual*, *Setorial*, *Central*, *Regional*, *Local*, *Casa de Oração*, *Aldeia Indígena*).
* **Gestão de Vínculos (Sede Pai):** Reatribuição de igrejas subordinadas para novas Sedes de forma simples.
* **Status Operacional:** Desativação e encerramento oficial de templos.
* **Exibição Completa de Endereço:** Painel de detalhes com endereço, bairro, município e UF.

---

### 📍 5. Mapa Geral de Igrejas (`/mapa-geral`) & Roteamento

Engine geoespacial avançada para análise de proximidade e rotas.

* **Alternância de Mapas:** OpenStreetMap e Esri Satélite com camadas sobrepostas.
* **Motor de Roteamento Terrestre (OSRM):** Traçado de rotas ponto a ponto (A para B) sobre vias reais com cálculo de distância (km) e tempo estimado de viagem.
* **Comparador de Rotas e Proximidade (`<RouteCompareModal>`):** Simulação inteligente entre uma Igreja Alvo e duas Sedes Candidatas (Candidata A vs Candidata B) para demonstrar graficamente a economia de quilometragem antes de transferir a coligação.
* **Botão Flutuante de Tema:** Alternador de modo claro/escuro posicionado no canto superior direito do mapa, junto aos controles de camada.

---

### 🌐 6. Visualizador Público de Organização (`/organizacao`)

Interface pública interativa do mapa jurisdicional do Brasil.

* **Segurança Visual (UX/UI):** Esconde completamente as abas e menus restritos (*Validação & Gestão* / *Inteligência & BI*) para visitantes não autenticados, exibindo apenas conteúdos públicos de navegação.
* **Navegação por Estados e Campos:** Mapa vetorial interativo com seleção de UFs e jurisdições regionais.

---

## 🎨 Design System e Suporte ao Dark Mode

O sistema conta com um Design System moderno baseado em Tailwind CSS e cores de alto contraste:

* **Modo Claro (Light Mode):** Fundo `bg-slate-50`, cards `bg-white`, bordas `border-slate-200` e tipografia em cinza-grafite `text-slate-900`.
* **Modo Escuro (Dark Mode):** Fundo `dark:bg-slate-950`, cards `dark:bg-slate-900`, bordas `dark:border-slate-800` e fontes em branco nítido `dark:text-white` com 100% de opacidade durante a digitação.
* **Inputs e Selects Otimizados:** Caixas de entrada com contraste elevado para digitação nítida no tema escuro, evitando fontes acinzentalhas ou apagadas.

---

## ⚙️ Como Executar o Projeto Localmente

1. Clone o repositório:

```bash
git clone [https://github.com/seu-usuario/localizacao-ipda.git](https://github.com/seu-usuario/localizacao-ipda.git)
cd localizacao-ipda

```

2. Instale as dependências:

```bash
npm install

```

3. Crie o arquivo `.env` na raiz do projeto com as variáveis do banco PostgreSQL/Supabase:

```env
DATABASE_URL="postgres://usuario:senha@host:5432/nomedobanco?sslmode=require"
NEXT_PUBLIC_SUPABASE_URL="[https://seu-projeto.supabase.co](https://seu-projeto.supabase.co)"
SUPABASE_SERVICE_ROLE_KEY="sua-chave-service-role"

```

4. Execute as migrações/tabelas no banco (se necessário) e inicie o servidor de desenvolvimento:

```bash
npm run dev

```

5. Acesse `http://localhost:3000` no seu navegador.

---

## 👨‍💻 Autoria e Direitos Reservados

Projeto idealizado, arquitetado e desenvolvido por **Luiz Eduardo Rodrigues Da Silva**.
Desenvolvido para otimizar, digitalizar e revolucionar a logística, a infraestrutura patrimonial e a gestão de dados geográficos da IPDA no Brasil e no Mundo.

*Todos os direitos reservados à lógica proprietária e arquitetura deste software.*

```

```