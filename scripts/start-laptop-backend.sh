#!/bin/bash

# 🏠 Iniciar Backend en tu Laptop para Frontend en Vercel
echo "🏠 ====================================================="
echo "🏠 MAMBOS: BACKEND EN LAPTOP + FRONTEND EN VERCEL"
echo "🏠 ====================================================="

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

print_status() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

# Verificar si existe configuración
if [ ! -f "backend/.env" ]; then
    print_error "No se encontró backend/.env"
    print_info "Ejecuta primero: chmod +x scripts/generate-secure-env.sh && ./scripts/generate-secure-env.sh"
    exit 1
fi

# Obtener IPs
print_info "Obteniendo información de red..."
PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || echo "OBTENER-IP-MANUALMENTE")
if [[ "$OSTYPE" == "darwin"* ]]; then
    LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
else
    LOCAL_IP=$(hostname -I | awk '{print $1}')
fi

print_status "IP Local: $LOCAL_IP"
print_status "IP Pública: $PUBLIC_IP"

# Verificar dependencias
if [ ! -d "backend/node_modules" ]; then
    print_info "Instalando dependencias del backend..."
    cd backend && npm install && cd ..
fi

# Verificar base de datos
if [ ! -f "backend/data/mambos.db" ]; then
    print_info "Inicializando base de datos..."
    cd backend && npm run db:init && cd ..
fi

# Liberar puerto
print_info "Liberando puerto 3001..."
lsof -ti:3001 | xargs kill -9 2>/dev/null

# Función de limpieza
cleanup() {
    echo ""
    print_warning "Deteniendo servidor..."
    kill $BACKEND_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Iniciar backend
print_info "Iniciando backend en puerto 3001..."
cd backend && npm start &
BACKEND_PID=$!
cd ..

# Esperar que inicie
sleep 3

# Verificar que esté funcionando
if curl -s http://localhost:3001/health > /dev/null; then
    print_status "Backend iniciado correctamente"
else
    print_error "Error al iniciar el backend"
    exit 1
fi

# Mostrar información
echo ""
echo "🎉 =============================================="
echo "🎉 BACKEND INICIADO PARA VERCEL"
echo "🎉 =============================================="
echo ""
print_info "🏠 BACKEND (Tu laptop):"
echo "   • Local: http://localhost:3001"
echo "   • Red local: http://$LOCAL_IP:3001"
echo "   • Internet: http://$PUBLIC_IP:3001"
echo ""
print_info "🌐 FRONTEND (Vercel):"
echo "   • Configurar variables en Vercel:"
echo "     VITE_API_URL=http://$PUBLIC_IP:3001/api"
echo "     VITE_SOCKET_URL=http://$PUBLIC_IP:3001"
echo ""
print_warning "📋 PASOS PENDIENTES:"
echo "   1. ✅ Backend funcionando"
echo "   2. ⚠️  Configurar port forwarding (puerto 3001)"
echo "   3. ⚠️  Subir código a GitHub"
echo "   4. ⚠️  Desplegar en Vercel"
echo "   5. ⚠️  Configurar variables en Vercel"
echo ""
print_info "🔧 VERIFICACIONES:"
echo "   • Backend local: curl http://localhost:3001/health"
echo "   • Backend público: curl http://$PUBLIC_IP:3001/health"
echo ""
print_warning "💡 RECORDATORIOS:"
echo "   • Tu laptop debe estar SIEMPRE encendida"
echo "   • Configurar port forwarding en el router"
echo "   • No subir archivos .env a GitHub"
echo ""
echo "✋ Para detener: Ctrl+C"

# Mostrar logs en tiempo real
tail -f backend/logs/*.log 2>/dev/null &
wait $BACKEND_PID
