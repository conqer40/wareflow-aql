import express from "express";
import cors from "cors";
import multer from "multer";
import PDFDocument from "pdfkit";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data"), uploadDir = path.join(root, "uploads");
fs.mkdirSync(dataDir, { recursive: true }); fs.mkdirSync(uploadDir, { recursive: true });
const db = new DatabaseSync(path.join(dataDir, "wareflow.db"));
const secret = process.env.JWT_SECRET || (process.env.NODE_ENV==="production" ? "" : "local-only-change-before-production");
if(!secret) throw new Error("JWT_SECRET is required in production");

db.exec(`PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,name TEXT,email TEXT UNIQUE,password_hash TEXT,role TEXT,active INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS documents(id INTEGER PRIMARY KEY,document_no TEXT UNIQUE,type TEXT,party TEXT,warehouse TEXT,document_date TEXT,value REAL,status TEXT,created_by INTEGER,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS stock(id INTEGER PRIMARY KEY,item_code TEXT UNIQUE,name TEXT,category TEXT,warehouse TEXT,qty_on_hand REAL,qty_reserved REAL,min_level REAL,unit_cost REAL,state TEXT);
CREATE TABLE IF NOT EXISTS approvals(id INTEGER PRIMARY KEY,document_id INTEGER,step_no INTEGER,approver_role TEXT,status TEXT DEFAULT 'بانتظار الاعتماد',comment TEXT,acted_by INTEGER,acted_at TEXT);
CREATE TABLE IF NOT EXISTS attachments(id INTEGER PRIMARY KEY,document_id INTEGER,file_name TEXT,file_url TEXT,mime_type TEXT,uploaded_by INTEGER,uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS audit_log(id INTEGER PRIMARY KEY,user_id INTEGER,action TEXT,entity_type TEXT,entity_id TEXT,details TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS qc_requests(id INTEGER PRIMARY KEY,document_id INTEGER,item_code TEXT,item_name TEXT,warehouse TEXT,qty REAL,result TEXT DEFAULT 'بانتظار الفحص',inspector TEXT,notes TEXT,created_by INTEGER,created_at TEXT DEFAULT CURRENT_TIMESTAMP,inspected_at TEXT);
CREATE TABLE IF NOT EXISTS transfers(id INTEGER PRIMARY KEY,transfer_no TEXT UNIQUE,from_warehouse TEXT,to_warehouse TEXT,item_code TEXT,item_name TEXT,qty REAL,status TEXT DEFAULT 'مسودة',reason TEXT,created_by INTEGER,created_at TEXT DEFAULT CURRENT_TIMESTAMP,received_at TEXT);`);

const userColumns=db.prepare("PRAGMA table_info(users)").all().map(x=>x.name);
if(!userColumns.includes("phone")) db.exec("ALTER TABLE users ADD COLUMN phone TEXT");
db.exec("CREATE UNIQUE INDEX IF NOT EXISTS users_phone_unique ON users(phone) WHERE phone IS NOT NULL");

if (!db.prepare("SELECT COUNT(*) n FROM users").get().n) { const phone=process.env.ADMIN_PHONE,password=process.env.ADMIN_PASSWORD;if(!phone||!password)throw new Error("ADMIN_PHONE and ADMIN_PASSWORD are required for first setup");db.prepare("INSERT INTO users(name,email,phone,password_hash,role) VALUES(?,?,?,?,?)").run("مدير النظام",`${phone}@local.invalid`,phone,bcrypt.hashSync(password,12),"SUPER_ADMIN"); }
const adminId=db.prepare("SELECT id FROM users LIMIT 1").get().id;
if (process.env.LOAD_DEMO_DATA==="true" && !db.prepare("SELECT COUNT(*) n FROM documents").get().n) {
  const rows=[["GRN-2026-000128","إذن إضافة","الشركة المصرية للتوريدات","المخزن الرئيسي","2026-06-27",184250,"بانتظار الجودة"],["SIV-2026-000094","إذن صرف","إدارة الصيانة","المخزن الرئيسي","2026-06-27",42800,"بانتظار الاعتماد"],["TRF-2026-000031","تحويل مخزني","فرع الإسكندرية","مخزن قطع الغيار","2026-06-26",67900,"في الطريق"],["GRN-2026-000127","إذن إضافة","النور للأدوات الصحية","المخزن الرئيسي","2026-06-26",125430,"مرحل"],["ADJ-2026-000012","تسوية جرد","لجنة الجرد الدوري","مخزن الأدوات","2026-06-25",18750,"معتمد"]];
  const q=db.prepare("INSERT INTO documents(document_no,type,party,warehouse,document_date,value,status,created_by) VALUES(?,?,?,?,?,?,?,?)"); rows.forEach(r=>q.run(...r,adminId));
}
if (process.env.LOAD_DEMO_DATA==="true" && !db.prepare("SELECT COUNT(*) n FROM stock").get().n) {
  const rows=[["ITM-00041","خلاط حوض كروم","خلاطات","المخزن الرئيسي",284,38,120,1450,"متاح"],["ITM-00087","ماسورة PPR مقاس 25 مم","مواسير","المخزن الرئيسي",96,32,150,185,"منخفض"],["ITM-00113","محبس دفن 3/4 بوصة","محابس","مخزن قطع الغيار",420,80,180,620,"متاح"],["ITM-00156","طقم صرف حوض كامل","إكسسوارات","المخزن الرئيسي",48,24,90,310,"حرج"],["ITM-00201","سخان مياه كهربائي 50 لتر","أجهزة","مخزن الأجهزة",73,12,30,6850,"متاح"],["ITM-00229","سيليكون صحي شفاف","مواد مساعدة","مخزن الكيماويات",145,10,100,125,"قرب انتهاء"]];
  const q=db.prepare("INSERT INTO stock(item_code,name,category,warehouse,qty_on_hand,qty_reserved,min_level,unit_cost,state) VALUES(?,?,?,?,?,?,?,?,?)"); rows.forEach(r=>q.run(...r));
}
const audit=(uid,action,type,id,details={})=>db.prepare("INSERT INTO audit_log(user_id,action,entity_type,entity_id,details) VALUES(?,?,?,?,?)").run(uid,action,type,String(id||""),JSON.stringify(details));
const auth=(req,res,next)=>{try{req.user=jwt.verify((req.headers.authorization||"").replace("Bearer ",""),secret);next()}catch{res.status(401).json({error:"غير مصرح. سجل الدخول أولًا"})}};
const roles=(...ok)=>(req,res,next)=>(req.user.role==="SUPER_ADMIN"||ok.includes(req.user.role))?next():res.status(403).json({error:"ليس لديك صلاحية لهذا الإجراء"});
const rolePermissions={
  SUPER_ADMIN:["إدارة المستخدمين","إدارة الصلاحيات","كل المخازن","إنشاء المستندات","الاعتماد","التقارير","سجل التدقيق"],
  WAREHOUSE_MANAGER:["كل المخازن","إنشاء المستندات","الاعتماد","التقارير","سجل التدقيق"],
  STORE_KEEPER:["إنشاء المستندات","الاستلام","الصرف","عرض المخزون"],
  QC_INSPECTOR:["فحص الجودة","الحجر الصحي","عرض المستندات"],
  FINANCE:["مراجعة التكاليف","اعتماد التسويات","التقارير المالية"],
  REQUESTER:["طلبات الصرف","متابعة الطلبات"],
  PROCUREMENT:["الموردون","أوامر الشراء","المرتجعات"],
  AUDITOR:["قراءة فقط","سجل التدقيق","التقارير"]
};
const app=express();
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(helmet({crossOriginResourcePolicy:{policy:"same-site"}}));
app.use(cors({origin:process.env.APP_ORIGIN||"http://127.0.0.1:5173",methods:["GET","POST","PATCH"]}));
app.use(express.json({limit:"200kb"}));
app.use("/api/auth",rateLimit({windowMs:15*60*1000,limit:10,standardHeaders:true,legacyHeaders:false}));
app.use("/api",rateLimit({windowMs:60*1000,limit:180,standardHeaders:true,legacyHeaders:false}));
app.use("/uploads",express.static(uploadDir,{dotfiles:"deny",maxAge:"1h"}));
const allowedTypes=new Set(["application/pdf","image/jpeg","image/png","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]);
const upload=multer({dest:uploadDir,limits:{fileSize:10*1024*1024,files:1},fileFilter:(_req,file,cb)=>allowedTypes.has(file.mimetype)?cb(null,true):cb(new Error("نوع الملف غير مسموح"))});

app.get("/api/health",(_q,res)=>res.json({ok:true,database:"connected"}));
app.post("/api/auth/login",(req,res)=>{const identifier=req.body.identifier||req.body.phone||req.body.email||"";const u=db.prepare("SELECT * FROM users WHERE (email=? OR phone=?) AND active=1").get(identifier,identifier);if(!u||!bcrypt.compareSync(req.body.password||"",u.password_hash))return res.status(401).json({error:"بيانات الدخول غير صحيحة"});const user={id:u.id,name:u.name,email:u.email,phone:u.phone,role:u.role};audit(u.id,"LOGIN","User",u.id);res.json({token:jwt.sign(user,secret,{expiresIn:"8h"}),user})});
app.get("/api/me",auth,(req,res)=>res.json(req.user));
app.get("/api/documents",auth,(_q,res)=>res.json(db.prepare("SELECT id,document_no no,type,party,warehouse,document_date date,value,status FROM documents ORDER BY id DESC").all()));
app.post("/api/documents",auth,roles("WAREHOUSE_MANAGER","STORE_KEEPER"),(req,res)=>{const n=db.prepare("SELECT COUNT(*) n FROM documents WHERE type=?").get(req.body.type||"إذن إضافة").n+129;const prefix=(req.body.type||"").includes("صرف")?"SIV":"GRN",no=`${prefix}-2026-${String(n).padStart(6,"0")}`;const x=db.prepare("INSERT INTO documents(document_no,type,party,warehouse,document_date,value,status,created_by) VALUES(?,?,?,?,?,?,?,?)").run(no,req.body.type||"إذن إضافة",req.body.party||"غير محدد",req.body.warehouse||"المخزن الرئيسي",req.body.date||new Date().toISOString().slice(0,10),Number(req.body.value||0),"مسودة",req.user.id);audit(req.user.id,"CREATE","Document",x.lastInsertRowid,{no});res.status(201).json(db.prepare("SELECT id,document_no no,type,party,warehouse,document_date date,value,status FROM documents WHERE id=?").get(x.lastInsertRowid))});
app.patch("/api/documents/:id/decision",auth,roles("WAREHOUSE_MANAGER"),(req,res)=>{const d=db.prepare("SELECT * FROM documents WHERE id=?").get(req.params.id);if(!d)return res.status(404).json({error:"المستند غير موجود"});if(!["معتمد","مرفوض"].includes(req.body.status))return res.status(400).json({error:"قرار غير صالح"});if(req.body.status==="معتمد"&&String(d.document_no||"").startsWith("GRN")){const qc=db.prepare("SELECT result FROM qc_requests WHERE document_id=? ORDER BY id DESC LIMIT 1").get(d.id);if(!qc||qc.result!=="مقبول")return res.status(409).json({error:"لا يمكن اعتماد إذن الإضافة قبل قبول فحص الجودة"})}db.prepare("UPDATE documents SET status=? WHERE id=?").run(req.body.status,d.id);audit(req.user.id,req.body.status==="معتمد"?"APPROVE":"REJECT","Document",d.id,{no:d.document_no});res.json({ok:true,status:req.body.status})});
app.get("/api/stock",auth,(_q,res)=>res.json(db.prepare("SELECT item_code code,name,category,warehouse,qty_on_hand onHand,qty_reserved reserved,min_level min,unit_cost cost,state FROM stock ORDER BY item_code").all()));
app.get("/api/qc",auth,(_q,res)=>res.json(db.prepare("SELECT q.id,q.document_id documentId,d.document_no documentNo,q.item_code itemCode,q.item_name itemName,q.warehouse,q.qty,q.result,q.inspector,q.notes,q.created_at createdAt,q.inspected_at inspectedAt FROM qc_requests q LEFT JOIN documents d ON d.id=q.document_id ORDER BY q.id DESC").all()));
app.post("/api/qc",auth,roles("WAREHOUSE_MANAGER","STORE_KEEPER","QC_INSPECTOR"),(req,res)=>{const itemName=String(req.body.itemName||"").trim(),warehouse=String(req.body.warehouse||"المخزن الرئيسي").trim(),qty=Number(req.body.qty||0);if(!itemName||qty<=0)return res.status(400).json({error:"الصنف والكمية مطلوبان لفحص الجودة"});const n=db.prepare("SELECT COUNT(*) n FROM documents WHERE document_no LIKE 'GRN-%'").get().n+1,no=`GRN-${new Date().getFullYear()}-${String(n).padStart(6,"0")}`;const doc=db.prepare("INSERT INTO documents(document_no,type,party,warehouse,document_date,value,status,created_by) VALUES(?,?,?,?,?,?,?,?)").run(no,"إذن إضافة","فحص جودة قبل الإضافة",warehouse,new Date().toISOString().slice(0,10),Number(req.body.value||0),"بانتظار الجودة",req.user.id);const x=db.prepare("INSERT INTO qc_requests(document_id,item_code,item_name,warehouse,qty,result,notes,created_by) VALUES(?,?,?,?,?,?,?,?)").run(doc.lastInsertRowid,req.body.itemCode||"",itemName,warehouse,qty,"بانتظار الفحص",req.body.notes||"",req.user.id);audit(req.user.id,"CREATE","QC",x.lastInsertRowid,{documentNo:no,itemName,warehouse,qty});res.status(201).json(db.prepare("SELECT q.id,q.document_id documentId,d.document_no documentNo,q.item_code itemCode,q.item_name itemName,q.warehouse,q.qty,q.result,q.inspector,q.notes,q.created_at createdAt,q.inspected_at inspectedAt FROM qc_requests q LEFT JOIN documents d ON d.id=q.document_id WHERE q.id=?").get(x.lastInsertRowid))});
app.patch("/api/qc/:id",auth,roles("WAREHOUSE_MANAGER","QC_INSPECTOR"),(req,res)=>{const q=db.prepare("SELECT * FROM qc_requests WHERE id=?").get(req.params.id);if(!q)return res.status(404).json({error:"طلب الفحص غير موجود"});const resultMap={ACCEPTED:"مقبول",REJECTED:"مرفوض",QUARANTINE:"حجر صحي","مقبول":"مقبول","مرفوض":"مرفوض","حجر صحي":"حجر صحي"};const result=resultMap[req.body.result];if(!result)return res.status(400).json({error:"نتيجة الفحص غير صالحة"});db.prepare("UPDATE qc_requests SET result=?,inspector=?,notes=?,inspected_at=CURRENT_TIMESTAMP WHERE id=?").run(result,req.user.name||req.user.phone||"QC",req.body.notes||q.notes||"",q.id);const docStatus=result==="مقبول"?"بانتظار الاعتماد":result==="حجر صحي"?"حجر صحي":"مرفوض جودة";db.prepare("UPDATE documents SET status=? WHERE id=?").run(docStatus,q.document_id);audit(req.user.id,"QC_DECISION","QC",q.id,{result,documentId:q.document_id});res.json({ok:true,result,documentStatus:docStatus})});
app.get("/api/transfers",auth,(_q,res)=>res.json(db.prepare("SELECT id,transfer_no transferNo,from_warehouse fromWarehouse,to_warehouse toWarehouse,item_code itemCode,item_name itemName,qty,status,reason,created_at createdAt,received_at receivedAt FROM transfers ORDER BY id DESC").all()));
app.post("/api/transfers",auth,roles("WAREHOUSE_MANAGER","STORE_KEEPER"),(req,res)=>{const fromWarehouse=String(req.body.fromWarehouse||"").trim(),toWarehouse=String(req.body.toWarehouse||"").trim(),itemName=String(req.body.itemName||"").trim(),qty=Number(req.body.qty||0);if(!fromWarehouse||!toWarehouse||!itemName||qty<=0)return res.status(400).json({error:"المخزن المصدر والمخزن المستلم والصنف والكمية مطلوبة"});if(fromWarehouse===toWarehouse)return res.status(400).json({error:"لا يمكن التحويل لنفس المخزن"});const n=db.prepare("SELECT COUNT(*) n FROM transfers").get().n+1,no=`TRF-${new Date().getFullYear()}-${String(n).padStart(6,"0")}`;const x=db.prepare("INSERT INTO transfers(transfer_no,from_warehouse,to_warehouse,item_code,item_name,qty,status,reason,created_by) VALUES(?,?,?,?,?,?,?,?,?)").run(no,fromWarehouse,toWarehouse,req.body.itemCode||"",itemName,qty,"بانتظار الصرف",req.body.reason||"",req.user.id);const doc=db.prepare("INSERT INTO documents(document_no,type,party,warehouse,document_date,value,status,created_by) VALUES(?,?,?,?,?,?,?,?)").run(no,"تحويل مخزني",toWarehouse,`${fromWarehouse} ← ${toWarehouse}`,new Date().toISOString().slice(0,10),0,"بانتظار الصرف",req.user.id);audit(req.user.id,"CREATE","Transfer",x.lastInsertRowid,{transferNo:no,fromWarehouse,toWarehouse,itemName,qty,documentId:doc.lastInsertRowid});res.status(201).json(db.prepare("SELECT id,transfer_no transferNo,from_warehouse fromWarehouse,to_warehouse toWarehouse,item_code itemCode,item_name itemName,qty,status,reason,created_at createdAt,received_at receivedAt FROM transfers WHERE id=?").get(x.lastInsertRowid))});
app.patch("/api/transfers/:id/status",auth,roles("WAREHOUSE_MANAGER","STORE_KEEPER"),(req,res)=>{const t=db.prepare("SELECT * FROM transfers WHERE id=?").get(req.params.id);if(!t)return res.status(404).json({error:"التحويل غير موجود"});const statusMap={PENDING:"بانتظار الصرف",IN_TRANSIT:"في الطريق",RECEIVED:"تم الاستلام",CLOSED:"مغلق",CANCELLED:"ملغي","بانتظار الصرف":"بانتظار الصرف","في الطريق":"في الطريق","تم الاستلام":"تم الاستلام","مغلق":"مغلق","ملغي":"ملغي"};const status=statusMap[req.body.status];if(!status)return res.status(400).json({error:"حالة التحويل غير صالحة"});db.prepare("UPDATE transfers SET status=?,received_at=CASE WHEN ?='تم الاستلام' THEN CURRENT_TIMESTAMP ELSE received_at END WHERE id=?").run(status,status,t.id);db.prepare("UPDATE documents SET status=? WHERE document_no=?").run(status,t.transfer_no);audit(req.user.id,"TRANSFER_STATUS","Transfer",t.id,{status,transferNo:t.transfer_no});res.json({ok:true,status})});
app.get("/api/audit",auth,roles("WAREHOUSE_MANAGER","AUDITOR"),(_q,res)=>res.json(db.prepare("SELECT * FROM audit_log ORDER BY id DESC LIMIT 100").all()));
app.get("/api/roles",auth,(req,res)=>res.json(Object.entries(rolePermissions).map(([code,permissions])=>({code,permissions}))));
app.get("/api/users",auth,roles("SUPER_ADMIN"),(_q,res)=>res.json(db.prepare("SELECT id,name,email,phone,role,active FROM users ORDER BY id").all().map(u=>({...u,active:Boolean(u.active)}))));
app.post("/api/users",auth,roles("SUPER_ADMIN"),(req,res)=>{const {name,email,phone,password,role}=req.body;if(!name||!phone||!password||!role)return res.status(400).json({error:"الاسم والهاتف وكلمة المرور والدور مطلوبة"});if(!rolePermissions[role])return res.status(400).json({error:"الدور غير صالح"});try{const x=db.prepare("INSERT INTO users(name,email,phone,password_hash,role,active) VALUES(?,?,?,?,?,1)").run(name,email||`${phone}@wareflow.local`,phone,bcrypt.hashSync(password,10),role);audit(req.user.id,"CREATE","User",x.lastInsertRowid,{role,phone});res.status(201).json({id:Number(x.lastInsertRowid),name,email:email||`${phone}@wareflow.local`,phone,role,active:true})}catch(e){res.status(409).json({error:e.message.includes("UNIQUE")?"الهاتف أو البريد مستخدم بالفعل":"تعذر إنشاء المستخدم"})}});
app.patch("/api/users/:id",auth,roles("SUPER_ADMIN"),(req,res)=>{const u=db.prepare("SELECT * FROM users WHERE id=?").get(req.params.id);if(!u)return res.status(404).json({error:"المستخدم غير موجود"});if(Number(req.params.id)===req.user.id&&req.body.active===false)return res.status(400).json({error:"لا يمكنك إيقاف حسابك الحالي"});const role=req.body.role||u.role;if(!rolePermissions[role])return res.status(400).json({error:"الدور غير صالح"});db.prepare("UPDATE users SET name=?,role=?,active=? WHERE id=?").run(req.body.name||u.name,role,req.body.active===undefined?u.active:Number(Boolean(req.body.active)),u.id);audit(req.user.id,"UPDATE","User",u.id,{role,active:req.body.active});res.json({ok:true})});
app.post("/api/documents/:id/attachments",auth,upload.single("file"),(req,res)=>{if(!req.file)return res.status(400).json({error:"اختر ملفًا"});const url=`/uploads/${req.file.filename}`;const x=db.prepare("INSERT INTO attachments(document_id,file_name,file_url,mime_type,uploaded_by) VALUES(?,?,?,?,?)").run(req.params.id,req.file.originalname,url,req.file.mimetype,req.user.id);audit(req.user.id,"UPLOAD","Attachment",x.lastInsertRowid,{documentId:req.params.id});res.status(201).json({id:Number(x.lastInsertRowid),fileName:req.file.originalname,url})});
app.get("/api/documents/:id/pdf",auth,(req,res)=>{const d=db.prepare("SELECT * FROM documents WHERE id=?").get(req.params.id);if(!d)return res.status(404).end();audit(req.user.id,"PRINT","Document",d.id);res.type("pdf");res.setHeader("Content-Disposition",`inline; filename=${d.document_no}.pdf`);const p=new PDFDocument({size:"A4",margin:48});p.pipe(res);p.fontSize(20).text("WareFlow - Official Warehouse Record",{align:"center"});p.moveDown().fontSize(12).text(`Document No: ${d.document_no}`).text(`Type: ${d.type}`).text(`Party: ${d.party}`).text(`Warehouse: ${d.warehouse}`).text(`Date: ${d.document_date}`).text(`Value: ${d.value}`).text(`Status: ${d.status}`);p.moveDown(5).fontSize(9).text("Official Warehouse Record - Keep in File - Rev 1.0",{align:"center"});p.end()});
// Serve the Vite production build from the same origin as the API.
const distPath = path.join(root, "dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath,{index:false,maxAge:"1h"}));
  app.use((req, res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/api") && !req.path.startsWith("/uploads")) {
      return res.sendFile(path.join(distPath, "index.html"));
    }
    next();
  });
}

app.use((err,_q,res,_n)=>res.status(500).json({error:err.message||"خطأ داخلي"}));

const port = Number(process.env.PORT || process.env.API_PORT || 3001);
const host = process.env.HOST || "0.0.0.0";
app.listen(port, host, () => console.log(`WareFlow API ready on http://${host}:${port}`));
