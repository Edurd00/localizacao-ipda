# Localização IPDA - Sistema de Validação de Geolocalização (GEO-VALIG)

Sistema Web interativo desenvolvido em Next.js para gerenciamento, localização automática (Geocoding), tratamento de endereços e validação manual de coordenadas geográficas de mais de 12.000 igrejas da Igreja Pentecostal Deus é Amor (IPDA).

---

## 📁 Estrutura Completa do Projeto

```
Localizar/
├── public/                     # Arquivos estáticos acessíveis publicamente
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
│   │   │       │   └── route.ts  # POST: Importação em lote via upload de planilha (.xlsx/.csv)
│   │   │       └── route.ts      # GET: Lista igrejas filtradas por estado/status e lista de estados distintos
│   │   ├── favicon.ico         # Favicon original do Next.js
│   │   ├── globals.css         # Estilos globais e configuração Tailwind CSS v4
│   │   ├── layout.tsx          # Layout raiz da aplicação (Fontes Geist, Meta tags e estrutura global)
│   │   └── page.tsx            # Página principal / Painel split-screen de validação e importador de planilhas
│   ├── components/             # Componentes de interface do usuário (UI)
│   │   ├── MapComponent.tsx    # Componente de mapa Leaflet (Camadas Esri Satélite / OpenStreetMap e Marker arrastável)
│   │   ├── MapWrapper.tsx      # Wrapper dynamic import (ssr: false) para carregar o Leaflet apenas no navegador
│   │   └── SpreadsheetUpload.tsx # Drag & Drop e leitor de planilhas Excel/CSV via SheetJS (xlsx)
│   ├── img/                    # Imagens de identidade visual do projeto
│   │   ├── favicon.jpg         # Favicon e ícone da aplicação "Localização IPDA"
│   │   └── logo.png            # Logotipo oficial "Localização IPDA"
│   └── lib/                    # Camada de serviços, utilitários e dados
│       ├── db.ts               # Conexão com PostgreSQL (Neón/Postgres) com fallback automático em memória
│       └── parser.ts           # Normalizador e conversor de colunas de planilhas Excel para a estrutura de Igreja
├── .gitignore                  # Arquivos e pastas ignorados pelo Git
├── AGENTS.md                   # Regras e diretrizes para os agentes de IA
├── CLAUDE.md                   # Instruções secundárias para assistente de código
├── eslint.config.mjs           # Configurações do linter ESLint
├── next.config.ts              # Configuração do Next.js
├── package-lock.json           # Lockfile de dependências do npm
├── package.json                # Dependências e scripts do projeto
├── postcss.config.mjs          # Configuração do PostCSS para Tailwind
├── README.md                   # Documentação oficial do projeto
└── tsconfig.json               # Configurações do compilador TypeScript
```

---

## 🛠️ Tecnologias Utilizadas

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
- **Estilização**: Tailwind CSS v4 + Lucide React (Ícones)
- **Mapas**: Leaflet + React-Leaflet + Tiles Esri World Imagery (Satélite) & OpenStreetMap
- **Banco de Dados**: PostgreSQL (driver `pg`) com suporte ao Neon Serverless e fallback resiliente em memória
- **Geocodificação Gratuita**: OpenStreetMap Nominatim API + ViaCEP API (Processamento em cascata e sem custo de API)
- **Leitura de Planilhas**: SheetJS (`xlsx`)

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

## 📌 Principais Recursos e Funcionalidades

1. **Painel de Validação em Tela Dividida (Split-Screen)**:
   - Exibição sequencial dos dados de cada igreja (Código TOTVS, Descrição, Endereço, Bairro, Município, Estado, CEP).
   - Indicação visual do nível de precisão da geolocalização (`Localização Exata`, `Aproximada`, `Município` ou `Não Localizado`).
   - Assinatura do operador/validador salva localmente no navegador (`localStorage`).
   - Botões de ação rápida (`Salvar e Próxima` e `Marcar como Dúvida`).

2. **Geocodificação Automática em Cascata (Grátis)**:
   - Consulta em tempo real via OpenStreetMap (Nominatim) / ViaCEP com limpeza de sufixos (ex: remove `S/N`, `antigo endereço`, parênteses).
   - Preenchimento automático de Latitude, Longitude e geração dinâmica de link direto para o Google Maps (`https://www.google.com/maps?q=lat,lng`).

3. **Mapa de Satélite Interativo**:
   - Visualização em alta resolução via Esri World Imagery.
   - Marcador (Pin) arrastável em tempo real que atualiza instantaneamente a latitude e longitude nos campos do formulário.

4. **Importador Inteligente de Planilhas**:
   - Suporte a arquivos `.xlsx`, `.xls` e `.csv`.
   - Mapeamento flexível de cabeçalhos de colunas (aceita variações como `Codigo`, `Desc Igreja`, `Lat e Long`, `Endereco www`).

---

## 🤖 Guia de Referência Rápida para IAs (Jules / Antigravity)

Ao realizar modificações ou expansões no projeto:
1. **Regras do Next.js**: Atente-se às convenções do Next.js 16 (App Router, Server Actions / Route Handlers em `src/app/api/...`).
2. **Resiliência do Banco de Dados (`src/lib/db.ts`)**: Sempre mantenha o fallback para `memoryDb` ativo para que a aplicação funcione em ambientes sem PostgreSQL configurado.
3. **Geocodificação 100% Gratuita**: Não adicione APIs pagas que exijam chave de API (como Google Maps Geocoding API). Utilize a cascata grátis com Nominatim / ViaCEP.
4. **Tratamento de Coordenadas Nulas ou 0**: Garantir que `latitude` ou `longitude` iguais a `0`, `null` ou fora dos limites do Brasil sejam tratadas como coordenadas pendentes de geolocalização.
