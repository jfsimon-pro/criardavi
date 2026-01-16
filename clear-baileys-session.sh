#!/bin/bash

# Script para limpar sessão do Baileys quando necessário
# Use quando o QR code não estiver gerando corretamente

echo "🧹 Limpando sessão do Baileys..."

if [ -d "auth_info_baileys" ]; then
    rm -rf auth_info_baileys
    echo "✅ Sessão antiga removida!"
else
    echo "ℹ️  Nenhuma sessão encontrada."
fi

echo ""
echo "Agora você pode:"
echo "1. Reiniciar o servidor: npm run dev"
echo "2. Conectar novamente via QR code"
echo ""

