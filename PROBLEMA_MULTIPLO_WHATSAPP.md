# 🐛 Problema do Múltiplo WhatsApp - Documentação

## Descrição do Problema

Ao conectar **múltiplos números de WhatsApp simultaneamente** (cada usuário com seu próprio número), o **segundo usuário conectado não conseguia receber nem enviar mensagens**, enquanto o primeiro funcionava normalmente.

---

## 🔍 Diagnóstico

### Sintomas Observados

1. **User 1** (primeiro a conectar): ✅ Funcionava perfeitamente
2. **User 5** (segundo a conectar): ❌ Não recebia mensagens, não enviava

### Logs Reveladores

```
📩 User 5: Received 1 message(s), type: notify, connectionId: null
⏭️  User 5: Skipping messages - Type: notify, HasConnectionId: false
```

O `connectionId` do User 5 era **`null`**, fazendo com que as mensagens fossem **ignoradas**.

---

## 🧩 Causas Identificadas

### Causa 1: `connectionId` não sendo configurado corretamente

Quando um usuário **reconectava** (usando credenciais salvas, sem escanear QR code), o evento `connection === 'open'` era disparado, mas o `connectionId` não estava sendo recuperado do banco de dados.

**Fluxo problemático:**
1. User 5 conecta → credenciais salvas são usadas
2. Conexão abre sem passar pelo fluxo de "nova conexão"
3. `connectionId` permanece `null`
4. Mensagens são ignoradas

### Causa 2: Chamada incorreta da função `grantNumberAccess`

A função esperava um **objeto** de permissões:

```typescript
// Assinatura correta:
grantNumberAccess(userId, connectionId, { canRead, canWrite, canManage }, grantedBy?)
```

Mas estava sendo chamada com **booleans separados**:

```typescript
// Chamada ERRADA:
grantNumberAccess(userId, connectionId, true, true, true, true)
```

Isso causava o erro:
```
Argument `grantedBy`: Invalid value provided. Expected Int or Null, provided Boolean.
```

---

## ✅ Soluções Implementadas

### Solução 1: Função `recoverConnectionIdFromDB`

Criada uma função para recuperar o `connectionId` do banco quando for `null`:

```typescript
async function recoverConnectionIdFromDB(userId: number, phoneNumber: string): Promise<number | null> {
    const connection = await prisma.whatsAppConnection.findUnique({
        where: { phoneNumber }
    });
    
    if (connection) {
        // Garante que o usuário tem acesso
        const existingAccess = await prisma.numberAccess.findFirst({
            where: { userId, connectionId: connection.id }
        });
        
        if (!existingAccess) {
            await grantNumberAccess(userId, connection.id, {
                canRead: true,
                canWrite: true,
                canManage: true,
            });
        }
        
        return connection.id;
    }
    return null;
}
```

### Solução 2: Handler de mensagens robusto

O handler de `messages.upsert` agora tenta múltiplas formas de recuperar o `connectionId`:

```typescript
instance.sock.ev.on('messages.upsert', async ({ messages, type }) => {
    // Se connectionId é null mas temos phoneNumber, tenta recuperar do banco
    if (!instance.connectionId && instance.phoneNumber) {
        const recoveredId = await recoverConnectionIdFromDB(userId, instance.phoneNumber);
        if (recoveredId) {
            instance.connectionId = recoveredId;
        }
    }
    
    // Se ainda não temos connectionId, tenta pegar o phoneNumber do socket
    if (!instance.connectionId && !instance.phoneNumber && instance.sock?.user?.id) {
        const phoneFromSocket = instance.sock.user.id.split(':')[0];
        if (phoneFromSocket) {
            instance.phoneNumber = phoneFromSocket;
            const recoveredId = await recoverConnectionIdFromDB(userId, phoneFromSocket);
            if (recoveredId) {
                instance.connectionId = recoveredId;
            }
        }
    }
    
    // Agora processa as mensagens...
});
```

### Solução 3: Correção das chamadas de `grantNumberAccess`

Todas as chamadas corrigidas para usar objeto:

```typescript
// ANTES (errado):
await grantNumberAccess(userId, connectionId, true, true, true, true);

// DEPOIS (correto):
await grantNumberAccess(userId, connectionId, {
    canRead: true,
    canWrite: true,
    canManage: true,
});
```

---

## 📁 Arquivos Modificados

1. **`src/lib/baileys-server.ts`**
   - Adicionada função `recoverConnectionIdFromDB`
   - Modificado handler de `messages.upsert` para recuperar `connectionId`
   - Corrigidas 3 chamadas de `grantNumberAccess`
   - Adicionados logs detalhados para debug

2. **`src/lib/permissions.ts`**
   - Nenhuma alteração (função já estava correta)

3. **`src/app/api/baileys/status/route.ts`**
   - Adicionado `getConnectionInfo` para debug

---

## 🧪 Como Testar

1. Conecte o **User 1** com um número de WhatsApp
2. Em outra aba/navegador, conecte o **User 5** com outro número
3. Envie uma mensagem para o número do User 5
4. Verifique os logs:

**Esperado:**
```
📩 User 5: Received 1 message(s), type: notify, connectionId: null
⚠️  User 5: connectionId is null, attempting to recover from DB...
🔄 User 5: Recovered connectionId 2 from DB for phone XXXXXXXXX
✅ User 5: Recovered connectionId: 2
📨 User 5: Processing message - Chat: ...
✅ User 5: Message saved successfully
```

---

## 📅 Data da Resolução

**2 de Janeiro de 2026**

---

## 👤 Responsável

Resolvido durante sessão de pair programming com assistência de IA.

