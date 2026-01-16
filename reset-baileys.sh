#!/bin/bash

echo "🔄 Resetando Baileys para nova tentativa de conexão..."
echo ""

# 1. Limpa sessão antiga
if [ -d "auth_info_baileys" ]; then
    echo "🧹 Removendo sessão antiga..."
    rm -rf auth_info_baileys
    echo "✅ Sessão removida!"
else
    echo "ℹ️  Nenhuma sessão encontrada."
fi

echo ""
echo "📋 Próximos passos:"
echo "1. Reinicie o servidor: npm run dev"
echo "2. Acesse: /atendente/inbox-pirata"
echo "3. Clique: Conectar WhatsApp"
echo "4. Escaneie o QR code RAPIDAMENTE (< 30s)"
echo "5. Aguarde até 60s para conectar"
echo ""
echo "💡 Dica: Se o celular ficar 'Conectando...'"
echo "   - Verifique firewall"
echo "   - Desabilite VPN"
echo "   - Tente em outra rede"
echo ""

