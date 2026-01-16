# 🗄️ Setup do Banco de Dados

## Mudanças Implementadas

O sistema agora usa **Prisma ORM** para persistir todas as conversas e mensagens no PostgreSQL, ao invés de armazenar apenas em memória.

### ✅ O que foi adicionado ao Schema:

1. **WhatsAppConnection** - Gerencia conexões do WhatsApp (oficial e pirata)
2. **Chat** - Armazena conversas/contatos
3. **Message** - Armazena todas as mensagens (enviadas e recebidas)
4. **Campaign** - Para campanhas de disparo em massa
5. **AIConfig** - Configurações da IA de atendimento
6. **MessageTemplate** - Templates de mensagens reutilizáveis

### 🔄 Benefícios:

- ✅ **Persistência**: Mensagens não são mais perdidas ao reiniciar o servidor
- ✅ **Histórico completo**: Todas as conversas são salvas
- ✅ **Analytics**: Possibilidade de gerar relatórios e estatísticas
- ✅ **Escalabilidade**: Suporta múltiplas conexões e usuários
- ✅ **Sincronização**: Dados consistentes entre requisições

## 🚀 Como Rodar as Migrações

### 1. Certifique-se que o PostgreSQL está rodando

```bash
# Verifique se o banco de dados existe
psql -U postgres -l
```

### 2. Configure a variável de ambiente

No seu arquivo `.env`, certifique-se que a `DATABASE_URL` está configurada:

```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/nome_do_banco?schema=public"
```

### 3. Gere e execute a migração

```bash
# Gerar a migração (cria os arquivos SQL)
npx prisma migrate dev --name add_whatsapp_tables

# Ou, se preferir apenas aplicar sem prompt:
npx prisma migrate dev --name add_whatsapp_tables --skip-seed
```

### 4. Gere o Prisma Client

```bash
npx prisma generate
```

### 5. (Opcional) Visualize o banco de dados

```bash
npx prisma studio
```

Isso abrirá uma interface web em `http://localhost:5555` para visualizar e editar os dados.

## 📊 Estrutura do Banco de Dados

```
User (usuários do sistema)
  ↓
WhatsAppConnection (conexões do WhatsApp)
  ↓
Chat (conversas)
  ↓
Message (mensagens individuais)
```

## 🔧 Models Principais

### WhatsAppConnection
Armazena informações sobre conexões do WhatsApp (tanto oficial quanto pirata/Baileys).

### Chat
Cada conversa/contato tem um registro, incluindo:
- Nome do contato
- Última mensagem
- Contador de não lidas
- Atribuição para atendentes
- Status (IA ativa, assumido por humano, finalizado)

### Message
Todas as mensagens são salvas com:
- Texto completo
- Informações de mídia
- Status de entrega/leitura
- Timestamp real do WhatsApp
- Quem enviou (usuário, IA, ou recebida)

## 🐛 Troubleshooting

### Erro: "Can't reach database server"
```bash
# Verifique se o PostgreSQL está rodando
sudo systemctl status postgresql  # Linux
brew services list                # macOS
```

### Erro: "Migration failed"
```bash
# Resete o banco de dados (CUIDADO: apaga todos os dados)
npx prisma migrate reset

# Ou aplique a migração manualmente
npx prisma db push
```

### Erro: "Module not found: @prisma/client"
```bash
# Reinstale as dependências
npm install
npx prisma generate
```

## 📝 Próximos Passos

Após rodar as migrações, você pode:

1. **Testar a conexão**: Use `/atendente/inbox-pirata` para conectar
2. **Ver os dados**: Use `npx prisma studio` para visualizar
3. **Criar campanhas**: Implemente a funcionalidade de disparos em massa
4. **Configurar IA**: Configure o modelo e prompts no AIConfig

## ⚠️ Importante

- **Backup**: Sempre faça backup antes de rodar migrações em produção
- **Ambiente**: Use um banco de dados diferente para desenvolvimento e produção
- **Seeds**: O arquivo `prisma/seed.ts` pode ser usado para popular dados iniciais

## 💡 Comandos Úteis

```bash
# Ver status das migrações
npx prisma migrate status

# Aplicar migrações pendentes
npx prisma migrate deploy

# Resetar banco (dev only)
npx prisma migrate reset

# Abrir Prisma Studio
npx prisma studio

# Formatar schema.prisma
npx prisma format
```

