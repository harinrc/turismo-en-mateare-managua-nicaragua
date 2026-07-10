# Configuracion de Firebase para Mateare Vivo

## 1) Crear proyecto en Firebase
1. Entra a https://console.firebase.google.com
2. Crea un proyecto nuevo.
3. En Project settings > General > Your apps, registra una app Web.
4. Copia la configuracion SDK y pegala en [firebase-config.js](firebase-config.js).

## 2) Activar login con Google
1. Ve a Authentication > Sign-in method.
2. Habilita Google.
3. En Authentication > Settings > Authorized domains, agrega tu dominio (o localhost en pruebas).
4. Para este proyecto en GitHub Pages, agrega especificamente: harinrc.github.io

## 3) Activar base de datos en tiempo real (Firestore)
1. Ve a Firestore Database > Create database.
2. Elige modo Production o Test (recomendado Production + reglas).
3. Crea dos colecciones:
   - places
   - services

## 4) Activar almacenamiento de imagenes
1. Ve a Storage > Get started.
2. Crea el bucket por defecto.
3. El sistema guardara imagenes en la ruta: places/{uid}/archivo.

## 5) Reglas recomendadas (minimas)

### Firestore rules
```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /places/{docId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if false;
    }

    match /services/{docId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if false;
    }
  }
}
```

### Storage rules
```txt
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /places/{uid}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == uid;
    }

    match /services/{uid}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

## 6) Estructura de datos esperada

### places
- name: string
- category: string
- description: string
- lat: number
- lng: number
- imageUrl: string
- tags: string[]
- createdByName: string
- createdAt: timestamp

### services
- name: string
- type: string
- contact: string
- schedule: string
- createdByName: string
- createdAt: timestamp

## 7) Probar fin a fin
1. Abre el sitio.
2. Si firebase-config.js tiene valores validos, veras boton Entrar con Google.
3. Inicia sesion.
4. Publica un lugar con imagen de archivo o URL.
5. Abre el sitio en otro dispositivo o navegador: deberia aparecer en tiempo real.

## 8) Solucion de problemas comunes
- Si no aparece login de Google: revisa Authentication > Sign-in method y dominios autorizados.
- Si falla la carga de imagen: revisa Storage rules y que storageBucket sea correcto.
- Si no aparecen datos en vivo: revisa Firestore rules y que exista la coleccion.
- Si la app queda en modo local: revisa que todos los campos de [firebase-config.js](firebase-config.js) esten completos.

## 8.1) Indexar imagenes en Google (Search Console)
Este proyecto incluye un generador automatico de sitemap de imagenes:

1. Ejecuta el generador antes de publicar cambios:
```powershell
node scripts/generate-image-sitemap.mjs
```

2. Verifica que exista [sitemap-images.xml](sitemap-images.xml) en la raiz del proyecto.

3. Publica el sitio (push/deploy a GitHub Pages).

4. En Google Search Console, envia estos dos sitemaps:
  - https://harinrc.github.io/turismo-en-mateare-managua-nicaragua/sitemap.xml
  - https://harinrc.github.io/turismo-en-mateare-managua-nicaragua/sitemap-images.xml

Notas:
- El generador toma imagenes estaticas desde [content.js](content.js) y publicaciones de Firestore (colecciones places/services) usando projectId/apiKey de [firebase-config.js](firebase-config.js).
- Si agregas imagenes nuevas en Firebase y quieres que Google las vea rapido, vuelve a correr el generador y publica de nuevo.

## 9) Asignar rol administrador (Custom Claims)
Usa este paso para dar acceso total solo a tu cuenta admin.

1. Crea una Service Account Key en Firebase Console:
  - Project settings > Service accounts > Generate new private key.
  - Guarda el JSON en tu PC (no lo subas al repositorio).

2. Instala dependencia una sola vez en este proyecto:
```powershell
npm init -y
npm install firebase-admin
```

Si PowerShell bloquea npm.ps1 por politica de ejecucion, usa:
```powershell
npm.cmd init -y
npm.cmd install firebase-admin
```

3. Ejecuta el script para asignar claim admin a tu correo:
```powershell
node scripts/set-admin-claim.mjs "C:\ruta\a\serviceAccountKey.json" "djhjrc96@gmail.com"
```

4. Cierra sesion y vuelve a iniciar sesion en la web para refrescar token.

5. Verifica en backend/reglas usando:
  - request.auth.token.admin == true

Nota de seguridad:
- No guardes el archivo serviceAccountKey.json en GitHub.
- Si la llave se filtra, revocala y genera una nueva.

## 10) Indexacion completa de imagenes en Google Search Console

Esta pagina implementa TRES mecanismos para que Google indexe tus imagenes:

### Mecanismo 1: Schema.org ImageObject (AUTOMATICO - Tiempo real)
- El archivo [app.js](app.js) genera automaticamente schema.org ImageObject cada vez que carga datos de Firestore.
- Funciona en tiempo real sin necesidad de ejecutar scripts.
- Google lee el schema directamente del HTML.
- **No requiere acciones manuales**.

### Mecanismo 2: sitemap-images.xml (Manual - Generado)
- El script [generate-image-sitemap.mjs](scripts/generate-image-sitemap.mjs) extrae imagenes de:
  1. Archivos estaticos (content.js)
  2. Base de datos Firestore (places y services)
- Antes de publicar cambios importantes, ejecuta:
```powershell
node scripts/generate-image-sitemap.mjs
```
- El archivo se genera en [sitemap-images.xml](sitemap-images.xml)
- Ambos sitemaps estan listados en [robots.txt](robots.txt)

### Mecanismo 3: Open Graph y metadatos (HTML)
- El HTML incluye og:image tags con width/height especificados.
- Tambien incluye metadatos para Twitter Cards y Pinterest.
- Se actualiza automaticamente en [index.html](index.html)

### Checklist: Que debe estar en Google Search Console
1. Propiedad verificada: harinrc.github.io
2. Sitemaps enviados:
   - https://harinrc.github.io/turismo-en-mateare-managua-nicaragua/sitemap.xml
   - https://harinrc.github.io/turismo-en-mateare-managua-nicaragua/sitemap-images.xml
3. Mostrar en Google Images habilitado:
   - En Google Search Console, ve a "Appearance" > "Rich Results" y verifica que las imagenes esten siendo indexadas.

### Workflow recomendado para actualizar imagenes
1. Los usuarios suben imagenes (salen automaticamente en el sitio).
2. App.js genera schema.org ImageObject automaticamente.
3. Cada 1-2 semanas, ejecuta:
```powershell
node scripts/generate-image-sitemap.mjs
```
4. Git push/deploy a GitHub Pages.
5. Google rastreara la pagina y actualizara el sitemap.
6. En 1-7 dias, las nuevas imagenes aparecen en Google Images.

### Diagnostico si las imagenes NO aparecen en Google Images
1. Abre Google Search Console > "Coverage" > Verifica que la URL este indexada.
2. En "Rich Results" revisa los errores de schema.org (si hay).
3. En "Image Coverage" verifica el estado de tus imagenes.
4. Usa Google Cache inspector para ver que HTML ve Google.
5. Verifica que:
   - Las URLs de imagen sean accesibles desde internet.
   - El Content-Type sea image/* (no text/html).
   - La imagen tenga ancho minimo 100px y alto minimo 100px.
   - La imagen sea en formato JPG, PNG, GIF, SVG o WebP.

### Problemas comunes

**Las imagenes de Firestore no aparecen en sitemap-images.xml**
- Verifica que los documentos en Firestore tengan el campo `imageUrls` (array de strings).
- El campo debe ser un array: `imageUrls: ["https://...", "https://..."]`
- Si esta vacio, el generador no lo incluira.

**El sitemap dice "0 image entries"**
- Solo extrae de content.js (imagenes estaticas).
- Las imagenes de Firestore estan incluidas pero estan vacias.
- Asegurate de que Firebase este guardando correctamente imageUrls.

**Google dice "Unsupported image format"**
- Verifica que la imagen sea JPG, PNG, GIF, SVG o WebP.
- No soporta HEIC, BMP, TIFF.

**Google dice "Image outside viewport"**
- Las imagenes deben estar visibles en el viewport o tener og:image tags.
- El sitio ya tiene og:image, asi que esta cubierto.
