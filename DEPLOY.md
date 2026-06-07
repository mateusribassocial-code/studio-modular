# Deploy no Vercel — Dashboard GPinheiro

## 1. Criar repositório Git

```bash
cd dashboard
git init
git add .
git commit -m "feat: dashboard inicial GPinheiro"
```

## 2. Subir para o GitHub

Crie um repositório no github.com (pode ser privado) e:

```bash
git remote add origin https://github.com/SEU_USUARIO/dashboard-gpinheiro.git
git push -u origin main
```

## 3. Importar no Vercel

1. Acesse vercel.com → "Add New Project"
2. Conecte o repositório GitHub
3. Framework: **Next.js** (detectado automaticamente)
4. Clique em **Deploy**

## 4. Configurar variáveis de ambiente

No painel do Vercel → Settings → Environment Variables, adicione:

| Variável | Onde obter |
|---|---|
| `GPINHEIRO_PASSWORD` | Defina uma senha forte |
| `META_ACCESS_TOKEN` | developers.facebook.com/tools/explorer |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | Google Ads API Center |
| `GOOGLE_ADS_CLIENT_ID` | Google Cloud Console |
| `GOOGLE_ADS_CLIENT_SECRET` | Google Cloud Console |
| `GOOGLE_ADS_REFRESH_TOKEN` | OAuth playground |
| `GOOGLE_ADS_CID_FLN` | ID da conta FLN (sem hífens) |
| `GOOGLE_ADS_CID_ITJ` | ID da conta ITJ (sem hífens) |
| `GA4_PROPERTY_ID` | Google Analytics → Admin → Property |
| `GA4_SERVICE_ACCOUNT_JSON` | Google Cloud Console → IAM → Service Accounts |
| `C2S_API_TOKEN` | Painel do Contact 2 Sales |

Consulte `.env.example` para instruções detalhadas de cada variável.

## 5. Testar o deploy

A URL ficará no formato: `https://dashboard-gpinheiro.vercel.app`

Compartilhe com o cliente: `https://dashboard-gpinheiro.vercel.app` → senha definida em `GPINHEIRO_PASSWORD`

## Adicionar novo cliente

1. Adicionar configuração em `lib/types.ts` (array FILIAIS ou novo cliente)
2. Adicionar rota em `proxy.ts`
3. Criar `app/novo-cliente/page.tsx`
4. Adicionar senha em `app/api/auth/route.ts`
