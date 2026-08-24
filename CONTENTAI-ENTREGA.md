# ContentAI - Guía de entrega y activación

## Estado del proyecto

La plataforma queda preparada para producción con:

- autenticación privada;
- usuarios, roles y permisos granulares;
- contenidos y flujo editorial;
- publicaciones y calendario;
- generadores IA de texto, imagen, audio y video;
- biblioteca multimedia;
- Supabase Vault;
- trazabilidad;
- LinkedIn y Facebook/Meta OAuth;
- motor de publicación;
- programación automática;
- métricas externas;
- Seguridad y QA;
- Centro de Lanzamiento.

## Regla de credenciales

No utilizar valores ficticios.

Las credenciales del cliente deben permanecer vacías hasta que sean
proporcionadas.

Las claves de IA, Client Secret de LinkedIn y App Secret de Meta se
gestionan desde la interfaz de Configuración y se almacenan en Vault.

No deben agregarse al frontend ni a variables NEXT_PUBLIC_.

## Variables de entorno de producción

El servidor de ContentAI necesita las variables Supabase indicadas en
`.env.production.example`.

`SUPABASE_SECRET_KEY` es un secreto de backend de ContentAI. Nunca debe
convertirse en `NEXT_PUBLIC_*`.

## Orden para activar producción

1. Desplegar ContentAI bajo un dominio HTTPS.
2. Configurar las variables de entorno Supabase del servidor.
3. Abrir `Seguridad y QA` y comprobar los controles.
4. Abrir `Centro de Lanzamiento` y registrar la URL HTTPS actual.
5. Abrir `Configuración`.
6. Introducir solamente las credenciales reales entregadas por el cliente.
7. Registrar en LinkedIn y Meta los callbacks OAuth definitivos.
8. Abrir `Conexiones` y autorizar las cuentas reales.
9. Realizar una publicación de prueba controlada.
10. Verificar el ID externo y el historial de intentos.
11. Activar el Programador.
12. Activar la sincronización automática de métricas.
13. Verificar Estadísticas y Trazabilidad.

## Callbacks OAuth

LinkedIn:

`https://TU-DOMINIO/api/integrations/linkedin/callback`

Facebook/Meta:

`https://TU-DOMINIO/api/integrations/facebook/callback`

Reemplazar `TU-DOMINIO` por el dominio HTTPS real.

## Health check

Producción puede comprobar:

`/api/health`

El endpoint no expone secretos.

## Validación local

El Paso 23 instala:

`scripts\validar-contentai.ps1`

Ejemplo sin build:

```powershell
powershell -ExecutionPolicy Bypass -File ".\scripts\validar-contentai.ps1"
```

Ejemplo incluyendo build:

```powershell
powershell -ExecutionPolicy Bypass -File ".\scripts\validar-contentai.ps1" -RunBuild
```

El build nunca es ejecutado automáticamente por los instaladores.

## Nota sobre plataformas externas

ContentAI puede quedar técnicamente preparado, pero las plataformas
externas conservan sus propios requisitos de permisos, revisión de
aplicaciones, OAuth y disponibilidad de APIs.

En particular, pegar un Client ID/Secret no sustituye la autorización OAuth
de la cuenta social.