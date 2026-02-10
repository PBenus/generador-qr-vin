# Generador QR — Buscador de VIN

App web que busca VINs desde un Google Sheet y genera códigos QR descargables.

## 🚀 Setup Local

```bash
# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000) en el navegador.

## 🔧 Variables de Entorno

Crear `.env.local` con:

```
NEXT_PUBLIC_CSV_URL=<URL del Google Sheet publicado como CSV>
```

## 📦 Deploy a Vercel

1. Subir el repositorio a GitHub
2. Ir a [vercel.com](https://vercel.com) → **New Project** → Importar el repo
3. En **Environment Variables**, agregar:
   - `NEXT_PUBLIC_CSV_URL` = URL del CSV publicado
4. Click **Deploy**

## 📋 Cómo Funciona

1. La app carga los VINs desde el Google Sheet publicado (hoja `REPORTE_UBICACION_AUTO`)
2. Escribes los últimos 4-6 dígitos del VIN en el buscador
3. Se filtran y muestran las opciones coincidentes
4. Al seleccionar un VIN, se genera un código QR
5. Puedes descargar el QR como imagen PNG
