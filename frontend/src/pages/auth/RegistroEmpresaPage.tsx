import { useState, FormEvent, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authService } from '@/services/auth.service'
import { Pencil, Eye, EyeOff } from 'lucide-react'

interface CiiuItem {
  codigo_768: string
  clase_riesgo: number
  ciiu_rev4: string
  descripcion: string
  sector: string
  division: string
  grupo: string
}

export default function RegistroEmpresaPage() {
  const navigate = useNavigate()

  // ── Datos Empresa ────────────────────────────────────────────────
  const [nombre, setNombre] = useState('')
  const [nit, setNit] = useState('')
  const [numTrabajadores, setNumTrabajadores] = useState<number | ''>('')
  
  // ── CIIU & Clasificación ──────────────────────────────────────────
  const [queryCiiu, setQueryCiiu] = useState('')
  const [sugerenciasCiiu, setSugerenciasCiiu] = useState<CiiuItem[]>([])
  const [loadingCiiu, setLoadingCiiu] = useState(false)
  const [selectedCiiu, setSelectedCiiu] = useState<CiiuItem | null>(null)
  
  // Clasificación calculada / editable
  const [nivelRiesgo, setNivelRiesgo] = useState<number>(1)
  const [capituloCalculado, setCapituloCalculado] = useState<'I' | 'II' | 'III'>('I')
  const [manualOverride, setManualOverride] = useState(false)
  const [codigoCiiuManual, setCodigoCiiuManual] = useState('')

  // ── Datos Responsable ────────────────────────────────────────────
  const [responsableNombre, setResponsableNombre] = useState('')
  const [responsableDocumento, setResponsableDocumento] = useState('')
  const [responsableEmail, setResponsableEmail] = useState('')
  const [responsablePassword, setResponsablePassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // ── Estados UI ──────────────────────────────────────────────────
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [registeredSuccess, setRegisteredSuccess] = useState(false)

  // ── Búsqueda autocompletada CIIU ─────────────────────────────────
  useEffect(() => {
    if (queryCiiu.trim().length < 2) {
      setSugerenciasCiiu([])
      return
    }

    const timer = setTimeout(async () => {
      setLoadingCiiu(true)
      try {
        const res = await authService.buscarCiiu(queryCiiu.trim())
        setSugerenciasCiiu(res)
      } catch {
        setSugerenciasCiiu([])
      } finally {
        setLoadingCiiu(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [queryCiiu])

  // ── Cálculo Automático de Capítulo ──────────────────────────────
  useEffect(() => {
    const workers = typeof numTrabajadores === 'number' ? numTrabajadores : 0
    let cap: 'I' | 'II' | 'III' = 'I'

    if (nivelRiesgo >= 4 || workers > 50) {
      cap = 'III'
    } else if (workers >= 11) {
      cap = 'II'
    } else {
      cap = 'I'
    }

    setCapituloCalculado(cap)
  }, [numTrabajadores, nivelRiesgo])

  // ── Selección de CIIU ────────────────────────────────────────────
  const handleSelectCiiu = (item: CiiuItem) => {
    setSelectedCiiu(item)
    setNivelRiesgo(item.clase_riesgo)
    setCodigoCiiuManual(item.codigo_768)
    setQueryCiiu(`${item.codigo_768} - ${item.descripcion}`)
    setSugerenciasCiiu([])
  }

  // ── Indicador de Fortaleza de Contraseña ──────────────────────────
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: '', color: '#CBD5E1' }
    let score = 0
    if (pwd.length >= 8) score += 1
    if (/[A-Z]/.test(pwd)) score += 1
    if (/[0-9]/.test(pwd)) score += 1
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1

    switch (score) {
      case 1: return { score: 25, label: 'Débil', color: '#EF4444' }
      case 2: return { score: 50, label: 'Aceptable', color: '#F59E0B' }
      case 3: return { score: 75, label: 'Buena', color: '#3B82F6' }
      case 4: return { score: 100, label: 'Fuerte', color: '#10B981' }
      default: return { score: 10, label: 'Muy débil', color: '#EF4444' }
    }
  }

  const pwdStrength = getPasswordStrength(responsablePassword)

  // ── Submit y Validaciones ────────────────────────────────────────
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validaciones estrictas de frontend
    const cleanNombre = nombre.replace(/\s+/g, ' ').trim()
    const cleanNit = nit.replace(/\D/g, '').trim()
    const cleanDocumento = responsableDocumento.replace(/\D/g, '').trim()
    const cleanEmail = responsableEmail.trim()

    if (!cleanNombre) {
      setError('Por favor, ingresa el nombre de la empresa.')
      return
    }
    if (!cleanNit || cleanNit.length < 5) {
      setError('El NIT debe ser numérico y contener al menos 5 dígitos.')
      return
    }
    if (!numTrabajadores || numTrabajadores < 1) {
      setError('Ingresa un número entero positivo para la cantidad de trabajadores.')
      return
    }
    if (!cleanDocumento) {
      setError('El número de documento debe contener únicamente dígitos.')
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(cleanEmail)) {
      setError('Por favor, ingresa un correo electrónico válido.')
      return
    }
    if (responsablePassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (responsablePassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    try {
      await authService.registrarEmpresa({
        nombre: cleanNombre,
        nit: cleanNit,
        num_trabajadores: Number(numTrabajadores),
        nivel_riesgo: Number(nivelRiesgo),
        ciiu_codigo: manualOverride ? codigoCiiuManual : (selectedCiiu?.codigo_768 || ''),
        ciiu_descripcion: selectedCiiu?.descripcion || queryCiiu,
        sector_economico: selectedCiiu?.sector || '',
        responsable_nombre: responsableNombre.trim(),
        responsable_documento: cleanDocumento,
        responsable_email: cleanEmail,
        responsable_password: responsablePassword,
      })
      setRegisteredSuccess(true)
    } catch (err: any) {
      setError(err?.message || 'No fue posible registrar la empresa. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="lr">
        <div className="bg-wrapper" />
        <main className="l-page">
          <div className="l-card-wide">

            <header className="reg-header">
              <div className="brand-badge">
                <img src="/assets/logo-fosst-icon.png" alt="Fosst Logo" className="brand-logo" />
                <div>
                  <div className="brand-title">Fosst</div>
                  <div className="brand-sub">REGISTRO DE EMPRESA · SG-SST</div>
                </div>
              </div>
              <Link to="/login" className="link-back">← Volver al login</Link>
            </header>

            {registeredSuccess ? (
              <div className="success-card">
                <div className="success-icon">
                  <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="success-title">¡Empresa registrada exitosamente!</h2>
                <p className="success-desc">
                  Hemos creado la empresa <strong>{nombre}</strong> y la cuenta del responsable. Se ha enviado un correo de activación a <strong>{responsableEmail}</strong>.
                </p>
                <div className="success-actions">
                  <button onClick={() => navigate('/login')} className="btn-action">
                    Ir al inicio de sesión →
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="reg-form">
                
                {/* ── SECCIÓN 1: DATOS DE LA EMPRESA ── */}
                <section className="form-section">
                  <h3 className="section-title">
                    <span className="step-num">1</span> Información de la Empresa
                  </h3>

                  <div className="fields-grid">
                    <div>
                      <label className="field-label" htmlFor="reg-nombre">Nombre o Razón Social</label>
                      <input
                        id="reg-nombre"
                        type="text"
                        className="field-input"
                        placeholder="Ej. Constructora Andina S.A.S."
                        value={nombre}
                        onChange={e => setNombre(e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <label className="field-label" htmlFor="reg-nit">NIT (sin puntos ni guiones)</label>
                      <input
                        id="reg-nit"
                        type="text"
                        className="field-input"
                        placeholder="Ej. 900234567"
                        value={nit}
                        onChange={e => setNit(e.target.value.replace(/\D/g, ''))}
                        required
                      />
                    </div>

                    <div>
                      <label className="field-label" htmlFor="reg-trabajadores">N° de Trabajadores</label>
                      <input
                        id="reg-trabajadores"
                        type="number"
                        min="1"
                        className="field-input"
                        placeholder="Ej. 25"
                        value={numTrabajadores}
                        onChange={e => {
                          const val = parseInt(e.target.value, 10)
                          setNumTrabajadores(isNaN(val) || val < 1 ? '' : val)
                        }}
                        required
                      />
                    </div>

                    {/* Autocompletado de Actividad Económica */}
                    <div style={{ position: 'relative' }}>
                      <label className="field-label" htmlFor="reg-ciiu">Actividad Económica (Búsqueda CIIU)</label>
                      <input
                        id="reg-ciiu"
                        type="text"
                        className="field-input"
                        placeholder="Escribe tu actividad (ej. Construcción, Comercio...)"
                        value={queryCiiu}
                        onChange={e => {
                          setQueryCiiu(e.target.value)
                          setSelectedCiiu(null)
                        }}
                      />

                      {loadingCiiu && (
                        <span className="searching-spinner">Buscando...</span>
                      )}

                      {sugerenciasCiiu.length > 0 && (
                        <ul className="ciiu-dropdown">
                          {sugerenciasCiiu.map(item => (
                            <li
                              key={item.codigo_768}
                              onClick={() => handleSelectCiiu(item)}
                              className="ciiu-dropdown-item"
                            >
                              <span className="ciiu-code">{item.codigo_768}</span>
                              <span className="ciiu-desc">{item.descripcion}</span>
                              <span className="ciiu-risk">Riesgo {item.clase_riesgo}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  {/* Tarjeta Informativa de Clasificación Automática */}
                  <div className="clasificacion-card">
                    <div className="clasificacion-header">
                      <div className="info-badge">
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                          <path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                        <span>Clasificación Automática Res. 0312 / 2019</span>
                      </div>

                      <button
                        type="button"
                        className="btn-toggle-manual inline-flex items-center gap-1.5"
                        onClick={() => setManualOverride(!manualOverride)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>{manualOverride ? 'Restaurar cálculo automático' : 'Modificación manual'}</span>
                      </button>
                    </div>

                    <div className="clasificacion-grid">
                      <div className="clas-box">
                        <span className="clas-label">Código CIIU</span>
                        {manualOverride ? (
                          <input
                            type="text"
                            className="field-input-sm"
                            value={codigoCiiuManual}
                            onChange={e => setCodigoCiiuManual(e.target.value)}
                          />
                        ) : (
                          <span className="clas-val">{selectedCiiu?.codigo_768 || 'Pendiente'}</span>
                        )}
                      </div>

                      <div className="clas-box">
                        <span className="clas-label">Nivel de Riesgo ARL</span>
                        {manualOverride ? (
                          <select
                            className="field-input-sm"
                            value={nivelRiesgo}
                            onChange={e => setNivelRiesgo(Number(e.target.value))}
                          >
                            {[1, 2, 3, 4, 5].map(r => (
                              <option key={r} value={r}>Riesgo {r}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="clas-val badge-risk">Riesgo {nivelRiesgo}</span>
                        )}
                      </div>

                      <div className="clas-box">
                        <span className="clas-label">Capítulo SG-SST Aplicable</span>
                        <span className="clas-val badge-cap">Capítulo {capituloCalculado}</span>
                      </div>
                    </div>

                    <p className="clasific-disclaimer">
                      La clasificación fue generada automáticamente con base en tu actividad económica y cantidad de trabajadores. Puedes editarla si posees información oficial diferente registrada ante la Cámara de Comercio o asignada por la ARL.
                    </p>
                  </div>
                </section>

                {/* ── SECCIÓN 2: DATOS DEL RESPONSABLE ── */}
                <section className="form-section" style={{ marginTop: '24px' }}>
                  <h3 className="section-title">
                    <span className="step-num">2</span> Datos del Usuario Responsable
                  </h3>

                  <div className="fields-grid">
                    <div>
                      <label className="field-label" htmlFor="reg-resp-nombre">Nombre Completo</label>
                      <input
                        id="reg-resp-nombre"
                        type="text"
                        className="field-input"
                        placeholder="Ej. María Jose Quintero"
                        value={responsableNombre}
                        onChange={e => setResponsableNombre(e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <label className="field-label" htmlFor="reg-resp-doc">Número de Documento</label>
                      <input
                        id="reg-resp-doc"
                        type="text"
                        className="field-input"
                        placeholder="Cédula de ciudadanía"
                        value={responsableDocumento}
                        onChange={e => setResponsableDocumento(e.target.value.replace(/\D/g, ''))}
                        required
                      />
                    </div>

                    <div>
                      <label className="field-label" htmlFor="reg-resp-email">Correo Electrónico Corporativo</label>
                      <input
                        id="reg-resp-email"
                        type="email"
                        className="field-input"
                        placeholder="usuario@empresa.com"
                        value={responsableEmail}
                        onChange={e => setResponsableEmail(e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <label className="field-label" htmlFor="reg-resp-pwd">Contraseña</label>
                      <div className="pwd-wrap">
                        <input
                          id="reg-resp-pwd"
                          type={showPassword ? 'text' : 'password'}
                          className="field-input"
                          placeholder="Mínimo 8 caracteres"
                          value={responsablePassword}
                          onChange={e => setResponsablePassword(e.target.value)}
                          required
                        />
                        <button
                          type="button"
                          className="btn-eye flex items-center justify-center text-slate-400 hover:text-slate-700"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Fortaleza de contraseña */}
                      {responsablePassword && (
                        <div className="pwd-meter">
                          <div
                            className="pwd-bar"
                            style={{ width: `${pwdStrength.score}%`, backgroundColor: pwdStrength.color }}
                          />
                          <span className="pwd-text" style={{ color: pwdStrength.color }}>
                            {pwdStrength.label}
                          </span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="field-label" htmlFor="reg-resp-confirm">Confirmar Contraseña</label>
                      <input
                        id="reg-resp-confirm"
                        type={showPassword ? 'text' : 'password'}
                        className="field-input"
                        placeholder="Repite la contraseña"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </section>

                {error && <div className="l-error">{error}</div>}

                <div className="form-footer">
                  <button type="submit" className="btn-action" disabled={loading}>
                    {loading ? (
                      <span className="btn-loading">
                        <svg className="spin" width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.416" strokeDashoffset="10" strokeLinecap="round" />
                        </svg>
                        Registrando empresa...
                      </span>
                    ) : 'Registrar Empresa y Continuar →'}
                  </button>
                </div>
              </form>
            )}

            <footer className="reg-footer">
              DiagnostiSST v1.0 · Sistema de Gestión SG-SST · Res. 0312 de 2019
            </footer>

          </div>
        </main>
      </div>
    </>
  )
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  :root{--azul-oscuro:#1A3A6B;--azul-medio:#1A3A6B;--azul-claro:#2C5AA0;--naranja:#F5A800;--naranja-claro:#FFB81C;--blanco:#FFFFFF;--gris-claro:#F4F5F7;--gris-texto:#4A5568;--borde:#D1D5DC;--placeholder:#94A3B8;--sombra:0 20px 60px rgba(26,58,107,0.18);}
  .lr,.lr *{box-sizing:border-box;margin:0;padding:0;}
  .lr{font-family:'Inter',sans-serif;background:var(--azul-oscuro);min-height:100vh;overflow-x:hidden;}
  .bg-wrapper{position:fixed;inset:0;background:linear-gradient(135deg,#1A3A6B 0%,#2C5AA0 50%,#1A3A6B 100%);z-index:0;}
  .l-page{position:relative;z-index:1;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:40px 20px;}
  .l-card-wide{background:var(--blanco);padding:44px 48px;border-radius:24px;box-shadow:var(--sombra);width:100%;max-width:820px;position:relative;animation:cardIn 0.6s cubic-bezier(0.22,1,0.36,1) both;}
  .l-card-wide::before{content:'';position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,var(--naranja) 0%,var(--naranja-claro) 100%);border-radius:24px 24px 0 0;}
  @keyframes cardIn{from{opacity:0;transform:translateY(30px) scale(0.98);}to{opacity:1;transform:translateY(0) scale(1);}}

  .reg-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:32px;}
  .brand-badge{display:flex;align-items:center;gap:12px;}
  .brand-logo{width:44px;height:44px;object-fit:contain;background:#F0F2F5;padding:6px;border-radius:12px;}
  .brand-title{font-size:20px;font-weight:800;color:var(--azul-oscuro);}
  .brand-sub{font-size:10px;font-weight:700;color:#6B7280;letter-spacing:0.05em;}
  .link-back{font-size:13px;font-weight:700;color:var(--azul-claro);text-decoration:none;transition:color 0.2s;}
  .link-back:hover{color:var(--naranja);}

  .section-title{font-size:16px;font-weight:800;color:var(--azul-oscuro);margin-bottom:16px;display:flex;align-items:center;gap:10px;}
  .step-num{width:28px;height:28px;background:rgba(245,168,0,0.15);color:var(--naranja);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;}

  .fields-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
  @media(max-width:640px){.fields-grid{grid-template-columns:1fr;}}

  .field-label{font-size:11px;font-weight:700;letter-spacing:0.5px;color:var(--azul-medio);text-transform:uppercase;margin-bottom:6px;display:block;}
  .field-input{width:100%;height:46px;padding:0 14px;border:1.5px solid var(--borde);border-radius:10px;font-family:'Inter',sans-serif;font-size:14px;font-weight:600;color:var(--azul-oscuro);background:var(--blanco);outline:none;transition:border-color 0.2s,box-shadow 0.2s;}
  .field-input:focus{border-color:var(--azul-claro);box-shadow:0 0 0 3px rgba(42,111,173,0.12);}
  .field-input-sm{height:36px;padding:0 10px;border:1.5px solid var(--borde);border-radius:8px;font-size:13px;font-weight:700;outline:none;}

  .searching-spinner{position:absolute;right:12px;top:36px;font-size:11px;color:var(--naranja);font-weight:700;}
  .ciiu-dropdown{position:absolute;top:100%;left:0;right:0;z-index:20;background:var(--blanco);border:1.5px solid var(--borde);border-radius:12px;box-shadow:0 12px 32px rgba(0,0,0,0.15);max-height:220px;overflow-y:auto;list-style:none;margin-top:4px;padding:6px;}
  .ciiu-dropdown-item{padding:10px 12px;border-radius:8px;cursor:pointer;display:flex;align-items:center;gap:10px;font-size:13px;transition:background 0.15s;}
  .ciiu-dropdown-item:hover{background:var(--gris-claro);}
  .ciiu-code{font-weight:800;color:var(--naranja);background:rgba(245,168,0,0.1);padding:2px 6px;border-radius:6px;font-size:11px;}
  .ciiu-desc{flex:1;color:var(--azul-oscuro);font-weight:600;}
  .ciiu-risk{font-size:11px;color:#6B7280;font-weight:700;}

  .clasificacion-card{margin-top:20px;background:#F8FAFC;border:1.5px solid #E2E8F0;border-radius:14px;padding:20px;}
  .clasificacion-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:10px;}
  .info-badge{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:800;color:var(--azul-claro);}
  .btn-toggle-manual{background:none;border:none;color:var(--naranja);font-size:12px;font-weight:800;cursor:pointer;}
  .btn-toggle-manual:hover{text-decoration:underline;}

  .clasificacion-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:12px;}
  @media(max-width:600px){.clasificacion-grid{grid-template-columns:1fr;}}
  .clas-box{background:var(--blanco);border:1px solid #E2E8F0;border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:4px;}
  .clas-label{font-size:10px;font-weight:700;color:#6B7280;text-transform:uppercase;}
  .clas-val{font-size:14px;font-weight:800;color:var(--azul-oscuro);}
  .badge-risk{color:#D97706;}
  .badge-cap{color:#059669;}

  .clasific-disclaimer{font-size:11px;color:#64748B;line-height:1.5;margin-top:8px;}

  .pwd-wrap{position:relative;}
  .btn-eye{position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:14px;}
  .pwd-meter{display:flex;align-items:center;gap:8px;margin-top:6px;}
  .pwd-bar{height:4px;border-radius:2px;transition:all 0.3s;}
  .pwd-text{font-size:10px;font-weight:700;}

  .l-error{background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:12px 16px;font-size:13px;color:#DC2626;font-weight:600;margin-top:20px;}

  .form-footer{margin-top:28px;}
  .btn-action{width:100%;height:52px;background:linear-gradient(135deg,var(--naranja) 0%,var(--naranja-claro) 100%);border:none;border-radius:12px;font-family:'Inter',sans-serif;font-size:15px;font-weight:800;letter-spacing:.5px;color:var(--blanco);cursor:pointer;box-shadow:0 6px 24px rgba(245,168,0,0.35);transition:transform .15s,box-shadow .15s;}
  .btn-action:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 10px 32px rgba(245,130,13,0.45);}
  .btn-action:disabled{opacity:0.6;cursor:not-allowed;}
  .btn-loading{display:flex;align-items:center;justify-content:center;gap:8px;}
  .spin{animation:spin 1s linear infinite;}
  @keyframes spin{to{transform:rotate(360deg);}}

  .success-card{text-align:center;padding:32px 16px;}
  .success-icon{width:64px;height:64px;background:#ECFDF5;color:#10B981;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;}
  .success-title{font-size:22px;font-weight:800;color:var(--azul-oscuro);margin-bottom:8px;}
  .success-desc{font-size:14px;color:var(--gris-texto);max-width:480px;margin:0 auto 24px;line-height:1.6;}
  .success-actions{max-width:320px;margin:0 auto;}

  .reg-footer{text-align:center;margin-top:32px;font-size:11px;color:#94A3B8;font-weight:600;}
`
