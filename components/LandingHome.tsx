import React from 'react';
import { Wallet, PiggyBank, BarChart3, CreditCard, Camera, Mail, LogIn } from 'lucide-react';

interface Props {
  // Abre el flujo de autenticación (login por defecto, o registro)
  onEnter: (view?: 'login' | 'register') => void;
}

const features = [
  { icon: Wallet, title: 'Ingresos y gastos', desc: 'Registra tus movimientos, clasifícalos por categorías y consulta tu balance al instante.' },
  { icon: PiggyBank, title: 'Metas de ahorro', desc: 'Crea metas, haz aportes y sigue tu progreso hacia cada objetivo.' },
  { icon: BarChart3, title: 'Presupuestos y reportes', desc: 'Define presupuestos mensuales y revisa reportes visuales de tus finanzas.' },
  { icon: CreditCard, title: 'Cuotas y créditos', desc: 'Lleva el control de tus pagos a cuotas y sus fechas de vencimiento.' },
  { icon: Camera, title: 'Escaneo con IA', desc: 'Toma una foto de un recibo o usa tu voz y la IA extrae el movimiento por ti.' },
  { icon: Mail, title: 'Importación desde Gmail', desc: 'Detecta movimientos en las notificaciones de tus bancos y los importa con tu revisión.' },
];

export const LandingHome: React.FC<Props> = ({ onEnter }) => {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="max-w-5xl mx-auto px-5">
        {/* Nav */}
        <nav className="flex items-center justify-between py-5 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-emerald-500/30">DS</div>
            <div className="leading-tight">
              <div className="font-bold text-base">DeerSystems Financial IA</div>
              <div className="text-[10px] tracking-widest uppercase text-slate-400">Lidutech</div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <a href="/privacidad.html" className="text-emerald-400 hover:text-emerald-300">Política de privacidad</a>
            <button onClick={() => onEnter('login')} className="bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold px-4 py-2 rounded-lg flex items-center gap-2">
              <LogIn size={16} /> Iniciar sesión
            </button>
          </div>
        </nav>

        {/* Hero */}
        <header className="text-center py-14">
          <h1 className="text-4xl md:text-5xl font-bold leading-tight">
            Controla tus finanzas personales<br />
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">con inteligencia artificial</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto mt-5">
            DeerSystems Financial IA es una aplicación web de Lidutech que te ayuda a registrar y entender
            tus ingresos y gastos, fijar metas de ahorro, controlar presupuestos y cuotas, y visualizar
            reportes claros de tu dinero — todo en un solo lugar.
          </p>
          <div className="flex gap-3 justify-center mt-8 flex-wrap">
            <button onClick={() => onEnter('login')} className="bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold px-6 py-3 rounded-xl">
              Entrar a la app
            </button>
            <button onClick={() => onEnter('register')} className="bg-slate-800 border border-slate-700 hover:border-slate-600 text-white font-semibold px-6 py-3 rounded-xl">
              Crear cuenta
            </button>
          </div>
        </header>

        {/* Features */}
        <section className="py-10">
          <h2 className="text-2xl font-bold text-center mb-2">¿Qué puedes hacer?</h2>
          <p className="text-center text-slate-400 max-w-xl mx-auto mb-8">Una herramienta completa para tu día a día financiero.</p>
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3"><Icon size={20} /></div>
                  <h3 className="font-semibold text-white mb-1">{f.title}</h3>
                  <p className="text-sm text-slate-400">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Gmail integration */}
        <section className="py-10">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-7">
            <h2 className="text-2xl font-bold mb-3 flex items-center gap-2"><Mail size={22} className="text-emerald-400" /> Integración con Google (Gmail)</h2>
            <p className="text-slate-400 mb-3">
              De forma <strong className="text-slate-200">opcional</strong>, puedes vincular tu cuenta de Google para agilizar el registro
              de tus movimientos. El propósito de esta integración es exclusivamente:
            </p>
            <ul className="text-slate-400 text-sm space-y-2 list-disc pl-5">
              <li>Leer, con permiso de <strong className="text-slate-200">solo lectura</strong> (<code className="bg-slate-900 px-1.5 py-0.5 rounded">gmail.readonly</code>), los correos de notificación de tus bancos para detectar compras, pagos, transferencias y retiros.</li>
              <li>Proponerte esos movimientos como sugerencias que <strong className="text-slate-200">tú revisas, editas y decides importar</strong> a tu cuenta.</li>
              <li>La app <strong className="text-slate-200">nunca</strong> envía, modifica ni elimina correos, y puedes desvincular tu cuenta cuando quieras desde los Ajustes.</li>
            </ul>
            <p className="text-slate-400 text-sm mt-3">
              El uso de la información obtenida de las APIs de Google se ajusta a la{' '}
              <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300">Política de Datos de Usuario de los Servicios de API de Google</a>,
              incluidos sus requisitos de Uso Limitado. Más detalles en la{' '}
              <a href="/privacidad.html" className="text-emerald-400 hover:text-emerald-300">Política de privacidad</a>.
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-slate-800 mt-6 py-8 text-center text-slate-500 text-sm">
          <div className="mb-2 flex items-center justify-center gap-3 flex-wrap">
            <a href="/privacidad.html" className="text-emerald-400 hover:text-emerald-300">Política de privacidad</a>
            <span>·</span>
            <a href="mailto:soporte@lidutech.net" className="text-emerald-400 hover:text-emerald-300">soporte@lidutech.net</a>
            <span>·</span>
            <button onClick={() => onEnter('login')} className="text-emerald-400 hover:text-emerald-300">Iniciar sesión</button>
          </div>
          <p>© 2026 Lidutech · DeerSystems Financial IA. Todos los derechos reservados.</p>
        </footer>
      </div>
    </div>
  );
};
