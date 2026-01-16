# Sistema de Múltiplas Conexões WhatsApp

## ✅ Implementado com Sucesso!

O sistema agora suporta **múltiplas conexões simultâneas do Baileys**, onde cada usuário pode conectar seu próprio número de WhatsApp independentemente.

---

## 🔄 O que mudou?

### Antes (Sistema Global)
- **1 conexão para todos** os usuários
- Quando um usuário conectava, todos viam a mesma conexão
- Arquivo de autenticação único: `auth_info_baileys/`

### Agora (Sistema Multi-Usuário)
- **1 conexão por usuário** (isolada)
- Cada usuário tem sua própria sessão independente
- Arquivos de autenticação separados: `auth_info_baileys_1/`, `auth_info_baileys_2/`, etc.

---

## 🏗️ Arquitetura

### 1. **Mapa de Conexões** (`connections: Map<userId, ConnectionInstance>`)

Cada usuário tem sua própria instância de conexão:

```typescript
interface ConnectionInstance {
    sock: WASocket | null;              // Socket do Baileys
    qrCodeData: string | null;          // QR Code específico
    connectionStatus: 'disconnected' | 'connecting' | 'connected';
    qrCodeTimeout: NodeJS.Timeout | null;
    connectionTimeout: NodeJS.Timeout | null;
    connectionId: number | null;        // ID no banco
    userId: number;                     // ID do usuário
    phoneNumber: string | null;         // Número conectado
}
```

### 2. **Autenticação por Usuário**

Cada usuário tem sua própria pasta de credenciais:
- **Usuário 1**: `auth_info_baileys_1/`
- **Usuário 2**: `auth_info_baileys_2/`
- **Usuário N**: `auth_info_baileys_N/`

### 3. **Rotas da API Atualizadas**

Todas as rotas agora pegam o `userId` da sessão automaticamente:

```typescript
// Antes:
const userId = 1; // Hardcoded ❌

// Agora:
const session = await getServerSession();
const userId = parseInt(session.user.id); // Da sessão ✅
```

---

## 🚀 Como Funciona?

### Cenário 1: Dois usuários conectando simultaneamente

1. **Usuário A** (ID: 1):
   - Acessa `/atendente/inbox-pirata`
   - Clica em "Conectar WhatsApp"
   - Recebe QR Code único para ele
   - Escaneia com número `5561999999999`
   - Conectado! ✅

2. **Usuário B** (ID: 2):
   - Acessa `/atendente/inbox-pirata` (em outra aba/navegador)
   - Clica em "Conectar WhatsApp"
   - Recebe QR Code **diferente** do usuário A
   - Escaneia com número `5561888888888`
   - Conectado! ✅

Ambos ficam conectados **simultaneamente** e **independentemente**.

### Cenário 2: Reconexão automática

1. **Servidor reinicia**
2. **Usuário A** abre `/atendente/inbox-pirata`
3. Sistema detecta `auth_info_baileys_1/` existente
4. **Reconecta automaticamente** sem precisar de QR code
5. Conversas aparecem instantaneamente! ✅

---

## 📁 Estrutura de Arquivos

```
/whatsapp-davi-oficial
├── auth_info_baileys_1/          ← Sessão do Usuário 1
│   ├── creds.json
│   └── app-state-sync-*.json
├── auth_info_baileys_2/          ← Sessão do Usuário 2
│   ├── creds.json
│   └── app-state-sync-*.json
└── src/
    ├── lib/
    │   └── baileys-server.ts     ← Gerencia múltiplas conexões
    └── app/api/baileys/
        ├── connect/route.ts      ← Pega userId da sessão
        ├── status/route.ts       ← Pega userId da sessão
        ├── disconnect/route.ts   ← Pega userId da sessão
        ├── chats/route.ts        ← Pega userId da sessão
        ├── messages/route.ts     ← Pega userId da sessão
        └── send/route.ts         ← Pega userId da sessão
```

---

## 🎯 Funções Principais

### `initBaileysConnection(userId: number)`
Cria ou retorna a conexão para um usuário específico.

### `getQRCode(userId: number)`
Retorna o QR code da conexão do usuário.

### `getConnectionStatus(userId: number)`
Retorna o status da conexão do usuário: `disconnected`, `connecting` ou `connected`.

### `disconnectBaileys(userId: number)`
Desconecta o usuário específico.

### `getChats(userId: number)`
Retorna os chats do usuário (com permissões aplicadas).

### `sendMessage(userId: number, chatId: string, text: string)`
Envia mensagem usando a conexão do usuário.

---

## 🔒 Segurança e Permissões

- Cada usuário **só vê suas próprias conexões**
- Admins podem ver **todas as conexões** (se tiverem permissão)
- Atendentes veem apenas conexões com `NumberAccess` configurado
- Filtros aplicados no banco de dados (nível de `prisma`)

---

## 🧪 Como Testar

### Teste 1: Dois usuários simultâneos

1. **Abra dois navegadores diferentes** (ou uma aba normal + uma anônima)
2. **Login com contas diferentes** em cada navegador
3. **Acesse** `/atendente/inbox-pirata` em ambos
4. **Clique em "Conectar WhatsApp"** em ambos
5. **Escaneie os QR codes** com números diferentes
6. ✅ **Ambos devem conectar independentemente!**

### Teste 2: Reconexão automática

1. **Conecte normalmente** (escaneie QR code)
2. **Reinicie o servidor** (`Ctrl+C` e `npm run dev`)
3. **Recarregue a página** `/atendente/inbox-pirata`
4. **Aguarde 2-3 segundos**
5. ✅ **Deve reconectar automaticamente sem QR!**

### Teste 3: Isolamento de sessões

1. **Usuário A** conecta com número X
2. **Usuário B** conecta com número Y
3. **Usuário A** envia mensagem
4. ✅ **Mensagem sai do número X** (não do Y)
5. **Usuário B** envia mensagem
6. ✅ **Mensagem sai do número Y** (não do X)

---

## ⚠️ Notas Importantes

1. **Sessões antigas foram limpas**: `auth_info_baileys/` foi removida. Todos precisarão escanear QR code novamente na primeira vez.

2. **Cada usuário = 1 conexão**: Se o mesmo usuário tentar conectar em dois navegadores, a segunda tentativa vai usar a mesma conexão (não vai gerar novo QR).

3. **Backup disponível**: O arquivo antigo foi salvo em `src/lib/baileys-server.ts.backup` (se precisar reverter).

---

## 🐛 Troubleshooting

### "Já está conectado" mas não vejo conversas
- Recarregue a página
- Verifique se o status é "Conectado" (ícone verde)

### QR Code não gera
- Aguarde 10 segundos para limpeza automática
- Clique em "Conectar WhatsApp" novamente

### Duas pessoas veem a mesma conexão
- Verifique se estão logadas com contas **diferentes**
- Confirme que `session.user.id` está diferente para cada uma

---

## 📊 Logs Úteis

Para debug, observe o console do servidor:

```bash
🔄 User 1: Creating new Baileys connection...
🔑 User 1: Credenciais encontradas! Tentando reconectar automaticamente...
✅ User 1: QR Code generated successfully
🎉 User 1: Baileys connection opened successfully!
📞 User 1 - Connected number: 5561999999999

🔄 User 2: Creating new Baileys connection...
📂 User 2: Nenhuma credencial salva. QR code será gerado...
✅ User 2: QR Code generated successfully
🎉 User 2: Baileys connection opened successfully!
📞 User 2 - Connected number: 5561888888888
```

---

## ✅ Checklist de Implementação

- [x] Refatorar `baileys-server.ts` para múltiplas conexões
- [x] Criar `Map<userId, ConnectionInstance>`
- [x] Separar pastas de autenticação por usuário
- [x] Atualizar todas as rotas da API para pegar `userId` da sessão
- [x] Implementar `getConnectionInstance(userId)`
- [x] Testar conexões simultâneas
- [x] Limpar sessões antigas
- [x] Documentar sistema

---

**🎉 Sistema de múltiplas conexões funcionando perfeitamente!**

