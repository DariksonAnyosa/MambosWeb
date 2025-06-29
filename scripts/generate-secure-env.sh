#!/bin/bash

# 🔐 Generador de Claves Seguras para Mambos
echo "🔐 ====================================================="
echo "🔐 GENERANDO CLAVES SEGURAS PARA MAMBOS"
echo "🔐 ====================================================="

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${GREEN}✅ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }

# Generar claves seguras
JWT_SECRET=$(openssl rand -hex 64)
SESSION_SECRET=$(openssl rand -hex 64)
REFRESH_TOKEN_SECRET=$(openssl rand -hex 64)

# Obtener IP pública
print_info "Obteniendo IP pública..."
PUBLIC_IP=$(curl -s ifconfig.me || curl -s ipinfo.io/ip || echo "OBTENER-MANUALMENTE")

# Crear archivo .env para backend
print_info "Creando archivo .env seguro para backend..."

cat > backend/.env << EOF
# ===================================================================
# BACKEND - CONFIGURACIÓN SEGURA PARA PRODUCCIÓN
# ===================================================================
# 🔐 Generado automáticamente el $(date)
# ⚠️ NUNCA subir este archivo a GitHub

# === CONFIGURACIÓN DEL SERVIDOR ===
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# === CLAVES DE SEGURIDAD (GENERADAS AUTOMÁTICAMENTE) ===
JWT_SECRET=$JWT_SECRET
SESSION_SECRET=$SESSION_SECRET
REFRESH_TOKEN_SECRET=$REFRESH_TOKEN_SECRET

# === BASE DE DATOS ===
DB_PATH=./data/mambos.db

# === CORS - CONFIGURAR SEGÚN NECESIDADES ===
# Para desarrollo local y red local:
FRONTEND_URL=*

# Para producción con Vercel (descomentar y configurar):
# FRONTEND_URL=https://tu-app.vercel.app,https://tu-app-git-main-tu-usuario.vercel.app

# === RATE LIMITING ===
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=500

# === CONFIGURACIÓN ADICIONAL ===
LOG_LEVEL=info
BCRYPT_ROUNDS=12
PASSWORD_MIN_LENGTH=8
REQUIRE_STRONG_PASSWORD=true

# === INFORMACIÓN DE RED ===
# Tu IP pública actual: $PUBLIC_IP
# Actualizar según sea necesario
EOF

# Crear archivo .env para frontend (desarrollo)
print_info "Creando archivo .env para frontend..."

cat > .env << EOF
# ===================================================================
# FRONTEND - CONFIGURACIÓN PARA TU LAPTOP COMO BACKEND
# ===================================================================
# 🔐 Configuración segura para desarrollo
# ⚠️ Para producción, usar variables de entorno de Vercel

# === BACKEND EN TU LAPTOP ===
# Cambiar TU-IP-PUBLICA por tu IP real
VITE_API_URL=http://$PUBLIC_IP:3001/api
VITE_SOCKET_URL=http://$PUBLIC_IP:3001

# === CONFIGURACIÓN DE LA APP ===
VITE_APP_NAME=Mambos Web
VITE_APP_VERSION=1.0.0
VITE_DEBUG=false

# === NOTAS ===
# 1. Tu IP pública actual: $PUBLIC_IP
# 2. Configurar port forwarding en tu router (puerto 3001)
# 3. En Vercel, usar estas mismas variables pero sin este archivo
EOF

print_status "Archivos .env creados con claves seguras"

# Mostrar resumen
echo ""
echo "🎉 =============================================="
echo "🎉 CLAVES SEGURAS GENERADAS"
echo "🎉 =============================================="
echo ""
print_info "Archivos creados:"
echo "   ✅ backend/.env (con claves seguras)"
echo "   ✅ .env (configurado para tu IP: $PUBLIC_IP)"
echo ""
print_warning "IMPORTANTE:"
echo "   🔒 Los archivos .env están en .gitignore"
echo "   🌐 Configura port forwarding para puerto 3001"
echo "   ⚙️ En Vercel, usar las mismas variables manualmente"
echo ""
print_info "Próximos pasos:"
echo "   1. Configurar router (port forwarding)"
echo "   2. Probar backend: cd backend && npm start"
echo "   3. Subir a GitHub (sin archivos .env)"
echo "   4. Configurar Vercel con las variables correctas"
