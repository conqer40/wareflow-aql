import { useEffect, useMemo, useState } from "react";
import {
  Archive, ArrowsLeftRight, Bell, Buildings, CaretDown, ChartBar,
  CheckCircle, ClipboardText, Clock, Cube, FileText, Gauge, Gear,
  List, MagnifyingGlass, Package, Plus, Printer, SealCheck, ShieldCheck,
  SignOut, Sparkle, SquaresFour, Storefront, Truck, Users, Warning,
  X, ArrowRight, DownloadSimple, Funnel, DotsThree, Check, Eye,
} from "@phosphor-icons/react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const money = new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 0 });
const navGroups = [
  { title: "الرئيسية", items: [{ id: "dashboard", label: "مركز القيادة", icon: Gauge }] },
  { title: "البيانات الأساسية", items: [
    { id: "items", label: "الأصناف", icon: Package }, { id: "warehouses", label: "المخازن والمواقع", icon: Buildings },
    { id: "suppliers", label: "الموردون", icon: Truck }, { id: "users", label: "المستخدمون والصلاحيات", icon: Users },
  ]},
  { title: "الدورة المستندية", items: [
    { id: "receipts", label: "أذون الإضافة", icon: Archive }, { id: "qc", label: "فحص الجودة", icon: SealCheck },
    { id: "issues", label: "أذون الصرف", icon: ClipboardText }, { id: "transfers", label: "التحويلات", icon: ArrowsLeftRight },
    { id: "counts", label: "الجرد والتسويات", icon: List }, { id: "waste", label: "الهدر والتكهين", icon: Warning },
  ]},
  { title: "الرقابة", items: [
    { id: "balances", label: "أرصدة المخزون", icon: Cube }, { id: "ledger", label: "سجل الحركات", icon: FileText },
    { id: "approvals", label: "الاعتمادات", icon: ShieldCheck, badge: 12 }, { id: "reports", label: "التقارير", icon: ChartBar },
  ]},
];

const docs = [
  { no: "GRN-2026-000128", type: "إذن إضافة", party: "الشركة المصرية للتوريدات", warehouse: "المخزن الرئيسي", date: "27 يونيو 2026", value: 184250, status: "بانتظار الجودة" },
  { no: "SIV-2026-000094", type: "إذن صرف", party: "إدارة الصيانة", warehouse: "المخزن الرئيسي", date: "27 يونيو 2026", value: 42800, status: "بانتظار الاعتماد" },
  { no: "TRF-2026-000031", type: "تحويل مخزني", party: "فرع الإسكندرية", warehouse: "مخزن قطع الغيار", date: "26 يونيو 2026", value: 67900, status: "في الطريق" },
  { no: "GRN-2026-000127", type: "إذن إضافة", party: "النور للأدوات الصحية", warehouse: "المخزن الرئيسي", date: "26 يونيو 2026", value: 125430, status: "مرحل" },
  { no: "ADJ-2026-000012", type: "تسوية جرد", party: "لجنة الجرد الدوري", warehouse: "مخزن الأدوات", date: "25 يونيو 2026", value: 18750, status: "معتمد" },
];
const stock = [
  { code:"ITM-00041", name:"خلاط حوض كروم", category:"خلاطات", warehouse:"المخزن الرئيسي", onHand:284, reserved:38, min:120, cost:1450, state:"متاح" },
  { code:"ITM-00087", name:"ماسورة PPR مقاس 25 مم", category:"مواسير", warehouse:"المخزن الرئيسي", onHand:96, reserved:32, min:150, cost:185, state:"منخفض" },
  { code:"ITM-00113", name:"محبس دفن 3/4 بوصة", category:"محابس", warehouse:"مخزن قطع الغيار", onHand:420, reserved:80, min:180, cost:620, state:"متاح" },
  { code:"ITM-00156", name:"طقم صرف حوض كامل", category:"إكسسوارات", warehouse:"المخزن الرئيسي", onHand:48, reserved:24, min:90, cost:310, state:"حرج" },
  { code:"ITM-00201", name:"سخان مياه كهربائي 50 لتر", category:"أجهزة", warehouse:"مخزن الأجهزة", onHand:73, reserved:12, min:30, cost:6850, state:"متاح" },
  { code:"ITM-00229", name:"سيليكون صحي شفاف", category:"مواد مساعدة", warehouse:"مخزن الكيماويات", onHand:145, reserved:10, min:100, cost:125, state:"قرب انتهاء" },
];
const trend = [
  {m:"يناير",in:620,out:510},{m:"فبراير",in:780,out:640},{m:"مارس",in:710,out:680},{m:"أبريل",in:920,out:740},{m:"مايو",in:860,out:790},{m:"يونيو",in:1040,out:830},
];
const warehouseMix = [{name:"الرئيسي",value:58,color:"#0b315c"},{name:"قطع الغيار",value:21,color:"#f47b20"},{name:"الأجهزة",value:13,color:"#16956f"},{name:"الحجر",value:8,color:"#e04f5f"}];
const statuses = { "مرحل":"green", "معتمد":"green", "بانتظار الجودة":"amber", "بانتظار الاعتماد":"amber", "في الطريق":"blue", "منخفض":"amber", "حرج":"red", "متاح":"green", "قرب انتهاء":"red", "بانتظار الفحص":"amber", "مقبول":"green", "مرفوض":"red", "مرفوض جودة":"red", "حجر صحي":"red", "بانتظار الصرف":"amber", "تم الاستلام":"green", "مغلق":"green", "ملغي":"red", "مسودة":"gray" };

function downloadCsv(name, rows) {
  const csv = "\uFEFF" + rows.map(r => r.map(v => `"${String(v ?? "").replaceAll('"','""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = `${name}.csv`; a.click(); URL.revokeObjectURL(url);
}

async function api(path, options={}) {
  if (location.hostname.endsWith("github.io") || import.meta.env.VITE_STATIC_API === "true") return localApi(path, options);
  const token=localStorage.getItem("wareflow_token");
  const res=await fetch(`/api${path}`,{...options,headers:{"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{ }),...(options.headers||{})}});
  const body=await res.json().catch(()=>({})); if(!res.ok)throw new Error(body.error||"تعذر الاتصال بالخادم"); return body;
}

function Login({onLogin}) { const [identifier,setIdentifier]=useState("01023299755"),[password,setPassword]=useState("01023299755"),[error,setError]=useState(""),[loading,setLoading]=useState(false); const submit=async e=>{e.preventDefault();setLoading(true);setError("");try{const x=await api("/auth/login",{method:"POST",body:JSON.stringify({identifier,password})});localStorage.setItem("wareflow_token",x.token);onLogin(x.user)}catch(e){setError(e.message)}finally{setLoading(false)}}; return <main className="login-shell" dir="rtl"><section className="login-panel"><div className="login-brand"><Storefront weight="duotone"/><div><b>WareFlow</b><small>إدارة المخازن والدورة المستندية</small></div></div><div className="login-copy"><span>نظام رقابي متكامل</span><h1>مرحبًا بعودتك</h1><p>سجّل الدخول للوصول إلى المخزون والمستندات والاعتمادات.</p></div><form onSubmit={submit}><label>رقم الهاتف أو البريد الإلكتروني<input type="text" inputMode="tel" value={identifier} onChange={e=>setIdentifier(e.target.value)} required/></label><label>كلمة المرور<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></label>{error&&<div className="form-error" role="alert">{error}</div>}<button className="primary" disabled={loading}>{loading?"جارٍ تسجيل الدخول...":"تسجيل الدخول"}</button></form><small className="login-hint">حساب المدير مُعبأ مسبقًا للاختبار المحلي.</small></section><section className="login-visual"><ShieldCheck/><h2>لا حركة مخزون بدون مستند</h2><p>صلاحيات، اعتماد، سجل تدقيق، ومستندات رسمية في مكان واحد.</p></section></main> }

function Badge({ children }) { return <span className={`badge ${statuses[children] || "gray"}`}>{children}</span>; }
function Metric({ label, value, sub, tone, icon: Icon }) { return <div className="metric"><div className={`metric-icon ${tone}`}><Icon size={22}/></div><div><span>{label}</span><strong>{value}</strong><small>{sub}</small></div></div>; }

function Dashboard({ onNavigate }) {
  return <>
    <div className="page-head"><div><p>السبت، 27 يونيو 2026</p><h1>مركز القيادة التنفيذي</h1><span>نظرة شاملة على أداء المخزون والدورة المستندية</span></div><button className="primary" onClick={()=>onNavigate("receipts")}><Plus/> إنشاء مستند</button></div>
    <section className="metrics">
      <Metric label="إجمالي قيمة المخزون" value="12,450,230 ج.م" sub="↑ 6.2% عن الشهر الماضي" tone="green" icon={Cube}/>
      <Metric label="دقة سجلات المخزون" value="98.4%" sub="الهدف التشغيلي 99%" tone="blue" icon={SealCheck}/>
      <Metric label="اعتمادات معلقة" value="12" sub="3 تجاوزت زمن الخدمة" tone="orange" icon={Clock}/>
      <Metric label="أصناف تحت الحد" value="18" sub="5 أصناف حرجة" tone="red" icon={Warning}/>
    </section>
    <div className="grid-main">
      <section className="panel chart-panel"><div className="panel-head"><div><h2>حركة المخزون</h2><p>الوارد مقابل المنصرف — آخر 6 أشهر</p></div><button className="ghost">آخر 6 أشهر <CaretDown/></button></div><ResponsiveContainer width="100%" height={280}><AreaChart data={trend}><defs><linearGradient id="a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f47b20" stopOpacity={0.3}/><stop offset="1" stopColor="#f47b20" stopOpacity={0.02}/></linearGradient></defs><CartesianGrid stroke="#edf1f5" vertical={false}/><XAxis dataKey="m" axisLine={false} tickLine={false}/><YAxis axisLine={false} tickLine={false}/><Tooltip/><Legend/><Area name="الوارد" type="monotone" dataKey="in" stroke="#f47b20" fill="url(#a)" strokeWidth={3}/><Area name="المنصرف" type="monotone" dataKey="out" stroke="#0b315c" fill="transparent" strokeWidth={2}/></AreaChart></ResponsiveContainer></section>
      <section className="panel"><div className="panel-head"><div><h2>قيمة المخزون</h2><p>التوزيع حسب المخزن</p></div><DotsThree size={24}/></div><div className="donut"><PieChart width={300} height={190}><Pie data={warehouseMix} dataKey="value" cx={150} cy={95} innerRadius={55} outerRadius={78} paddingAngle={3}>{warehouseMix.map((x,i)=><Cell key={i} fill={x.color}/>)}</Pie><Tooltip/></PieChart><strong>12.4<small>مليون ج.م</small></strong></div><div className="legend">{warehouseMix.map(x=><div key={x.name}><i style={{background:x.color}}/>{x.name}<b>{x.value}%</b></div>)}</div></section>
    </div>
    <div className="grid-bottom">
      <section className="panel"><div className="panel-head"><div><h2>أحدث المستندات</h2><p>آخر الأنشطة عبر جميع المخازن</p></div><button className="text-btn" onClick={()=>onNavigate("receipts")}>عرض الكل <ArrowRight/></button></div><DocTable rows={docs.slice(0,4)}/></section>
      <section className="panel alert-panel"><div className="panel-head"><div><h2>تحتاج انتباهك</h2><p>تنبيهات ذات أولوية عالية</p></div><span className="count">7</span></div>
        <div className="alert"><span className="alert-icon red"><Warning/></span><div><b>5 أصناف بمخزون حرج</b><small>قد تنفد خلال 7 أيام</small></div><ArrowRight/></div>
        <div className="alert"><span className="alert-icon orange"><SealCheck/></span><div><b>3 طلبات فحص متأخرة</b><small>تجاوزت SLA المحدد</small></div><ArrowRight/></div>
        <div className="alert"><span className="alert-icon blue"><Truck/></span><div><b>تحويل متأخر في الطريق</b><small>TRF-2026-000031</small></div><ArrowRight/></div>
        <button className="wide-ghost">عرض كل التنبيهات</button>
      </section>
    </div>
  </>;
}

function DocTable({ rows=docs, compact=false }) { return <div className="table-wrap"><table><thead><tr><th>رقم المستند</th><th>النوع</th><th>الجهة / المخزن</th><th>التاريخ</th><th>القيمة</th><th>الحالة</th><th></th></tr></thead><tbody>{rows.map(r=><tr key={r.no}><td><b className="link">{r.no}</b></td><td>{r.type}</td><td><b>{r.party}</b><small>{r.warehouse}</small></td><td>{r.date}</td><td>{money.format(r.value)} ج.م</td><td><Badge>{r.status}</Badge></td><td><button className="icon-btn"><DotsThree/></button></td></tr>)}</tbody></table></div>; }

function DocumentsPage({ kind, onCreate, documents, onToast }) {
  const configs={receipts:["أذون الإضافة والاستلام","إدارة الوارد من الموردين والمرتجعات والتحويلات","إذن إضافة جديد"],issues:["أذون الصرف","طلبات وصرف الأصناف للإدارات ومراكز التكلفة","إذن صرف جديد"],transfers:["التحويلات بين المخازن","متابعة التحويلات من المصدر حتى الاستلام","تحويل جديد"],qc:["فحص الجودة","طلبات الفحص والقبول والحجر الصحي","طلب فحص جديد"],counts:["الجرد والتسويات","الجرد الدوري والمفاجئ وتسوية الفروقات","جلسة جرد جديدة"],waste:["الهدر والتكهين","توثيق التالف والفاقد وقرارات لجان التكهين","محضر جديد"]};
  const c=configs[kind]||configs.receipts;
  const [query,setQuery]=useState(""), [filter,setFilter]=useState("الكل");
  const rows=documents.filter(d=>(filter==="الكل"||d.status===filter)&&Object.values(d).join(" ").toLowerCase().includes(query.toLowerCase()));
  const exportRows=()=>{downloadCsv(kind,[["رقم المستند","النوع","الجهة","المخزن","التاريخ","القيمة","الحالة"],...rows.map(d=>[d.no,d.type,d.party,d.warehouse,d.date,d.value,d.status])]);onToast("تم تجهيز ملف التصدير")};
  return <><PageTitle title={c[0]} subtitle={c[1]} action={c[2]} onAction={onCreate}/><Toolbar query={query} setQuery={setQuery} onExport={exportRows} onFilter={()=>setFilter(filter==="الكل"?"بانتظار الاعتماد":"الكل")}/><section className="panel"><div className="tabs">{["الكل","مسودة","بانتظار الاعتماد","مرحل"].map(x=><button key={x} className={filter===x?"active":""} onClick={()=>setFilter(x)}>{x} <span>{x==="الكل"?documents.length:documents.filter(d=>d.status===x).length}</span></button>)}</div>{rows.length?<DocTable rows={rows}/>:<div className="empty-state"><MagnifyingGlass/><h3>لا توجد نتائج</h3><p>غيّر كلمات البحث أو ألغِ التصفية الحالية.</p></div>}</section></>;
}

function QCPage({onToast,onDocumentsChanged}) {
  const [rows,setRows]=useState([]),[query,setQuery]=useState(""),[open,setOpen]=useState(false),[busy,setBusy]=useState(true),[form,setForm]=useState({itemCode:"",itemName:"",warehouse:"المخزن الرئيسي",qty:1,notes:""});
  const load=async()=>{setBusy(true);try{setRows(await api("/qc"))}catch(e){onToast(e.message)}finally{setBusy(false)}};
  useEffect(()=>{load()},[]);
  const filtered=rows.filter(r=>Object.values(r).join(" ").toLowerCase().includes(query.toLowerCase()));
  const create=async e=>{e.preventDefault();try{const q=await api("/qc",{method:"POST",body:JSON.stringify(form)});setRows([q,...rows]);setOpen(false);setForm({itemCode:"",itemName:"",warehouse:"المخزن الرئيسي",qty:1,notes:""});onToast("تم إنشاء طلب فحص جودة ولن يتم ترحيل الإضافة قبل القبول");onDocumentsChanged?.()}catch(err){onToast(err.message)}};
  const decide=async(row,result)=>{try{await api(`/qc/${row.id}`,{method:"PATCH",body:JSON.stringify({result,notes:row.notes})});setRows(rows.map(x=>x.id===row.id?{...x,result,inspectedAt:new Date().toISOString()}:x));onToast(result==="مقبول"?"تم قبول الجودة ونقل إذن الإضافة إلى انتظار الاعتماد":"تم تسجيل نتيجة الجودة وتحديث حالة الإضافة");onDocumentsChanged?.()}catch(e){onToast(e.message)}};
  return <><PageTitle title="فحص الجودة قبل الإضافة" subtitle="أي إذن إضافة يظل بانتظار الجودة ولا يتم اعتماده أو ترحيله للمخزون إلا بعد نتيجة فحص مقبولة" action={open?"إغلاق النموذج":"طلب فحص جديد"} onAction={()=>setOpen(!open)} icon={SealCheck}/>
    <section className="workflow-note"><SealCheck/><div><b>قاعدة التشغيل مفعّلة</b><span>اعتماد إذن الإضافة GRN مقفول تلقائيًا حتى توجد نتيجة جودة: مقبول.</span></div></section>
    {open&&<section className="panel inline-form"><form className="form-grid" onSubmit={create}><label>كود الصنف<input value={form.itemCode} onChange={e=>setForm({...form,itemCode:e.target.value})} placeholder="اختياري"/></label><label>اسم الصنف<input value={form.itemName} onChange={e=>setForm({...form,itemName:e.target.value})} required/></label><label>المخزن المراد الإضافة إليه<select value={form.warehouse} onChange={e=>setForm({...form,warehouse:e.target.value})}><option>المخزن الرئيسي</option><option>مخزن قطع الغيار</option><option>مخزن الأجهزة</option><option>مخزن الحجر الصحي</option></select></label><label>الكمية<input type="number" min="1" value={form.qty} onChange={e=>setForm({...form,qty:e.target.value})} required/></label><label className="full">ملاحظات الفحص<textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="مثال: فحص ظاهري، مطابقة مواصفات، عينة تشغيل"/></label><div className="form-actions full"><button className="primary"><Plus/> إنشاء طلب الفحص</button></div></form></section>}
    <Toolbar query={query} setQuery={setQuery} onExport={()=>downloadCsv("qc-requests",[["رقم الإضافة","الصنف","المخزن","الكمية","النتيجة"],...filtered.map(r=>[r.documentNo,r.itemName,r.warehouse,r.qty,r.result])])} onFilter={()=>setQuery("")}/>
    <section className="panel"><div className="table-wrap"><table><thead><tr><th>رقم إذن الإضافة</th><th>الصنف</th><th>المخزن</th><th>الكمية</th><th>النتيجة</th><th>المفتش</th><th>إجراء</th></tr></thead><tbody>{busy?<tr><td colSpan="7">جاري تحميل طلبات الجودة...</td></tr>:filtered.length?filtered.map(r=><tr key={r.id}><td><b className="link">{r.documentNo}</b></td><td><b>{r.itemName}</b><small>{r.itemCode||"بدون كود"}</small></td><td>{r.warehouse}</td><td>{r.qty}</td><td><Badge>{r.result}</Badge></td><td>{r.inspector||"—"}</td><td><div className="row-actions"><button className="secondary" onClick={()=>decide(r,"ACCEPTED")}>قبول</button><button className="ghost" onClick={()=>decide(r,"QUARANTINE")}>حجر</button><button className="danger" onClick={()=>decide(r,"REJECTED")}>رفض</button></div></td></tr>):<tr><td colSpan="7"><div className="empty-state">لا توجد طلبات فحص حتى الآن</div></td></tr>}</tbody></table></div></section></>;
}

function TransferPage({onToast,onDocumentsChanged}) {
  const [rows,setRows]=useState([]),[query,setQuery]=useState(""),[open,setOpen]=useState(false),[busy,setBusy]=useState(true),[form,setForm]=useState({fromWarehouse:"المخزن الرئيسي",toWarehouse:"مخزن قطع الغيار",itemCode:"",itemName:"",qty:1,reason:""});
  const load=async()=>{setBusy(true);try{setRows(await api("/transfers"))}catch(e){onToast(e.message)}finally{setBusy(false)}};
  useEffect(()=>{load()},[]);
  const filtered=rows.filter(r=>Object.values(r).join(" ").toLowerCase().includes(query.toLowerCase()));
  const create=async e=>{e.preventDefault();try{const t=await api("/transfers",{method:"POST",body:JSON.stringify(form)});setRows([t,...rows]);setOpen(false);setForm({...form,itemCode:"",itemName:"",qty:1,reason:""});onToast("تم إنشاء تحويل مخزني مع تحديد المصدر والمستلم");onDocumentsChanged?.()}catch(err){onToast(err.message)}};
  const setStatus=async(row,status)=>{try{await api(`/transfers/${row.id}/status`,{method:"PATCH",body:JSON.stringify({status})});setRows(rows.map(x=>x.id===row.id?{...x,status}:x));onToast(`تم تحديث التحويل إلى: ${status}`);onDocumentsChanged?.()}catch(e){onToast(e.message)}};
  return <><PageTitle title="تحويل من مخزن لمخزن" subtitle="تسجيل التحويلات مع ذكر المخزن المصدر والمخزن المستلم ومتابعة الصرف والاستلام" action={open?"إغلاق النموذج":"تحويل جديد"} onAction={()=>setOpen(!open)} icon={ArrowsLeftRight}/>
    {open&&<section className="panel inline-form"><form className="form-grid" onSubmit={create}><label>من مخزن<select value={form.fromWarehouse} onChange={e=>setForm({...form,fromWarehouse:e.target.value})}><option>المخزن الرئيسي</option><option>مخزن قطع الغيار</option><option>مخزن الأجهزة</option><option>مخزن الحجر الصحي</option></select></label><label>إلى مخزن<select value={form.toWarehouse} onChange={e=>setForm({...form,toWarehouse:e.target.value})}><option>مخزن قطع الغيار</option><option>المخزن الرئيسي</option><option>مخزن الأجهزة</option><option>مخزن الحجر الصحي</option></select></label><label>كود الصنف<input value={form.itemCode} onChange={e=>setForm({...form,itemCode:e.target.value})} placeholder="اختياري"/></label><label>اسم الصنف<input value={form.itemName} onChange={e=>setForm({...form,itemName:e.target.value})} required/></label><label>الكمية<input type="number" min="1" value={form.qty} onChange={e=>setForm({...form,qty:e.target.value})} required/></label><label>سبب التحويل<input value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})} placeholder="احتياج فرع / إعادة توزيع"/></label><div className="transfer-route full"><span>{form.fromWarehouse}</span><ArrowsLeftRight/><span>{form.toWarehouse}</span></div><div className="form-actions full"><button className="primary"><Plus/> حفظ التحويل</button></div></form></section>}
    <Toolbar query={query} setQuery={setQuery} onExport={()=>downloadCsv("warehouse-transfers",[["رقم التحويل","من مخزن","إلى مخزن","الصنف","الكمية","الحالة"],...filtered.map(r=>[r.transferNo,r.fromWarehouse,r.toWarehouse,r.itemName,r.qty,r.status])])} onFilter={()=>setQuery("")}/>
    <section className="panel"><div className="table-wrap"><table><thead><tr><th>رقم التحويل</th><th>المخزن المصدر</th><th>المخزن المستلم</th><th>الصنف</th><th>الكمية</th><th>الحالة</th><th>إجراء</th></tr></thead><tbody>{busy?<tr><td colSpan="7">جاري تحميل التحويلات...</td></tr>:filtered.length?filtered.map(r=><tr key={r.id}><td><b className="link">{r.transferNo}</b></td><td>{r.fromWarehouse}</td><td>{r.toWarehouse}</td><td><b>{r.itemName}</b><small>{r.itemCode||r.reason||"—"}</small></td><td>{r.qty}</td><td><Badge>{r.status}</Badge></td><td><div className="row-actions"><button className="secondary" onClick={()=>setStatus(r,"IN_TRANSIT")}>صرف</button><button className="primary" onClick={()=>setStatus(r,"RECEIVED")}>استلام</button><button className="danger" onClick={()=>setStatus(r,"CANCELLED")}>إلغاء</button></div></td></tr>):<tr><td colSpan="7"><div className="empty-state">لا توجد تحويلات حتى الآن</div></td></tr>}</tbody></table></div></section></>;
}

function InventoryPage({ ledger=false, onToast }) {
  const [query,setQuery]=useState(""); const rows=stock.filter(r=>Object.values(r).join(" ").toLowerCase().includes(query.toLowerCase()));
  const exportRows=()=>{downloadCsv(ledger?"inventory-ledger":"stock-balance",[["الكود","الصنف","التصنيف","المخزن","الرصيد","المحجوز","المتاح","القيمة"],...rows.map(r=>[r.code,r.name,r.category,r.warehouse,r.onHand,r.reserved,r.onHand-r.reserved,r.onHand*r.cost])]);onToast("تم تصدير بيانات المخزون")};
  return <><PageTitle title={ledger?"سجل حركات المخزون":"أرصدة المخزون"} subtitle={ledger?"السجل غير القابل للحذف لكل حركة مخزنية":"الأرصدة الفعلية والمتاحة حسب المخزن والموقع"} action="تصدير Excel" icon={DownloadSimple} onAction={exportRows}/><Toolbar query={query} setQuery={setQuery} onExport={exportRows} onFilter={()=>onToast("تم تطبيق فلتر المخزن الرئيسي")}/>
    <section className="panel"><div className="summary-strip"><div><span>إجمالي القيمة</span><b>12,450,230 ج.م</b></div><div><span>عدد الأصناف</span><b>8,342</b></div><div><span>المتاح</span><b>91.6%</b></div><div><span>المحجوز</span><b>8.4%</b></div></div><div className="table-wrap"><table><thead><tr><th>كود الصنف</th><th>الصنف</th><th>التصنيف</th><th>المخزن</th><th>{ledger?"آخر حركة":"الرصيد"}</th><th>المحجوز</th><th>المتاح</th><th>القيمة</th><th>الحالة</th></tr></thead><tbody>{rows.map((r,i)=><tr key={r.code}><td><b className="link">{r.code}</b></td><td><b>{r.name}</b><small>وحدة: قطعة</small></td><td>{r.category}</td><td>{r.warehouse}</td><td>{ledger?(i%2?"صرف":"إضافة"):r.onHand}</td><td>{r.reserved}</td><td><b>{r.onHand-r.reserved}</b></td><td>{money.format(r.onHand*r.cost)} ج.م</td><td><Badge>{r.state}</Badge></td></tr>)}</tbody></table></div></section></>;
}

const roleNames={SUPER_ADMIN:"مدير النظام",WAREHOUSE_MANAGER:"مدير المخزن",STORE_KEEPER:"أمين مخزن",QC_INSPECTOR:"مسؤول الجودة",FINANCE:"المالية",REQUESTER:"طالب صرف",PROCUREMENT:"المشتريات",AUDITOR:"مراجع داخلي"};
function UsersPage({onToast,currentUser}) {
  const [users,setUsers]=useState([]),[roles,setRoles]=useState([]),[open,setOpen]=useState(false),[busy,setBusy]=useState(true),[error,setError]=useState("");
  const [form,setForm]=useState({name:"",phone:"",email:"",password:"",role:"STORE_KEEPER"});
  const load=async()=>{setBusy(true);try{const [u,r]=await Promise.all([api("/users"),api("/roles")]);setUsers(u);setRoles(r)}catch(e){setError(e.message)}finally{setBusy(false)}};
  useEffect(()=>{load()},[]);
  const create=async e=>{e.preventDefault();setError("");try{const u=await api("/users",{method:"POST",body:JSON.stringify(form)});setUsers([...users,u]);setOpen(false);setForm({name:"",phone:"",email:"",password:"",role:"STORE_KEEPER"});onToast("تم إنشاء حساب الموظف وتطبيق صلاحياته")}catch(e){setError(e.message)}};
  const update=async(u,patch)=>{try{await api(`/users/${u.id}`,{method:"PATCH",body:JSON.stringify(patch)});setUsers(users.map(x=>x.id===u.id?{...x,...patch}:x));onToast("تم تحديث صلاحيات الموظف")}catch(e){onToast(e.message)}};
  if(currentUser?.role!=="SUPER_ADMIN")return <><PageTitle title="المستخدمون والصلاحيات" subtitle="إدارة الوصول إلى النظام"/><section className="panel empty-state"><ShieldCheck/><h3>هذا القسم لمدير النظام فقط</h3><p>حسابك الحالي لا يملك صلاحية تعديل المستخدمين.</p></section></>;
  return <><PageTitle title="المستخدمون والصلاحيات" subtitle="إنشاء الموظفين وتحديد نطاق وصول كل دور" action="موظف جديد" onAction={()=>setOpen(true)}/>
    <section className="access-summary"><div><Users/><span>إجمالي المستخدمين<b>{users.length}</b></span></div><div><CheckCircle/><span>حسابات نشطة<b>{users.filter(x=>x.active).length}</b></span></div><div><ShieldCheck/><span>الأدوار المعرفة<b>{roles.length}</b></span></div></section>
    {error&&!open&&<div className="form-error" role="alert">{error}</div>}
    <section className="panel users-table"><div className="table-wrap"><table><thead><tr><th>الموظف</th><th>الهاتف</th><th>الدور</th><th>الحالة</th><th>آخر إجراء</th></tr></thead><tbody>{busy?<tr><td colSpan="5">جارٍ تحميل المستخدمين...</td></tr>:users.map(u=><tr key={u.id}><td><b>{u.name}</b><small>{u.email}</small></td><td>{u.phone||"—"}</td><td><select className="role-select" value={u.role} onChange={e=>update(u,{role:e.target.value})}>{roles.map(r=><option key={r.code} value={r.code}>{roleNames[r.code]||r.code}</option>)}</select></td><td><button className={`status-toggle ${u.active?"on":"off"}`} onClick={()=>update(u,{active:!u.active})}><i/>{u.active?"نشط":"موقوف"}</button></td><td>{u.id===currentUser.id?<Badge>الحساب الحالي</Badge>:<span className="muted">تعديل مباشر</span>}</td></tr>)}</tbody></table></div></section>
    <section className="panel permissions-panel"><div className="panel-head"><div><h2>مصفوفة الصلاحيات</h2><p>ملخص الصلاحيات الممنوحة لكل دور</p></div></div><div className="role-grid">{roles.map(r=><article key={r.code}><div><ShieldCheck/><b>{roleNames[r.code]||r.code}</b></div>{r.permissions.map(p=><span key={p}><Check/>{p}</span>)}</article>)}</div></section>
    {open&&<div className="overlay" onMouseDown={()=>setOpen(false)}><form className="modal user-modal" onSubmit={create} onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><span>إدارة الصلاحيات</span><h2>إضافة موظف جديد</h2></div><button type="button" className="icon-btn" aria-label="إغلاق" onClick={()=>setOpen(false)}><X/></button></div><div className="form-grid"><label>اسم الموظف<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/></label><label>رقم الهاتف<input inputMode="tel" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} required/></label><label>البريد الإلكتروني<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label><label>كلمة المرور المؤقتة<input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required minLength="6"/></label><label className="full">الدور<select value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>{roles.map(r=><option key={r.code} value={r.code}>{roleNames[r.code]||r.code}</option>)}</select></label></div>{error&&<div className="form-error" role="alert">{error}</div>}<div className="modal-actions"><button type="button" className="ghost" onClick={()=>setOpen(false)}>إلغاء</button><button className="primary">إنشاء الحساب</button></div></form></div>}
  </>;
}

function MasterPage({ type, onToast }) {
  const cfg={items:["دليل الأصناف","تعريف الأصناف وأكوادها وسياسات التتبع والتقييم","صنف جديد"],warehouses:["المخازن والمواقع","إدارة الفروع والمخازن والأرفف ومواقع التخزين","مخزن جديد"],suppliers:["الموردون","بيانات الموردين وتقييم الجودة والأداء","مورد جديد"],users:["المستخدمون والصلاحيات","إدارة المستخدمين والأدوار ونطاق الوصول","مستخدم جديد"]}[type];
  const [query,setQuery]=useState("");
  const list=stock.slice(0,5).filter(r=>Object.values(r).join(" ").toLowerCase().includes(query.toLowerCase())||type!=="items");
  return <><PageTitle title={cfg[0]} subtitle={cfg[1]} action={cfg[2]} onAction={()=>onToast(`تم فتح نموذج ${cfg[2]}`)}/><Toolbar query={query} setQuery={setQuery} onExport={()=>onToast("تم تجهيز التصدير")} onFilter={()=>onToast("تم تطبيق التصفية")}/><section className="panel cards-list">{list.map((r,i)=><div className="entity-row" key={i}><div className="entity-avatar"><Package/></div><div className="grow"><b>{type==="items"?r.name:type==="warehouses"?["المخزن الرئيسي","مخزن قطع الغيار","مخزن الأجهزة","مخزن الحجر الصحي","مخزن الخردة"][i]:type==="suppliers"?["النور للأدوات الصحية","المصرية للتوريدات","دلتا بايب","المتحدة للتجارة","الصناعات الحديثة"][i]:["أحمد محمود","محمود علي","سارة حسن","محمد أمين","نور خالد"][i]}</b><small>{type==="items"?`${r.code} • ${r.category}`:type==="warehouses"?`WH${i+1} • ${i?"فرعي":"رئيسي"}`:type==="suppliers"?`SUP-00${i+1} • مورد معتمد`:["مدير النظام","مدير المخزن","مسؤول الجودة","أمين مخزن","المالية"][i]}</small></div><Badge>{i===3?"بانتظار الاعتماد":"متاح"}</Badge><button className="icon-btn" aria-label="خيارات" onClick={()=>onToast("قائمة الإجراءات متاحة للتعديل والأرشفة")}><DotsThree/></button></div>)}</section></>;
}

function Approvals({ documents, onDecision }) { const pending=documents.filter(d=>d.status.includes("انتظار")||d.status.includes("بانتظار")); const [selectedNo,setSelectedNo]=useState(""); const selected=pending.find(d=>d.no===selectedNo)||pending[0]||documents[0]; if(!selected)return <div className="empty-state">لا توجد مستندات</div>; return <><PageTitle title="مركز الاعتمادات" subtitle="المستندات التي تنتظر قرارك وفق الصلاحيات"/><section className="approval-layout"><div className="panel approval-list"><div className="tabs"><button className="active">بانتظارك <span>{pending.length}</span></button><button>تمت معالجتها</button></div>{pending.map(d=><button className={`approval-item ${selected.no===d.no?"selected":""}`} onClick={()=>setSelectedNo(d.no)} key={d.no}><span className="doc-icon"><FileText/></span><div><b>{d.type}</b><small>{d.no} • {d.party}</small><em>{money.format(d.value)} ج.م</em></div><Badge>{d.status}</Badge></button>)}</div><div className="panel approval-detail"><div className="detail-head"><div><span>{selected.type}</span><h2>{selected.no}</h2><p>أُنشئ بواسطة محمد أمين • اليوم 09:42</p></div><Badge>{selected.status}</Badge></div><div className="detail-grid"><label>الجهة<b>{selected.party}</b></label><label>المخزن<b>{selected.warehouse}</b></label><label>المرجع<b>PO-2026-00451</b></label><label>إجمالي المستند<b>{money.format(selected.value)} ج.م</b></label></div><h3>مسار الاعتماد</h3><div className="timeline"><div className="done"><Check/><span><b>أمين المخزن</b><small>تم الإنشاء • 09:42</small></span></div><div className="done"><Check/><span><b>مسؤول الجودة</b><small>تم القبول • 11:05</small></span></div><div className="current"><Clock/><span><b>مدير المخزن</b><small>بانتظار قرارك</small></span></div><div><span/><span><b>المالية</b><small>الخطوة التالية</small></span></div></div><div className="approval-actions"><button className="danger" onClick={()=>onDecision(selected.no,"مرفوض")}>رفض</button><button className="primary" onClick={()=>onDecision(selected.no,"معتمد")}><Check/> اعتماد المستند</button></div></div></section></> }

function Reports({onToast}) { const cards=["تقرير أرصدة المخزون","حركة صنف","أذون الإضافة","أذون الصرف","التحويلات","رفض الجودة","فروق الجرد","الأصناف الراكدة","تنبيهات الصلاحية","إعادة الطلب","العهد","سجل التدقيق"]; const [active,setActive]=useState(""); return <><PageTitle title="مركز التقارير" subtitle="تقارير تشغيلية ورقابية قابلة للتصفية والتصدير"/>{active&&<section className="panel report-preview"><div className="panel-head"><div><h2>{active}</h2><p>معاينة مبنية على البيانات الحالية</p></div><div><button className="ghost" onClick={()=>downloadCsv("report",[["الكود","الصنف","الرصيد"],...stock.map(x=>[x.code,x.name,x.onHand])])}><DownloadSimple/> تصدير</button><button className="icon-btn" aria-label="إغلاق المعاينة" onClick={()=>setActive("")}><X/></button></div></div><ResponsiveContainer width="100%" height={220}><BarChart data={stock}><CartesianGrid stroke="#edf1f5" vertical={false}/><XAxis dataKey="code"/><YAxis/><Tooltip/><Bar dataKey="onHand" fill="#0b315c" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></section>}<div className="report-grid">{cards.map((x,i)=><button className="report-card" key={x} onClick={()=>{setActive(x);onToast(`تم فتح ${x}`)}}><span><ChartBar/></span><div><b>{x}</b><small>آخر تحديث: اليوم 09:{30+i}</small></div><ArrowRight/></button>)}</div></> }

function CreateModal({ close, onSave }) { const [step,setStep]=useState(1),[lineAdded,setLineAdded]=useState(false),[error,setError]=useState(""); const next=()=>{if(step===2&&!lineAdded){setError("يجب إضافة صنف واحد على الأقل قبل المتابعة");return}setError("");step<4?setStep(step+1):onSave()}; return <div className="overlay" onMouseDown={close}><div className="modal" role="dialog" aria-modal="true" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><span>مستند جديد</span><h2>إذن إضافة واستلام</h2></div><button className="icon-btn" aria-label="إغلاق" onClick={close}><X/></button></div><div className="steps">{["البيانات الرئيسية","الأصناف","المرفقات","الاعتمادات"].map((x,i)=><div className={step>=i+1?"active":""} key={x}><i>{step>i+1?<Check/>:i+1}</i><span>{x}</span></div>)}</div>{step===1?<div className="form-grid"><label>نوع الاستلام<select><option>شراء</option><option>مرتجع</option><option>تحويل</option></select></label><label>المورد<select><option>الشركة المصرية للتوريدات</option><option>النور للأدوات الصحية</option></select></label><label>المخزن<select><option>المخزن الرئيسي</option></select></label><label>رقم أمر الشراء<input defaultValue="PO-2026-00451"/></label><label>تاريخ الاستلام<input type="date" defaultValue="2026-06-28"/></label><label>رقم الفاتورة<input placeholder="INV-0000" required/></label><label className="full">ملاحظات<textarea placeholder="أدخل أي ملاحظات تخص عملية الاستلام"/></label></div>:<div className="lines-demo"><div className="empty-icon">{lineAdded?<Check/>:<Package/>}</div><h3>{step===2?(lineAdded?"تمت إضافة خلاط حوض كروم — 10 قطع":"أضف أصناف المستند"):step===3?"أرفق المستندات الداعمة":"سيتم إنشاء مسار الاعتماد تلقائيًا"}</h3><p>{step===2?"يمكنك البحث بكود الصنف أو الباركود وإضافة الكميات":step===3?"PDF أو صور أو ملفات Excel حتى 10 ميجابايت":"مدير المخزن ← مسؤول الجودة ← المالية"}</p>{step===2&&!lineAdded&&<button className="secondary" onClick={()=>{setLineAdded(true);setError("")}}><Plus/> إضافة صنف تجريبي</button>}{step===3&&<label className="upload-box">إرفاق ملف<input type="file"/></label>}</div>}{error&&<div className="form-error" role="alert">{error}</div>}<div className="modal-actions"><button className="ghost" onClick={step===1?close:()=>setStep(step-1)}>{step===1?"إلغاء":"السابق"}</button><button className="primary" onClick={next}>{step<4?"التالي":"حفظ كمسودة"}</button></div></div></div> }

function PageTitle({title,subtitle,action,onAction,icon:Icon=Plus}) { return <div className="page-head"><div><h1>{title}</h1><span>{subtitle}</span></div>{action&&<button className="primary" onClick={onAction}><Icon/>{action}</button>}</div> }
function Toolbar({query="",setQuery=()=>{},onFilter=()=>{},onExport=()=>{}}){return <div className="toolbar"><div className="search"><MagnifyingGlass/><input aria-label="بحث" value={query} onChange={e=>setQuery(e.target.value)} placeholder="بحث بالرقم أو الاسم..."/></div><button className="ghost" onClick={onFilter}><Funnel/> تصفية</button><button className="ghost" onClick={onExport}><DownloadSimple/> تصدير</button></div>}

export function App() {
  const [page,setPage]=useState("dashboard"), [collapsed,setCollapsed]=useState(()=>window.innerWidth<760), [modal,setModal]=useState(false), [notice,setNotice]=useState(false), [documents,setDocuments]=useState([]), [toast,setToast]=useState(""), [copilot,setCopilot]=useState(false), [user,setUser]=useState(null), [loading,setLoading]=useState(true);
  const showToast=(message)=>{setToast(message);window.clearTimeout(showToast.timer);showToast.timer=window.setTimeout(()=>setToast(""),2600)};
  const loadData=async()=>{setLoading(true);try{const [me,remoteDocs]=await Promise.all([api("/me"),api("/documents")]);setUser(me);setDocuments(remoteDocs)}catch{localStorage.removeItem("wareflow_token");setUser(null)}finally{setLoading(false)}};
  useEffect(()=>{localStorage.getItem("wareflow_token")?loadData():setLoading(false)},[]);
  const handleLogin=async u=>{setUser(u);const remoteDocs=await api("/documents");setDocuments(remoteDocs)};
  const refreshDocuments=async()=>{try{setDocuments(await api("/documents"))}catch(e){showToast(e.message)}};
  const saveDocument=async()=>{try{const next=await api("/documents",{method:"POST",body:JSON.stringify({type:"إذن إضافة",party:"الشركة المصرية للتوريدات",warehouse:"المخزن الرئيسي",date:"2026-06-28",value:14500})});setDocuments([next,...documents]);setModal(false);setPage("receipts");showToast(`تم حفظ ${next.no} في قاعدة البيانات`)}catch(e){showToast(e.message)}};
  const decide=async(no,status)=>{try{const d=documents.find(x=>x.no===no);await api(`/documents/${d.id}/decision`,{method:"PATCH",body:JSON.stringify({status})});setDocuments(documents.map(x=>x.no===no?{...x,status}:x));showToast(status==="معتمد"?"تم اعتماد المستند وتسجيل العملية":"تم رفض المستند وتسجيل السبب")}catch(e){showToast(e.message)}};
  const content=useMemo(()=>{ if(page==="dashboard") return <Dashboard onNavigate={setPage}/>; if(page==="qc") return <QCPage onToast={showToast} onDocumentsChanged={refreshDocuments}/>; if(page==="transfers") return <TransferPage onToast={showToast} onDocumentsChanged={refreshDocuments}/>; if(page==="issues") return <SalesPage onToast={showToast}/>; if(["receipts","counts","waste"].includes(page)) return <DocumentsPage kind={page} documents={documents} onToast={showToast} onCreate={()=>setModal(true)}/>; if(page==="balances"||page==="ledger") return <InventoryPage ledger={page==="ledger"} onToast={showToast}/>; if(page==="users") return <UsersPage onToast={showToast} currentUser={user}/>; if(["items","warehouses","suppliers"].includes(page)) return <EnhancedMasterPage type={page} onToast={showToast}/>; if(page==="approvals") return <Approvals documents={documents} onDecision={decide}/>; if(page==="reports") return <Reports onToast={showToast}/>; return <Dashboard onNavigate={setPage}/>},[page,documents,user]);
  if(loading)return <div className="boot-screen" dir="rtl"><Storefront/><b>جارٍ تشغيل WareFlow...</b></div>;
  if(!user)return <Login onLogin={handleLogin}/>;
  return <div className={`app ${collapsed?"collapsed":""}`} dir="rtl">
    <aside className="sidebar"><div className="brand"><span><Storefront weight="duotone"/></span><div><b>WareFlow</b><small>إدارة المخازن والمستندات</small></div></div><button className="collapse" aria-label="طي القائمة" onClick={()=>setCollapsed(!collapsed)}><ArrowRight/></button><nav>{navGroups.map(g=><div className="nav-group" key={g.title}><small>{g.title}</small>{g.items.map(({id,label,icon:Icon,badge})=><button className={page===id?"active":""} onClick={()=>{setPage(id);if(window.innerWidth<760)setCollapsed(true)}} key={id}><Icon size={21}/><span>{label}</span>{badge&&<em>{badge}</em>}</button>)}</div>)}</nav><div className="user"><span>م أ</span><div><b>محمد أحمد</b><small>مدير المخازن</small></div><CaretDown/></div></aside>
    <main className="workspace"><header><button className="mobile-menu" aria-label="فتح القائمة" onClick={()=>setCollapsed(false)}><List/></button><div className="crumb"><SquaresFour/> النظام / <b>{navGroups.flatMap(g=>g.items).find(x=>x.id===page)?.label}</b></div><div className="head-actions"><button aria-label="التنبيهات" onClick={()=>setNotice(!notice)}><Bell/><i>7</i></button><button aria-label="الإعدادات" onClick={()=>showToast("الإعدادات العامة قيد التجهيز للربط بقاعدة البيانات")}><Gear/></button><span className="divider"/><button className="warehouse" onClick={()=>showToast("نطاق العرض: المخزن الرئيسي")}><Buildings/><span>المخزن الرئيسي</span><CaretDown/></button></div>{notice&&<div className="notifications"><h3>التنبيهات <span>7 جديدة</span></h3><div><Warning/><p><b>مخزون حرج</b><small>طقم صرف حوض وصل إلى حد إعادة الطلب</small></p></div><div><SealCheck/><p><b>فحص جودة متأخر</b><small>الطلب QC-2026-0048 تجاوز SLA</small></p></div><button onClick={()=>{setNotice(false);setPage("balances")}}>عرض كل التنبيهات</button></div>}</header><div className="content">{content}</div></main>{modal&&<CreateModal close={()=>setModal(false)} onSave={saveDocument}/>}<button className="copilot" onClick={()=>setCopilot(!copilot)} title="مساعد المخازن الذكي"><Sparkle/><span>مساعد المخازن</span></button>
    {copilot&&<aside className="copilot-panel"><div><span><Sparkle/></span><section><b>مساعد المخازن</b><small>إجابات من بيانات النظام</small></section><button aria-label="إغلاق المساعد" onClick={()=>setCopilot(false)}><X/></button></div><p>لديك <b>18 صنفًا</b> تحت حد إعادة الطلب، و<b>12 مستندًا</b> في دورة الاعتماد.</p><div className="quick-asks"><button onClick={()=>setPage("balances")}>اعرض المخزون الحرج</button><button onClick={()=>setPage("approvals")}>ما الاعتمادات المعلقة؟</button><button onClick={()=>setPage("ledger")}>آخر حركات المخزون</button></div><small className="source">المصدر: أرصدة المخزون • سجل المستندات</small></aside>}
    {toast&&<div className="toast" role="status"><CheckCircle/>{toast}</div>}
  </div>;
}

const ENTITY_KEY = "wareflow_entities_v2";
const SALES_KEY = "wareflow_sales_v1";
const defaultEntities = {
  items: stock.map(x => ({id:x.code, code:x.code, name:x.name, category:x.category, unit:"قطعة", price:x.cost, min:x.min, warehouse:x.warehouse, onHand:x.onHand})),
  warehouses: [
    {id:"WH-001", name:"المخزن الرئيسي", manager:"مدير المخازن", location:"القاهرة", active:true},
    {id:"WH-002", name:"مخزن قطع الغيار", manager:"أمين المخزن", location:"الجيزة", active:true},
    {id:"WH-003", name:"مخزن الأجهزة", manager:"أمين المخزن", location:"القاهرة", active:true},
    {id:"WH-004", name:"مخزن الحجر الصحي", manager:"مسؤول الجودة", location:"منطقة الاستلام", active:true},
  ],
  suppliers: [
    {id:"SUP-001", name:"النور للأدوات الصحية", phone:"01000000001", contact:"مبيعات", active:true},
    {id:"SUP-002", name:"المصرية للتوريدات", phone:"01000000002", contact:"حسابات", active:true},
  ],
};
function getEntities() {
  const saved = localStorage.getItem(ENTITY_KEY);
  if (!saved) { localStorage.setItem(ENTITY_KEY, JSON.stringify(defaultEntities)); return defaultEntities; }
  return {...defaultEntities, ...JSON.parse(saved)};
}
function setEntities(next) { localStorage.setItem(ENTITY_KEY, JSON.stringify(next)); }
function EnhancedMasterPage({ type, onToast }) {
  const labels = {
    items:["دليل الأصناف","إضافة وتعديل الأصناف وأسعار البيع وحدود إعادة الطلب","صنف جديد"],
    warehouses:["المخازن والمواقع","إضافة المخازن والفروع وتحديد المسؤول والموقع","مخزن جديد"],
    suppliers:["الموردون","إضافة بيانات الموردين وجهات الاتصال وحالة التعامل","مورد جديد"],
  }[type];
  const [entities,setLocalEntities]=useState(()=>getEntities());
  const [query,setQuery]=useState("");
  const [open,setOpen]=useState(false);
  const emptyForm = type==="items" ? {code:"",name:"",category:"",unit:"قطعة",price:"",min:"",warehouse:"المخزن الرئيسي",onHand:""} : type==="warehouses" ? {name:"",manager:"",location:"",active:true} : {name:"",phone:"",contact:"",active:true};
  const [form,setForm]=useState(emptyForm);
  useEffect(()=>setForm(emptyForm),[type]);
  const rows=(entities[type]||[]).filter(x=>Object.values(x).join(" ").toLowerCase().includes(query.toLowerCase()));
  const save=e=>{e.preventDefault(); const next={...entities}; const row={...form,id:form.code||`${type.toUpperCase()}-${Date.now()}`,active:form.active!==false,onHand:Number(form.onHand||0),price:Number(form.price||0),min:Number(form.min||0)}; next[type]=[row,...(next[type]||[])]; setEntities(next); setLocalEntities(next); setOpen(false); setForm(emptyForm); onToast(`تم حفظ ${type==="items"?"الصنف":type==="warehouses"?"المخزن":"المورد"} بنجاح`);};
  const toggle=row=>{const next={...entities,[type]:entities[type].map(x=>x.id===row.id?{...x,active:!x.active}:x)}; setEntities(next); setLocalEntities(next); onToast("تم تحديث الحالة");};
  return <><PageTitle title={labels[0]} subtitle={labels[1]} action={labels[2]} onAction={()=>setOpen(true)}/><Toolbar query={query} setQuery={setQuery} onExport={()=>downloadCsv(type, [Object.keys(rows[0]||{}), ...rows.map(r=>Object.values(r))])} onFilter={()=>setQuery("")}/>
    <section className="panel"><div className="table-wrap"><table><thead><tr>{type==="items"?<><th>الكود</th><th>الصنف</th><th>التصنيف</th><th>المخزن</th><th>الرصيد</th><th>سعر البيع</th><th>الحالة</th></>:type==="warehouses"?<><th>كود</th><th>المخزن</th><th>المسؤول</th><th>الموقع</th><th>الحالة</th></>:<><th>كود</th><th>المورد</th><th>الهاتف</th><th>مسؤول التواصل</th><th>الحالة</th></>}</tr></thead><tbody>{rows.map(r=><tr key={r.id}>{type==="items"?<><td><b className="link">{r.code}</b></td><td><b>{r.name}</b><small>{r.unit}</small></td><td>{r.category}</td><td>{r.warehouse}</td><td>{r.onHand}</td><td>{money.format(r.price)} ج.م</td><td><button className={`status-toggle ${r.active?"on":"off"}`} onClick={()=>toggle(r)}><i/>{r.active?"نشط":"موقوف"}</button></td></>:type==="warehouses"?<><td><b className="link">{r.id}</b></td><td><b>{r.name}</b></td><td>{r.manager}</td><td>{r.location}</td><td><button className={`status-toggle ${r.active?"on":"off"}`} onClick={()=>toggle(r)}><i/>{r.active?"نشط":"موقوف"}</button></td></>:<><td><b className="link">{r.id}</b></td><td><b>{r.name}</b></td><td>{r.phone}</td><td>{r.contact}</td><td><button className={`status-toggle ${r.active?"on":"off"}`} onClick={()=>toggle(r)}><i/>{r.active?"نشط":"موقوف"}</button></td></>}</tr>)}</tbody></table></div></section>
    {open&&<div className="overlay" onMouseDown={()=>setOpen(false)}><form className="modal user-modal" onSubmit={save} onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><span>{labels[0]}</span><h2>{labels[2]}</h2></div><button type="button" className="icon-btn" onClick={()=>setOpen(false)}><X/></button></div><div className="form-grid">{type==="items"?<><label>كود الصنف<input value={form.code} onChange={e=>setForm({...form,code:e.target.value})} placeholder="ITM-00001" required/></label><label>اسم الصنف<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/></label><label>التصنيف<input value={form.category} onChange={e=>setForm({...form,category:e.target.value})} required/></label><label>الوحدة<input value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}/></label><label>سعر البيع<input type="number" min="0" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/></label><label>حد إعادة الطلب<input type="number" min="0" value={form.min} onChange={e=>setForm({...form,min:e.target.value})}/></label><label>المخزن<select value={form.warehouse} onChange={e=>setForm({...form,warehouse:e.target.value})}>{entities.warehouses.map(w=><option key={w.id}>{w.name}</option>)}</select></label><label>رصيد افتتاحي<input type="number" min="0" value={form.onHand} onChange={e=>setForm({...form,onHand:e.target.value})}/></label></>:type==="warehouses"?<><label>اسم المخزن<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/></label><label>المسؤول<input value={form.manager} onChange={e=>setForm({...form,manager:e.target.value})} required/></label><label className="full">الموقع<input value={form.location} onChange={e=>setForm({...form,location:e.target.value})} required/></label></>:<><label>اسم المورد<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/></label><label>الهاتف<input inputMode="tel" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label><label className="full">مسؤول التواصل<input value={form.contact} onChange={e=>setForm({...form,contact:e.target.value})}/></label></>}</div><div className="modal-actions"><button type="button" className="ghost" onClick={()=>setOpen(false)}>إلغاء</button><button className="primary">حفظ</button></div></form></div>}
  </>;
}
function getSales(){ const saved=localStorage.getItem(SALES_KEY); if(saved)return JSON.parse(saved); const rows=[]; localStorage.setItem(SALES_KEY,JSON.stringify(rows)); return rows; }
function setSales(rows){ localStorage.setItem(SALES_KEY,JSON.stringify(rows)); }
function SalesPage({onToast}) {
  const [entities,setEntitiesState]=useState(()=>getEntities());
  const [rows,setRows]=useState(()=>getSales());
  const [query,setQuery]=useState("");
  const [open,setOpen]=useState(false);
  const [form,setForm]=useState({customer:"عميل نقدي",warehouse:"المخزن الرئيسي",itemCode:"",qty:1,price:"",notes:""});
  const item=entities.items.find(x=>x.code===form.itemCode)||entities.items[0];
  useEffect(()=>{ if(!form.itemCode && item) setForm(f=>({...f,itemCode:item.code,price:item.price||0})); },[item?.code]);
  const filtered=rows.filter(r=>Object.values(r).join(" ").toLowerCase().includes(query.toLowerCase()));
  const create=e=>{e.preventDefault(); const selected=entities.items.find(x=>x.code===form.itemCode); if(!selected) return onToast("اختار صنف صحيح"); if(Number(form.qty)>Number(selected.onHand||0)) return onToast("الرصيد غير كافي لإتمام البيع/الصرف"); const sale={id:Date.now(),no:`SIV-2026-${String(rows.length+1).padStart(6,"0")}`,date:new Date().toLocaleDateString("ar-EG"),type:"إذن صرف / بيع",customer:form.customer,warehouse:form.warehouse,itemCode:selected.code,itemName:selected.name,qty:Number(form.qty),price:Number(form.price||selected.price||0),total:Number(form.qty)*Number(form.price||selected.price||0),status:"معتمد",notes:form.notes}; const nextRows=[sale,...rows]; const nextEntities={...entities,items:entities.items.map(x=>x.code===selected.code?{...x,onHand:Number(x.onHand||0)-Number(form.qty)}:x)}; setSales(nextRows); setEntities(nextEntities); setRows(nextRows); setEntitiesState(nextEntities); setOpen(false); setForm({customer:"عميل نقدي",warehouse:"المخزن الرئيسي",itemCode:selected.code,qty:1,price:selected.price||0,notes:""}); onToast("تم إنشاء إذن صرف/بيع وخصم الكمية من الرصيد"); };
  return <><PageTitle title="أذون الصرف والبيع" subtitle="بيع للعميل أو صرف داخلي مع خصم الكمية من المخزون وتسجيل إجمالي العملية" action={open?"إغلاق النموذج":"إذن صرف / بيع جديد"} onAction={()=>setOpen(!open)} icon={ClipboardText}/>
    {open&&<section className="panel inline-form"><form className="form-grid" onSubmit={create}><label>العميل / الجهة<input value={form.customer} onChange={e=>setForm({...form,customer:e.target.value})} required/></label><label>المخزن<select value={form.warehouse} onChange={e=>setForm({...form,warehouse:e.target.value})}>{entities.warehouses.map(w=><option key={w.id}>{w.name}</option>)}</select></label><label>الصنف<select value={form.itemCode} onChange={e=>{const it=entities.items.find(x=>x.code===e.target.value);setForm({...form,itemCode:e.target.value,price:it?.price||0})}}>{entities.items.map(x=><option key={x.code} value={x.code}>{x.code} - {x.name} / رصيد {x.onHand}</option>)}</select></label><label>الكمية<input type="number" min="1" value={form.qty} onChange={e=>setForm({...form,qty:e.target.value})} required/></label><label>سعر البيع<input type="number" min="0" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/></label><label>الإجمالي<input readOnly value={money.format(Number(form.qty||0)*Number(form.price||0))}/></label><label className="full">ملاحظات<textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label><div className="form-actions full"><button className="primary"><Plus/> حفظ وخصم من المخزون</button></div></form></section>}
    <Toolbar query={query} setQuery={setQuery} onExport={()=>downloadCsv("sales-issues",[["رقم الإذن","العميل","المخزن","الصنف","الكمية","الإجمالي","الحالة"],...filtered.map(r=>[r.no,r.customer,r.warehouse,r.itemName,r.qty,r.total,r.status])])} onFilter={()=>setQuery("")}/>
    <section className="panel"><div className="table-wrap"><table><thead><tr><th>رقم الإذن</th><th>العميل/الجهة</th><th>المخزن</th><th>الصنف</th><th>الكمية</th><th>الإجمالي</th><th>الحالة</th></tr></thead><tbody>{filtered.length?filtered.map(r=><tr key={r.id}><td><b className="link">{r.no}</b></td><td>{r.customer}</td><td>{r.warehouse}</td><td><b>{r.itemName}</b><small>{r.itemCode}</small></td><td>{r.qty}</td><td>{money.format(r.total)} ج.م</td><td><Badge>{r.status}</Badge></td></tr>):<tr><td colSpan="7"><div className="empty-state">لا توجد أذون صرف أو بيع حتى الآن</div></td></tr>}</tbody></table></div></section>
  </>;
}

const STORE_KEY = "wareflow_static_store_v1";
const adminUser = { id:1, name:"مدير النظام", phone:"01023299755", email:"admin@wareflow.local", role:"SUPER_ADMIN", active:true };
const roleCatalog = [
  {code:"SUPER_ADMIN",permissions:["كل الصلاحيات","إدارة المستخدمين","اعتماد المستندات","التقارير"]},
  {code:"WAREHOUSE_MANAGER",permissions:["المخزون","التحويلات","الاعتمادات"]},
  {code:"STORE_KEEPER",permissions:["أذون الإضافة","أذون الصرف","الأرصدة"]},
  {code:"QC_INSPECTOR",permissions:["فحص الجودة","الحجر الصحي","تقارير الجودة"]},
  {code:"FINANCE",permissions:["اعتماد مالي","قيمة المخزون","التقارير"]},
  {code:"AUDITOR",permissions:["عرض فقط","سجل التدقيق","التقارير"]},
];
function loadStore() {
  const saved = localStorage.getItem(STORE_KEY);
  if (saved) return JSON.parse(saved);
  const store = { users:[adminUser], documents: docs.map((d,i)=>({...d,id:i+1})), qc: [], transfers: [], seq:{doc:129,qc:1,transfer:1,user:2} };
  saveStore(store);
  return store;
}
function saveStore(store) { localStorage.setItem(STORE_KEY, JSON.stringify(store)); }
function readBody(options) { try { return JSON.parse(options.body || "{}"); } catch { return {}; } }
function requireUser() {
  const token = localStorage.getItem("wareflow_token");
  if (!token) throw new Error("يجب تسجيل الدخول أولًا");
  return loadStore().users.find(u => u.active) || adminUser;
}
async function localApi(path, options={}) {
  await new Promise(resolve => setTimeout(resolve, 80));
  const method = (options.method || "GET").toUpperCase();
  const store = loadStore();
  if (path === "/auth/login" && method === "POST") {
    const body = readBody(options);
    const user = store.users.find(u => u.active && (u.phone === body.identifier || u.email === body.identifier));
    if (!user || body.password !== "01023299755") throw new Error("بيانات الدخول غير صحيحة");
    return { token:`static-${Date.now()}`, user };
  }
  if (path === "/me") return requireUser();
  if (path === "/documents" && method === "GET") return store.documents;
  if (path === "/documents" && method === "POST") {
    const body = readBody(options);
    const doc = { id:Date.now(), no:`GRN-2026-${String(store.seq.doc++).padStart(6,"0")}`, status:"بانتظار الجودة", ...body };
    store.documents.unshift(doc); saveStore(store); return doc;
  }
  const decision = path.match(/^\/documents\/(.+)\/decision$/);
  if (decision && method === "PATCH") {
    const body = readBody(options);
    const doc = store.documents.find(d => String(d.id) === decision[1]);
    if (!doc) throw new Error("المستند غير موجود");
    doc.status = body.status; saveStore(store); return doc;
  }
  if (path === "/qc" && method === "GET") return store.qc;
  if (path === "/qc" && method === "POST") {
    const body = readBody(options);
    const q = { id:Date.now(), documentNo:`QC-2026-${String(store.seq.qc++).padStart(4,"0")}`, result:"بانتظار الفحص", inspector:"مسؤول الجودة", createdAt:new Date().toISOString(), ...body };
    store.qc.unshift(q);
    store.documents.unshift({ id:Date.now()+1, no:`GRN-2026-${String(store.seq.doc++).padStart(6,"0")}`, type:"إذن إضافة", party:"فحص الجودة", warehouse:q.warehouse, date:new Date().toLocaleDateString("ar-EG"), value:0, status:"بانتظار الجودة" });
    saveStore(store); return q;
  }
  const qcDecision = path.match(/^\/qc\/(.+)$/);
  if (qcDecision && method === "PATCH") {
    const body = readBody(options);
    const q = store.qc.find(x => String(x.id) === qcDecision[1]);
    if (!q) throw new Error("طلب الجودة غير موجود");
    q.result = body.result === "ACCEPTED" ? "مقبول" : body.result === "QUARANTINE" ? "حجر صحي" : body.result === "REJECTED" ? "مرفوض" : body.result;
    q.inspectedAt = new Date().toISOString();
    saveStore(store); return q;
  }
  if (path === "/transfers" && method === "GET") return store.transfers;
  if (path === "/transfers" && method === "POST") {
    const body = readBody(options);
    if (body.fromWarehouse === body.toWarehouse) throw new Error("لا يمكن التحويل لنفس المخزن");
    const transfer = { id:Date.now(), transferNo:`TRF-2026-${String(store.seq.transfer++).padStart(5,"0")}`, status:"مسودة", createdAt:new Date().toISOString(), ...body };
    store.transfers.unshift(transfer);
    store.documents.unshift({ id:Date.now()+2, no:transfer.transferNo, type:"تحويل مخزني", party:transfer.toWarehouse, warehouse:transfer.fromWarehouse, date:new Date().toLocaleDateString("ar-EG"), value:0, status:"بانتظار الصرف" });
    saveStore(store); return transfer;
  }
  const transferStatus = path.match(/^\/transfers\/(.+)\/status$/);
  if (transferStatus && method === "PATCH") {
    const body = readBody(options);
    const transfer = store.transfers.find(x => String(x.id) === transferStatus[1]);
    if (!transfer) throw new Error("التحويل غير موجود");
    transfer.status = body.status === "IN_TRANSIT" ? "في الطريق" : body.status === "RECEIVED" ? "تم الاستلام" : body.status === "CANCELLED" ? "ملغي" : body.status;
    saveStore(store); return transfer;
  }
  if (path === "/users" && method === "GET") return store.users;
  if (path === "/roles" && method === "GET") return roleCatalog;
  if (path === "/users" && method === "POST") {
    const body = readBody(options);
    const user = { id:store.seq.user++, active:true, email:"", ...body };
    store.users.push(user); saveStore(store); return user;
  }
  const userPatch = path.match(/^\/users\/(.+)$/);
  if (userPatch && method === "PATCH") {
    const body = readBody(options);
    const user = store.users.find(u => String(u.id) === userPatch[1]);
    if (!user) throw new Error("المستخدم غير موجود");
    Object.assign(user, body); saveStore(store); return user;
  }
  throw new Error("هذا الجزء غير متاح في النسخة السهلة");
}
