# 🎨 ICONOS PARA LA PWA

Para completar la PWA, necesitas crear estos iconos:

## Tamaños requeridos:
- 72x72px
- 96x96px  
- 128x128px
- 144x144px
- 152x152px
- 192x192px
- 384x384px
- 512x512px

## Herramientas recomendadas:
1. **PWA Asset Generator**: https://tools.crawlink.com/tools/pwa-asset-generator
2. **RealFaviconGenerator**: https://realfavicongenerator.net/
3. **Canva**: Para crear el diseño base

## Diseño sugerido:
- Fondo: Gradient (#667eea a #764ba2)
- Icono: 🍽️ o logo de Mambos
- Bordes redondeados para iOS
- Contraste alto para legibilidad

## Comando para generar desde una imagen base:
```bash
# Instalar herramienta
npm install -g pwa-asset-generator

# Generar todos los tamaños
pwa-asset-generator logo-base.png public/icons/ --manifest public/manifest.json
```

Por ahora, puedes usar iconos temporales o emojis hasta crear los definitivos.
