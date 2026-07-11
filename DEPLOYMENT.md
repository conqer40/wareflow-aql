# نشر WareFlow أونلاين بدون فقدان ميزات

هذا المشروع ليس واجهة فقط؛ هو React + Express API + SQLite + ملفات مرفقات. لذلك يجب نشره كخدمة Node/Docker كاملة، وليس كـ static site فقط.

## متطلبات الاستضافة

اختر منصة تدعم:

- تشغيل Node.js server أو Docker container.
- متغيرات بيئة سرية.
- تخزين دائم persistent disk أو قاعدة بيانات خارجية؛ حتى لا تضيع SQLite والمرفقات بعد إعادة التشغيل.
- HTTPS.

## متغيرات البيئة المطلوبة

```env
NODE_ENV=production
HOST=0.0.0.0
PORT=7860
JWT_SECRET=اكتب_سر_طويل_عشوائي_لا_ينشر
ADMIN_PHONE=01023299755
ADMIN_PASSWORD=غيّرها_من_لوحة_الاستضافة_بعد_أول_دخول
APP_ORIGIN=https://your-live-domain.example
LOAD_DEMO_DATA=false
```

## أوامر البناء والتشغيل

لو المنصة تدعم Node مباشرة:

```bash
npm ci
npm run build
npm start
```

لو المنصة تدعم Docker:

```bash
docker build -t wareflow .
docker run -p 7860:7860 \
  -e NODE_ENV=production \
  -e HOST=0.0.0.0 \
  -e PORT=7860 \
  -e JWT_SECRET="change-me" \
  -e ADMIN_PHONE="01023299755" \
  -e ADMIN_PASSWORD="change-me" \
  -e LOAD_DEMO_DATA=false \
  wareflow
```

## ملاحظة مهمة عن Netlify

Netlify static deploy وحده لا يكفي لهذا النظام، لأنه سيرفع ملفات `dist` فقط ولن يشغل Express API أو SQLite. استخدامه بدون تحويل كامل إلى Netlify Functions وقاعدة بيانات خارجية سيكسر تسجيل الدخول والصلاحيات والجودة والتحويلات.

## الخيار المقترح للنشر السريع: Railway

Railway مناسب لهذا المشروع لأنه يدعم Express وDocker وVolumes. بعد إنشاء مشروع Railway:

1. اربط هذا المشروع أو ارفع الكود.
2. أضف Volume على المسار:

```text
/app/data
```

3. أضف متغيرات البيئة المذكورة بالأعلى.
4. تأكد أن المنفذ المستخدم هو `PORT` وأن `HOST=0.0.0.0`.

ملف `railway.json` موجود في المشروع ويحدد Dockerfile وHealthcheck.

## بديل مجاني بدون Koyeb: Render

ملف `render.yaml` موجود في المشروع. Render Web Service المجاني يشغل Node/Express ويعطي رابط HTTPS، لكنه قد ينام بعد عدم الاستخدام وقد لا يضمن تخزين SQLite المحلي بعد إعادة النشر. لذلك هو مناسب كبداية مجانية، وللإنتاج الحقيقي يفضّل قاعدة بيانات خارجية أو خطة بتخزين دائم.

إعدادات Render:

```text
Build Command: npm ci && npm run build
Start Command: npm start
Health Check Path: /api/health
```

متغيرات البيئة المطلوبة:

```env
NODE_ENV=production
HOST=0.0.0.0
LOAD_DEMO_DATA=false
JWT_SECRET=سر_عشوائي_طويل
ADMIN_PHONE=01023299755
ADMIN_PASSWORD=غيّرها_بعد_أول_دخول
```
