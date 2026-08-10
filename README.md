# Localização IPDA - Sistema de Validação de Geolocalização (GEO-VALIG)

Sistema Web interativo desenvolvido em Next.js para gerenciamento, localização automática (Geocoding), tratamento de endereços e validação manual de coordenadas geográficas de mais de 12.000 igrejas da Igreja Pentecostal Deus é Amor (IPDA).

---

## 📁 Estrutura Completa do Projeto

```
Localizar/
├── public/                     # Arquivos estáticos acessíveis publicamente
│   ├── img/                    # Ícones e logotipo da aplicação
│   │   ├── favicon.jpg         # Favicon principal
│   │   └── logo.png            # Logotipo oficial
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
├── src/                        # Código-fonte principal da aplicação
│   ├── app/                    # App Router do Next.js (Páginas e Rotas de API)
│   │   ├── api/                # Endpoints HTTP da API Serverless
│   │   │   └── igrejas/
│   │   │       ├── save/
│   │   │       │   └── route.ts  # POST: Salva a validação manual de uma igreja (lat/lng, status, operador, link)
│   │   │       ├── upload/
│   │   │       │   └── route.ts  # POST: Importação em lote e cálculo hierárquico vertical de coligações
│   │   │       ├── validadas/
│   │   │       │   └── route.ts  # GET: Retorna as igrejas validadas otimizadas para o Mapa Geral
│   │   │       └── route.ts      # GET: Lista igrejas filtradas por estado/status e lista de estados distintos
│   │   ├── mapa-geral/
│   │   │   └── page.tsx        # Página do "📍 Mapa Geral de Igrejas Validadas" (Lazy loading, ssr: false)
│   │   ├── favicon.ico         # Favicon original do Next.js
│   │   ├── globals.css         # Estilos globais e configuração Tailwind CSS v4
│   │   ├── layout.tsx          # Layout raiz da aplicação (Fontes Geist, Favicon e Meta tags globais)
│   │   └── page.tsx            # Página principal / Painel split-screen de validação e importador de planilhas
│   ├── components/             # Componentes de interface do usuário (UI)
│   │   ├── MapComponent.tsx    # Componente de mapa Leaflet (Camadas Esri Satélite / OpenStreetMap e Marker arrastável)
│   │   ├── MapWrapper.tsx      # Wrapper dynamic import (ssr: false) para carregar o Leaflet apenas no navegador
│   │   ├── GeneralMapComponent.tsx # Painel principal do Mapa Geral (Filtros, Legenda retrátil, Malhas de conexão, Otimização de Performance, Trava de Câmera)
│   │   ├── DashboardView.tsx   # Dashboard analítico de progresso da validação
│   │   └── SpreadsheetUpload.tsx # Drag & Drop e leitor de planilhas Excel/CSV com envio base64
│   └── lib/                    # Camada de serviços, utilitários e dados
│       ├── db.ts               # Conexão com PostgreSQL (Neon DB) com fallback automático em memória e alter table dinâmico
│       ├── parser.ts           # Normalizador e conversor de colunas de planilhas Excel para a estrutura de Igreja
│       └── geocoding.ts        # Utilitários de normalização geográfica e travas de estado (UFs)
├── .gitignore                  # Arquivos e pastas ignorados pelo Git
├── AGENTS.md                   # Regras e diretrizes para os agentes de IA
├── CLAUDE.md                   # Instruções secundárias para assistente de código
├── eslint.config.mjs           # Configurações do linter ESLint
├── next.config.ts              # Configuração do Next.js
├── package-lock.json           # Lockfile de dependências do npm
├── package.json                # Dependências e scripts do projeto
├── postcss.config.mjs          # Configuração do PostCSS para Tailwind
├── README.md                   # Documentação oficial do projeto (Este arquivo)
└── tsconfig.json               # Configurações do compilador TypeScript
```

---

## 🚀 Como Executar o Projeto Localmente

### 1. Pré-requisitos
- Node.js (v18+) e npm instalado na máquina.

### 2. Instalação de Dependências
```bash
npm install
```

### 3. Variáveis de Ambiente (Opcional)
Crie um arquivo `.env.local` na raiz do projeto caso queira conectar a um banco PostgreSQL persistente (ex: Neon DB):
```env
DATABASE_URL=postgres://usuario:senha@host:5432/nomedobanco?sslmode=require
```
> *Nota*: Se `DATABASE_URL` não for informado, o sistema utilizará o banco em memória automaticamente.

### 4. Executando o Servidor de Desenvolvimento
```bash
npm run dev
```
Abra o navegador em `http://localhost:3000`.

---

## 📌 Principais Recursos e Funcionalidades Implementadas

### 1. 📍 Mapa Geral de Igrejas Validadas (`/mapa-geral`)
Um dashboard geoespacial em tela cheia projetado para supervisores monitorarem todos os pontos geolocalizados consolidados no sistema.
- **Visualização Dual**: Alternância entre mapa de ruas (OpenStreetMap) e imagens de alta resolução (Esri Satélite) por cima de overlays z-index calibrados.
- **Legenda Fixa**: Card de portes de igreja oficiais mapeado estritamente por cores.
- **Painel de Filtros Rápidos**: Pesquisa de texto reativa (TOTVS/Nome), filtro por Estado (UF), Tipo de Imóvel, e seleção por tags de Porte.
- **Filtro Hierárquico Regional**: Dropdowns inteligentes baseados na constante `REGOES_ESTADUAIS` que executam um enquadramento de câmera (`flyTo`) no ponto selecionado com zoom de alta precisão e abrem seu Popup automaticamente.

### 2. 🎨 Agrupamentos (Clusters) Inteligentes e Cores por Estado
Para organizar milhares de pontos no zoom global/estadual, implementamos o **Marker Clustering** altamente customizado:
- **Cores por Região Geográfica**: A cor de fundo de cada bolha de agrupamento é definida dinamicamente com base no Estado (UF) da maioria das igrejas contidas dentro daquele grupo:
  - 🟡 **Sudeste - SP** (`SP`): Amarelo Dourado (`#F59E0B`)
  - 🟧 **Sudeste - MG** (`MG`): Laranja (`#EA580C`)
  - 🔴 **Sudeste - ES e RJ** (`ES`, `RJ`): Vermelho (`#DC2626`)
  - 🔵 **Região Sul** (`PR`, `RS`, `SC`): Azul (`#2563EB`)
  - 🟢 **Região Norte** (`AC`, `AM`, `RO`, `PA`, `AP`, `RR`, `TO`): Verde (`#059669`)
  - 🟣 **Região Nordeste** (`AL`, `BA`, `CE`, `RN`, `PE`, `PI`, `MA`, `PB`, `SE`): Roxo (`#7C3AED`)
  - 🩵 **Região Centro-Oeste** (`MT`, `DF`, `GO`, `MS`): Ciano (`#0891B2`)
- **Estilização Moderna**: Círculo perfeito, número de contagem em **Branco Negrito (`#FFFFFF`)**, borda branca de `3px` sólida para alto contraste no satélite e sombras projetadas.
- **Legenda Retrátil (Sanfona)**: Painel flutuante compacto e retrátil no mapa que exibe este mapeamento de cores sem ocupar espaço visual.

### 3. 🕸️ Teia de Coligações e Malha de Conexão (Grafo Multinível)
As coligações representam o encadeamento hierárquico corporativo vertical:
$$\text{LOCAL} \rightarrow \text{REGIONAL} \rightarrow \text{CENTRAL} \rightarrow \text{SETORIAL} \rightarrow \text{ESTADUAL}$$

- **Desenho Dinâmico da Malha**: Ao clicar em **"Ver Malha de Conexão"** no Popup de qualquer igreja:
  - **Se for ESTADUAL (ou nó superior)**: O sistema calcula a **teia de cobertura completa** conectando todos os nós filhos e netos do estado inteiro simultaneamente até seus respectivos pais diretos, gerando um grafo geoespacial brilhante na tela.
  - **Se for LOCAL / REGIONAL / CENTRAL / SETORIAL**: Traça o caminho linear ascendente direto passando por cada nível até atingir a Estadual de referência.
- **Destaque Visual**: Todos os nós participantes da malha ativa são exibidos fora de clusters de agrupamento com pins neon pulsantes em alta prioridade (`zIndexOffset: 1000`).
- **Segmentos de Linha**: Polilinhas Leaflet (`L.polyline`) estilizadas em roxo/azul neon vibrante (`#6366F1`), espessura de `4px`, tracejado (`dashArray: "6, 6"`) e opacidade `0.9`.
- **Enquadramento de Câmera (`fitBounds`)**: Centralização automática com padding de `[50, 50]` englobando 100% da árvore conectada simultaneamente na tela.

### 4. 🗄️ Estrutura do Banco de Dados (Neon DB)
Damos suporte às relações hierárquicas através da coluna adicionada:
- **`codigo_totvs_pai` (VARCHAR(100))**: Armazena o código TOTVS do nó pai hierarquicamente superior direto para cada igreja.
- **Uploader Resiliente**: O importador de planilhas no servidor (`/api/igrejas/upload`) lê múltiplas abas, ignora cabeçalhos flutuantes de legendas, e utiliza o remapeamento sequencial vertical por blocos vazios para calcular esta coligação de forma automatizada e gravá-la em lotes otimizados de **500 registros por vez** (Bulk Upsert), eliminando erros de payload e timeout.
- **Modificações de Esquema**: O banco Neon DB executa um `ALTER TABLE igrejas ADD COLUMN IF NOT EXISTS codigo_totvs_pai VARCHAR(100);` automaticamente ao inicializar a base, mantendo plena integridade.

### 5. ⚡ Otimizações de Performance e Ajustes de UI no Mapa Geral
- **Escrita Fluidíssima na Busca (60 FPS)**: O campo de busca de texto (`HeaderSearchBar`) foi isolado em componente próprio com estado local e `useTransition` (React 18), garantindo que a digitação seja 100% instantânea sem provocar re-renders síncronos da árvore de marcadores do Leaflet ou do DOM do mapa.
- **Trava Anti-Bumerangue na Câmera**: Implementação da flag `preventAutoFit` no `MapController` e `RegionBoundsController`. Quando o usuário seleciona uma igreja na busca ou estadual de referência, a câmera realiza o `flyTo` com precisão e permanece fixa na igreja selecionada, bloqueando re-orientações automáticas involuntárias (`setView`/`fitBounds`) para a visão geral. A câmera só retorna à visão global quando o usuário clica explicitamente em "Limpar Filtros".
- **Painel de Filtros Desacoplado via Portal**: O modal de Filtros Rápidos (`FiltersModal`) foi envolvido em um React Portal (`ReactDOM.createPortal`), desvinculando sua renderização do ciclo do mapa. Sua abertura e fechamento ocorrem instantaneamente (0ms de atraso) sem recalcular a camada geoespacial.
- **Isolamento de Renderização com `React.memo`**: O mapa geoespacial (`MemoizedMapView`) foi isolado e memoizado, garantindo que digitações no cabeçalho ou interações com modais não provoquem reconciliações desnecessárias dos marcadores e clusters ao fundo.
- **Ajuste de Posição e Profundidade do Botão "Remover Malha"**: O container de controles flutuantes no canto superior direito foi ajustado com espaçamento superior seguro (`top-36 md:top-24`) e camada de profundidade coerente (`z-[1025]`), impedindo que a ação "Remover Malha / Limpar Linhas" ou a seleção de camada (Satélite/OSM) fiquem ocultas ou sobrepostas pela barra de navegação superior fixada (`Header`).
