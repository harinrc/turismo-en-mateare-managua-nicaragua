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
