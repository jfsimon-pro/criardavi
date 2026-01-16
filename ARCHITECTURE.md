# 🏗️ Arquitetura Multi-Usuário e Multi-Conexão

## 📊 Visão Geral

O sistema foi otimizado para suportar **múltiplos usuários** (admins e atendentes) gerenciando **múltiplas conexões** do WhatsApp (oficial e pirata) de forma **compartilhada e segura**.

## 👥 Modelos de Usuário

### Cenários Suportados:

1. ✅ **Admin 1** tem 3 números Baileys + 2 números oficiais
2. ✅ **Admin 2** tem 2 números Baileys + 1 número oficial
3. ✅ **Atendente 1** pode acessar números do Admin 1 e Admin 2
4. ✅ **Atendente 2** pode acessar apenas números do Admin 1
5. ✅ **Múltiplos atendentes** podem responder no mesmo número
6. ✅ **Histórico completo** de quem fez o quê

## 🗄️ Estrutura do Banco de Dados

### 1. **User** (Usuários do Sistema)
```typescript
- id, name, email, password
- role: ADMIN | ATENDENTE
- isActive: boolean
```

**Relacionamentos:**
- Cria conexões (`createdConnections`)
- Tem acessos a números (`numberAccess`)
- Recebe chats atribuídos (`assignedChats`)
- Participa de chats (`chatParticipations`)
- Envia mensagens (`sentMessages`)

---

### 2. **WhatsAppConnection** (Números/Linhas)
```typescript
- id
- createdByUserId (quem configurou)
- type: OFFICIAL | PIRATE
- status: DISCONNECTED | CONNECTING | CONNECTED
- phoneNumber (único)
- displayName (ex: "Suporte", "Vendas")
- isShared: boolean (compartilhado entre equipe?)
- autoAssign: boolean (auto-atribuir novos chats?)
```

**Conceito:** Cada `WhatsAppConnection` representa uma **linha/número único** do WhatsApp.

**Exemplo:**
```
ID  | phoneNumber    | displayName | type     | createdBy
----|----------------|-------------|----------|----------
1   | 5511999999999 | Vendas      | PIRATE   | Admin1
2   | 5511888888888 | Suporte     | OFFICIAL | Admin1
3   | 5521777777777 | Financeiro  | PIRATE   | Admin2
```

---

### 3. **NumberAccess** (Controle de Acesso)
```typescript
- userId
- connectionId
- canRead: boolean
- canWrite: boolean
- canManage: boolean (conectar/desconectar)
```

**Conceito:** Define **quem pode fazer o quê** em cada número.

**Exemplo:**
```
userId | connectionId | canRead | canWrite | canManage
-------|--------------|---------|----------|----------
1      | 1            | true    | true     | true     (Admin total)
2      | 1            | true    | true     | false    (Atendente)
2      | 2            | true    | true     | false    (Atendente)
3      | 3            | true    | true     | true     (Admin do número 3)
```

**Permissões:**
- `canRead`: Ver conversas
- `canWrite`: Enviar mensagens
- `canManage`: Conectar/desconectar o número

---

### 4. **Chat** (Conversas)
```typescript
- id (chatId do WhatsApp)
- connectionId (qual número recebeu)
- contactName, contactNumber
- assignedAgentId (atendente principal)
- isAIActive, isHumanTakeover
- tags[], priority, department
```

**Conceito:** Cada conversa está vinculada a um **número específico**.

---

### 5. **ChatParticipation** (Histórico de Atendimento)
```typescript
- chatId
- userId
- role: AGENT | SUPERVISOR | OBSERVER
- joinedAt, leftAt
- messagesSent
```

**Conceito:** Registra **todos os usuários que participaram** de um chat, mesmo que não seja o atendente principal.

**Exemplo:**
Um chat pode ter:
- Atendente 1 (respondeu 5 mensagens)
- Atendente 2 (assumiu depois, respondeu 3 mensagens)
- Supervisor 1 (apenas observou)

---

### 6. **Message** (Mensagens)
```typescript
- messageId (ID do WhatsApp)
- chatId
- fromMe: boolean
- text, hasMedia, mediaType
- status: PENDING | SENT | DELIVERED | READ
- sentByUserId (qual atendente enviou)
- sentByAI: boolean
```

---

### 7. **ActivityLog** (Auditoria)
```typescript
- userId, userName, userRole
- action (ex: "CHAT_ASSIGNED", "MESSAGE_SENT")
- entity, entityId
- description, metadata
- ipAddress, userAgent
```

**Exemplos de logs:**
```
- "Admin João criou conexão Baileys 5511999999999"
- "Atendente Maria assumiu chat com Cliente ABC"
- "Admin Pedro desconectou número Vendas"
- "Atendente João enviou mensagem no chat X"
```

---

### 8. **UserStats** (Estatísticas)
```typescript
- userId (único)
- totalMessagesSent, totalMessagesReceived
- totalChatsHandled, activeChats, closedChats
- avgResponseTime, avgRating
```

**Para dashboards e gamificação!**

---

## 🔐 Fluxo de Permissões

### Cenário 1: Admin Criando Conexão
```
1. Admin cria WhatsAppConnection
2. Sistema automaticamente cria NumberAccess com permissões completas para o admin
3. Admin pode conceder acesso para atendentes via NumberAccess
```

### Cenário 2: Atendente Respondendo Chat
```
1. Atendente acessa /atendente/inbox-pirata
2. Sistema busca todas as WhatsAppConnection onde ele tem NumberAccess
3. Atendente vê apenas chats dos números que ele tem acesso
4. Ao enviar mensagem, verifica se tem canWrite=true
```

### Cenário 3: Múltiplos Atendentes no Mesmo Chat
```
1. Chat está atribuído ao Atendente 1 (assignedAgentId)
2. Atendente 2 também pode responder (se tiver acesso ao número)
3. Sistema cria ChatParticipation para ambos
4. Histórico mostra quem enviou cada mensagem (sentByUserId)
```

---

## 🚀 Benefícios da Arquitetura

### 1. **Escalabilidade**
- ✅ Suporta centenas de atendentes
- ✅ Suporta dezenas de números simultâneos
- ✅ Sem conflitos de acesso

### 2. **Segurança**
- ✅ Controle granular de permissões
- ✅ Auditoria completa (quem fez o quê)
- ✅ Isolamento entre números/equipes

### 3. **Flexibilidade**
- ✅ Números compartilhados ou exclusivos
- ✅ Atribuição manual ou automática de chats
- ✅ Transferência de chats entre atendentes

### 4. **Análise e Gestão**
- ✅ Estatísticas por usuário
- ✅ Histórico completo de participações
- ✅ Relatórios de performance

---

## 📈 Casos de Uso Reais

### Caso 1: Empresa Pequena
```
- 1 Admin (dono)
- 2 Atendentes
- 1 Número Pirata (compartilhado)

Setup:
1. Admin cria conexão Baileys
2. Admin concede acesso para 2 atendentes (canRead + canWrite)
3. Todos respondem no mesmo número
4. Sistema registra quem respondeu cada chat
```

### Caso 2: Empresa Média
```
- 2 Admins
- 10 Atendentes
- 3 Números Oficiais (Vendas, Suporte, Financeiro)
- 2 Números Pirata (Urgência, Backup)

Setup:
1. Admin1 cria números Vendas e Suporte
2. Admin2 cria número Financeiro
3. Atendentes 1-5 → acesso a Vendas
4. Atendentes 6-8 → acesso a Suporte
5. Atendentes 9-10 → acesso a Financeiro
6. Todos admins → acesso a tudo
```

### Caso 3: Call Center Grande
```
- 5 Supervisores (role: ADMIN)
- 50 Atendentes
- 10 Números Oficiais (departamentos)
- Auto-atribuição de chats
- Sistema de filas

Setup:
1. Cada supervisor gerencia 2 números
2. Atendentes são organizados em equipes
3. Chats são auto-atribuídos por disponibilidade
4. Supervisores podem observar qualquer chat (ChatParticipation role: SUPERVISOR)
5. Dashboard com stats em tempo real
```

---

## 🛠️ Funções Helper Necessárias

### Para implementar no sistema:

```typescript
// Verificar se usuário tem acesso a um número
async function userHasAccess(userId: number, connectionId: number, permission: 'read' | 'write' | 'manage'): Promise<boolean>

// Listar números acessíveis por um usuário
async function getUserConnections(userId: number): Promise<WhatsAppConnection[]>

// Atribuir chat para atendente
async function assignChat(chatId: string, agentId: number): Promise<void>

// Registrar participação em chat
async function recordChatParticipation(chatId: string, userId: number): Promise<void>

// Conceder acesso a um número
async function grantNumberAccess(userId: number, connectionId: number, permissions: {...}): Promise<void>

// Log de atividade
async function logActivity(action: string, userId: number, entity: string, entityId: string, metadata?: any): Promise<void>
```

---

## 🔄 Migração e Deploy

### 1. Aplicar Schema
```bash
npx prisma db push
```

### 2. Criar Seeds (Dados Iniciais)
```typescript
// Criar admin principal
// Criar primeiro número
// Criar permissões default
```

### 3. Atualizar APIs
- Adicionar verificação de permissões
- Filtrar dados por acesso do usuário
- Registrar logs de atividade

---

## ✅ Checklist de Implementação

- [x] Schema do Prisma otimizado
- [ ] APIs de gestão de permissões
- [ ] Middleware de autorização
- [ ] UI para gerenciar acessos
- [ ] Dashboard com estatísticas
- [ ] Sistema de notificações
- [ ] Testes de permissões

---

**Resumo:** O sistema agora é **enterprise-ready** para equipes de qualquer tamanho! 🚀

