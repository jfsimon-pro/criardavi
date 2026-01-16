import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/ai-config
 * Retorna a configuração de IA atual
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }
        
        // Buscar ou criar configuração padrão
        let config = await prisma.aIConfig.findFirst();
        
        if (!config) {
            // Prompt padrão baseado no template C6 Bank (prompt.json)
            const defaultPrompt = `=== PERSONA ===
Nome: Henrique
Empresa: C6 Bank
Você é um HUMANO REAL, representante do C6 Bank. NUNCA admita ser robô, IA ou assistente virtual.

=== REGRAS ABSOLUTAS ===
1. NUNCA admitir que é robô, IA ou assistente virtual
2. Sempre agir como um humano real do C6 Bank, com naturalidade e coerência emocional
3. NUNCA reiniciar a conversa por mensagens curtas como "oi", "olá", "ok" - CONTINUE de onde parou
4. NUNCA inventar valores, taxas ou políticas
5. NUNCA pedir dados sensíveis ou desnecessários
6. Respostas CURTAS, naturais e estilo WhatsApp
7. Usar emojis com MUITA moderação - no máximo 1 emoji por mensagem, e apenas quando fizer sentido. PREFIRA NÃO USAR.

=== CONTEXTO DO PRODUTO ===
- Produto: Consignado INSS
- Valor Liberado: R$ 1.400,00
- Parcela: R$ 39,00
- Taxa de Juros: 1,79%
- Data do Depósito: 10 de Janeiro
- Início do Pagamento: Março
- Órgão: INSS

=== MENSAGEM DE ABERTURA (primeiro contato) ===
Use algo como:
"Olá, {nome}! Tudo bem? Aqui é o Henrique, representante do C6 Bank.

Verifiquei o seu contrato com o banco C6 e surgiu uma nova oportunidade para você: MARGEM DE AUMENTO 2026.

- Com essa condição, o valor de R$ 1.400,00 cai na sua conta no dia 10 de Janeiro;
- Com uma parcela de apenas R$ 39,00.
- Além disso, você só começa a pagar a partir de Março.

Esse valor te ajuda hoje?"

=== RESPOSTAS DE RETOMADA ===
Se o cliente mandar "oi", "olá" ou mensagem curta após já ter conversado, NÃO reinicie. Use:
- "Oi! Como posso te ajudar agora?"
- "Opa! Me diz como posso continuar te ajudando."

=== FORA DO ESCOPO ===
Para assuntos não relacionados ao consignado C6:
"Consigo te ajudar com assuntos relacionados ao consignado do C6 Bank. Sobre esse tema específico, não tenho informações, mas posso te ajudar com dúvidas ou simulação."

=== ETAPAS DO ATENDIMENTO ===

**ETAPA 1 - ESCLARECIMENTO DE DÚVIDAS**
Quando o cliente demonstrar interesse:
"Que bom saber disso, {nome}! Antes de seguir, você ficou com alguma dúvida sobre como funciona a operação, sobre o depósito no dia 10 de Janeiro ou sobre o fato de só começar a pagar em Março?"

Após esclarecer dúvidas:
"Perfeito, {nome}! Se ficou claro, posso seguir com o processo e te orientar na parte da documentação, tudo bem?"

**ETAPA 2 - COLETA DE DADOS**
Início:
"Ótimo, {nome}! Então vamos seguir com a análise. Vou te pedir só alguns dados e documentos básicos pra avançar com segurança, tudo bem?"

Solicitação:
"Pra eu conseguir seguir com a análise aqui, vou te pedir só uma foto do seu documento (RG ou CNH, frente e verso) e os dados da conta onde você prefere receber o valor no dia 10 de Janeiro (banco, agência, conta e se é corrente ou poupança). Pode ser?"

Segurança (se o cliente hesitar):
"Fica tranquilo(a), {nome}. Essas informações são usadas apenas pra análise e liberação do seu consignado, todo o processo é bancário e seguro."

**ETAPA 3 - FECHAMENTO (HANDOFF PARA HUMANO)**
IMPORTANTE: Esta é a última etapa. Quando o cliente ENVIAR as fotos do documento E os dados bancários:
1. Confirme que recebeu tudo
2. Diga que vai digitar o contrato
3. Inclua [HANDOFF] no INÍCIO da sua resposta

Mensagem de fechamento:
"[HANDOFF] Perfeito, {nome}! Recebi tudo certinho aqui. As fotos do documento ficaram nítidas e os dados bancários estão completos — obrigado por agilizar! Agora vou digitar o seu contrato aqui no sistema e, na sequência, te envio o link de formalização pra você concluir a etapa final da operação, tá bom? Assim que estiver tudo pronto, te encaminho o link certinho."

O cliente NÃO deve saber que foi transferido. O [HANDOFF] é removido antes de enviar.

=== TRATAMENTO DE NEGATIVAS ===
NÃO desista na primeira negativa!

**Primeira negativa - use argumentos:**
"Entendo perfeitamente, {nome}. Só te aviso porque vale muito a pena: agora sua taxa está em 1,79%, que é a menor do mercado. A partir de Janeiro, as taxas sobem e o valor liberado normalmente diminui.

Hoje você ainda garante os R$ 1.400,00 pra receber no dia 10 de Janeiro, com parcela baixa de R$ 39,00 e só começa a pagar em Março.

Se quiser, te mostro rapidinho o que você ganha aproveitando agora e o que pode perder se deixar pra depois — sem nenhum compromisso."

**Segunda negativa - tente mais uma vez:**
"Claro, sem problema! Só não quero que você perca essa condição, porque agora você ainda recebe R$ 1.400,00 no dia 10, com parcela baixa e carência até Março.

Se quiser, te mostro rapidinho como isso ficaria pra você hoje."

**Terceira negativa - encerre educadamente:**
"Tranquilo, {nome}! Fico à disposição se mudar de ideia ou quiser só tirar alguma dúvida."

=== ESTILO DE RESPOSTAS ===
- Tom: humano, simpático, profissional
- Parágrafos curtos
- Naturalidade de WhatsApp
- NÃO soar como robô
- Substitua {nome} pelo nome do contato`;

            // Follow-ups padrão baseados no prompt.json (2h, 6h, 23h)
            const defaultFollowUps = [
                {
                    id: 1,
                    time: 2,
                    unit: 'horas',
                    message: 'Oi! Vi que talvez não tenha conseguido ver ainda. Essa condição permite receber em 10 de janeiro, sem correria agora. Posso te explicar rapidinho, se quiser.'
                },
                {
                    id: 2,
                    time: 6,
                    unit: 'horas',
                    message: 'Sei que o dia pode ser corrido, então fico à disposição quando for melhor pra você. A proposta é simples e sem impacto agora — começo de pagamento só mais pra frente.'
                },
                {
                    id: 3,
                    time: 23,
                    unit: 'horas',
                    message: 'Encerrando o contato por agora pra respeitar seu tempo. Quando quiser revisar essa condição ou avaliar outra opção, fico à disposição.'
                }
            ];

            config = await prisma.aIConfig.create({
                data: {
                    isActive: true,
                    model: 'gpt-4o-mini',
                    temperature: 0.7,
                    maxTokens: 1000,
                    systemPrompt: defaultPrompt,
                    greeting: 'Olá! Tudo bem? Aqui é o Henrique, representante do C6 Bank.',
                    fallbackMessage: 'Consigo te ajudar com assuntos relacionados ao consignado do C6 Bank. Sobre esse tema específico, não tenho informações.',
                    maxMessagesPerChat: 20,
                    responseDelay: 2,
                    workingHours: defaultFollowUps
                }
            });
        }
        
        // Buscar follow-ups (armazenados no workingHours como JSON temporariamente)
        const followUps = config.workingHours as any[] || [];
        
        return NextResponse.json({
            success: true,
            config: {
                id: config.id,
                isActive: config.isActive,
                model: config.model,
                temperature: config.temperature,
                maxTokens: config.maxTokens,
                systemPrompt: config.systemPrompt,
                greeting: config.greeting,
                fallbackMessage: config.fallbackMessage,
                maxMessagesPerChat: config.maxMessagesPerChat,
                responseDelay: config.responseDelay,
                followUps
            }
        });
    } catch (error) {
        console.error('Error getting AI config:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/ai-config
 * Reseta a configuração de IA para o padrão
 */
export async function DELETE() {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }
        
        // Verificar se é admin
        const userId = parseInt(session.user.id);
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true }
        });
        
        if (user?.role !== 'ADMIN') {
            return NextResponse.json(
                { success: false, error: 'Only admins can reset AI config' },
                { status: 403 }
            );
        }
        
        // Deletar configuração existente
        await prisma.aIConfig.deleteMany();
        
        console.log('🗑️ AI Config reset - will use new defaults on next GET');
        
        return NextResponse.json({
            success: true,
            message: 'AI config reset. Refresh the page to load new defaults.'
        });
    } catch (error) {
        console.error('Error resetting AI config:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/ai-config
 * Atualiza a configuração de IA
 */
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }
        
        // Verificar se é admin
        const userId = parseInt(session.user.id);
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true }
        });
        
        if (user?.role !== 'ADMIN') {
            return NextResponse.json(
                { success: false, error: 'Only admins can update AI config' },
                { status: 403 }
            );
        }
        
        const body = await request.json();
        const {
            isActive,
            systemPrompt,
            greeting,
            fallbackMessage,
            maxMessagesPerChat,
            responseDelay,
            followUps
        } = body;
        
        // Buscar config existente ou criar
        let config = await prisma.aIConfig.findFirst();
        
        const updateData: any = {};
        
        if (isActive !== undefined) updateData.isActive = isActive;
        if (systemPrompt !== undefined) updateData.systemPrompt = systemPrompt;
        if (greeting !== undefined) updateData.greeting = greeting;
        if (fallbackMessage !== undefined) updateData.fallbackMessage = fallbackMessage;
        if (maxMessagesPerChat !== undefined) updateData.maxMessagesPerChat = maxMessagesPerChat;
        if (responseDelay !== undefined) updateData.responseDelay = responseDelay;
        if (followUps !== undefined) updateData.workingHours = followUps; // Usando workingHours para armazenar follow-ups
        
        if (config) {
            config = await prisma.aIConfig.update({
                where: { id: config.id },
                data: updateData
            });
        } else {
            config = await prisma.aIConfig.create({
                data: {
                    isActive: isActive ?? true,
                    model: 'gpt-4o-mini',
                    temperature: 0.7,
                    maxTokens: 1000,
                    systemPrompt: systemPrompt || 'Você é um assistente virtual.',
                    greeting,
                    fallbackMessage,
                    maxMessagesPerChat: maxMessagesPerChat ?? 20,
                    responseDelay: responseDelay ?? 2,
                    workingHours: followUps
                }
            });
        }
        
        console.log('✅ AI Config updated');
        
        return NextResponse.json({
            success: true,
            config
        });
    } catch (error) {
        console.error('Error updating AI config:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

