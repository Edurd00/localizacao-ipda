
```markdown
# Localização IPDA - Sistema de Validação de Geolocalização (GEO-VALIG)

Sistema Web interativo, responsivo e de alta performance desenvolvido em Next.js para gerenciamento, localização automática (Geocoding), roteamento inteligente e validação manual de coordenadas geográficas de mais de 12.000 igrejas da Igreja Pentecostal Deus é Amor (IPDA).

---

## 🚀 Arquitetura de Performance e Escalabilidade (Enterprise Grade)

O sistema foi arquitetado para suportar milhares de acessos simultâneos ao mapa com **custo zero** de processamento de banco de dados, utilizando os mais modernos paradigmas do ecossistema Vercel e Next.js:

*   **Full Route Caching (Edge CDN):** As rotas pesadas da API (`/api/igrejas/validadas` e `/api/organizacao`) são forçadas à estaticidade pelo servidor (`export const revalidate = 86400`). O payload do mapa (anteriormente de ~10MB, agora otimizado cirurgicamente para <2MB através da segmentação de queries `.select()` no Supabase) é injetado diretamente nos Nodes de Borda (CDN) da Vercel. 
*   **Expurgo sob Demanda (ISR On-Demand):** O sincronismo e a atualização do mapa acontecem em tempo real via ISR. Quando o administrador edita um dado, o gatilho `/api/revalidate` destrói agressivamente as tags nativas do Next.js (`revalidatePath`), forçando a reconstrução do JSON de forma assíncrona, não impactando a experiência do usuário.
*   **Gerenciamento de Estado no Cliente (SWR):** O consumo de dados pelo mapa público utiliza a biblioteca **SWR**. Isso assegura cacheamento local infalível no browser, tolerância a falhas na rede, "deduping" de requisições e fetch limpo (sem parâmetros "cache busters") para garantir o *Hit Rate* na CDN.
*   **Single Global Popup (DOM Otimizado):** Para suportar +9.800 marcadores simultâneos em dispositivos móveis, a renderização de modais (Popups do Leaflet) foi retirada do loop principal de marcadores. Um único `<Popup>` global é transicionado dinamicamente com base no `activePopupChurch`, zerando engasgos (freezes) no *MarkerClusterGroup* e permitindo interações instantâneas a 60 FPS.

---

## 📁 Estrutura Completa do Projeto

```text
Localizar/
├── public/                     # Arquivos estáticos acessíveis publicamente
│   ├── img/                    # Ícones e logotipo da aplicação
│   │   ├── favicon.jpg         # Favicon principal
│   │   └── logo.png            # Logotipo oficial
│   ├── globe.svg, next.svg, etc.
├── src/                        # Código-fonte principal da aplicação
│   ├── app/                    # App Router do Next.js (Páginas e Rotas de API)
│   │   ├── api/                # Endpoints HTTP da API Serverless
│   │   │   └── igrejas/
│   │   │       ├── save/       # POST: Salva a validação manual de uma igreja
│   │   │       ├── upload/     # POST: Importação em lote e cálculo hierárquico
│   │   │       ├── validadas/  # GET: Igrejas validadas otimizadas para o Mapa Geral (Edge Cached)
│   │   │       └── route.ts    # GET: Lista filtrada geral de igrejas e UFs
│   │   ├── api/revalidate/     # GET/POST: Rota de purga de cache ISR sob demanda
│   │   ├── mapa-geral/         # Página do "📍 Mapa Geral de Igrejas"
│   │   ├── gestao/             # Dashboard Analítico de Produtividade
│   │   ├── organizacao/        # Aba Pública de Hierarquias, Liderança e Coligações
│   │   └── page.tsx            # Página de validação interna
│   ├── components/             # Componentes de interface do usuário (UI)
│   │   ├── MapComponent.tsx    # Leaflet Map (Visualização unitária na validação)
│   │   ├── GeneralMapComponent.tsx # Engine Principal (Filtros, SWR, Rotas OSRM, Clustering)
│   │   ├── ChurchDetailModal.tsx   # O Modal Dinâmico Rico (Single Popup Pattern)
│   │   ├── RouteCompareModal.tsx   # Painel Comparador de Rotas Geográficas
│   │   ├── DashboardView.tsx   # Gráficos e Exportação (.xlsx)
│   │   └── SpreadsheetUpload.tsx # Leitor Excel/CSV de importação vertical
│   └── lib/                    # Camada de Serviços, DB e Utils
│       ├── db.ts               # Conexões Neon DB / Supabase e Query Builders otimizadas
│       ├── parser.ts           # Motor interpretador de planilhas complexas
│       └── geocoding.ts        # Normalizador de UFs e geocódigos

```

---

## 📌 Principais Recursos e Funcionalidades Implementadas

### 1. 📍 Mapa Geral Global (`/mapa-geral`)

Dashboard geoespacial projetado para diretores e supervisores monitorarem todos os pontos da igreja pelo mundo.

* **Visualização Dual**: Alternância entre mapa limpo (OpenStreetMap) e visão fotográfica (Esri Satélite) por cima de overlays ajustados.
* **Painel de Filtros Reativos (React Portal)**: Modal desacoplado da árvore do mapa, permitindo abrir, fechar e pesquisar (via `<HeaderSearchBar>` com `useTransition`) de forma instantânea sem causar repinturas massivas (re-renders) no mapa base.
* **Trava Anti-Bumerangue na Câmera**: Ao selecionar uma congregação, a câmera realiza um `flyTo` fixo, bloqueando reorientações automáticas involuntárias da tela enquanto o usuário interage.

### 2. 🎨 Agrupamentos (Clusters) Inteligentes e Cores por Estado

Para organizar quase 10.000 pontos de forma elegante e fluida:

* **Cores por Região Geográfica**: A cor da bolha do cluster é definida por cálculo dinâmico verificando qual Estado (UF) predomina naquele agrupamento (ex: Amarelo para SP, Azul para Região Sul, etc).
* **Legendas Dinâmicas**: Dois sistemas de legenda independentes: um de Portes (Desktop/Mobile) e outro sanfona para os Clusters de Regiões.

### 3. 🕸️ Teia de Coligações Multinível (Hierarquia de Obreiros)

As coligações representam o encadeamento corporativo da IPDA de forma visual:


$$\text{LOCAL} \rightarrow \text{REGIONAL} \rightarrow \text{CENTRAL} \rightarrow \text{SETORIAL} \rightarrow \text{ESTADUAL}$$

* **Traçado Dinâmico**: Ao abrir o modal, o operador pode clicar em "Ver Malha de Conexão". O motor varre a árvore genealógica de forma ascendente e descendente, traçando polilinhas de alta precisão (em azul/roxo neon tracejado) conectando a igreja alvo a todos os seus supervisores ou subordinados, isolando essa malha visualmente do resto do mundo.

### 4. 🚗 Motor de Roteamento Terrestre e Tomada de Decisão (API OSRM)

Foi desenvolvida uma integração robusta com o serviço Open Source Routing Machine para roteamento "A to B" diretamente no mapa:

* **Rotas e Logística**: Capacidade de clicar em uma igreja e traçar uma rota de carro ou a pé (desenhando a polilinha sobre ruas exatas) até a sua Sede Superior, incluindo cálculos de Tempo Estimado e Quilometragem em tempo real.
* **Comparador Analítico de Rotas**: Um módulo inteligente (`<RouteCompareModal>`) que permite aos administradores definirem uma Igreja "Alvo" e simularem a distância geográfica exata contra duas Sedes Candidatas (Candidata A vs Candidata B). O sistema indica visualmente qual sede proporcionará mais economia em quilometragem e tempo de viagem, permitindo realizar a **Transferência de Coligação** em um clique após a análise.

### 5. 🗄️ Estrutura Resiliente de Banco de Dados (Supabase/Neon DB)

* **Importador Sequencial Inteligente**: O backend aceita uploads de arquivos `.xlsx`, processando o Buffer via Base64 e ignorando sujeiras (como cabeçalhos flutuantes). O algoritmo lê a sequência vertical da planilha e infere automaticamente quem é a Sede Pai de quem, atualizando o campo `codigo_totvs_pai` em massa.
* **Fatiamento de Payload**: O `.select()` da listagem do mapa não traz texto lixo, focando puramente em coordenadas e metadados, o que derruba o tamanho do JSON e habilita o Vercel Edge Caching completo.

---

## ⚙️ Como Executar o Projeto Localmente

1. Clone o repositório.
2. Instale as dependências:
```bash
npm install

```


3. Crie um arquivo `.env` na raiz do projeto com a chave do seu banco de dados Supabase/Neon:
```env
DATABASE_URL="postgres://usuario:senha@host:5432/nomedobanco?sslmode=require"

```


4. Inicie o servidor de desenvolvimento:
```bash
npm run dev

```


5. Acesse `http://localhost:3000` no seu navegador.

---

## 👨‍💻 Autoria e Direitos Reservados

Projeto idealizado, arquitetado e desenvolvido por **Luiz Eduardo Rodrigues Da Silva**.
Construído para otimizar, digitalizar e revolucionar a logística, a infraestrutura e a gestão de dados geográficos da IPDA no Brasil e no Mundo.

*Todos os direitos reservados à lógica proprietária e arquitetura deste software.*

```
