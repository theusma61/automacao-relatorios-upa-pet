import React, { useState, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';
import { api } from '../../services/api';

export default function AdminUsersModal({ darkMode, isOpen, onClose, onToast }) {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);

  const carregarUsuarios = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminUsuarios();
      if (res && Array.isArray(res.usuarios)) {
        setUsuarios(res.usuarios);
      }
    } catch (err) {
      onToast('Aviso ao carregar usuários: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      carregarUsuarios();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRoleChange = async (email, novoCargo) => {
    try {
      await api.updateAdminUserRole(email, novoCargo);
      onToast(`Permissões de ${email} atualizadas para: ${novoCargo}!`);
      await carregarUsuarios();
    } catch (err) {
      onToast('Erro ao alterar permissão: ' + err.message);
    }
  };

  const handlePlanoChange = async (email, novoPlano) => {
    try {
      await api.updateAdminUserPlano(email, novoPlano);
      onToast(`Licença/Plano de ${email} atualizado para: ${novoPlano}!`);
      await carregarUsuarios();
    } catch (err) {
      onToast('Erro ao alterar plano: ' + err.message);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/65 backdrop-blur-xs z-50 flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-3xl rounded-2xl border p-6 space-y-4 shadow-2xl ${
          darkMode
            ? 'bg-[#121E28] border-slate-700 text-white'
            : 'bg-white border-slate-200 text-[#0A141D]'
        }`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/40">
          <h3 className="text-base font-extrabold flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#00D296]" />
            <span>Controle de Acessos, Permissões e Licenças de Usuários</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white font-bold px-2 py-1"
          >
            ✕
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Carregando usuários do PostgreSQL...
            </div>
          ) : usuarios.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Nenhum usuário listado ou sessão em modo demonstração.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead
                className={`uppercase font-extrabold ${
                  darkMode ? 'bg-[#0A141D] text-slate-400' : 'bg-slate-50 text-slate-600'
                }`}
              >
                <tr>
                  <th className="p-2.5">Usuário</th>
                  <th className="p-2.5">E-mail</th>
                  <th className="p-2.5">Cargo / Papel</th>
                  <th className="p-2.5">Licença / Cota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {usuarios.map((u) => {
                  const planoAtual = (u.plano || (u.role === 'admin' ? 'ILIMITADO' : 'GRATUITO')).toUpperCase();
                  return (
                    <tr key={u.email} className="hover:bg-white/5 transition">
                      <td className="p-2.5 font-bold">{u.nome}</td>
                      <td className="p-2.5 text-slate-400">{u.email}</td>
                      <td className="p-2.5">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.email, e.target.value)}
                          className={`text-xs border rounded-lg px-2 py-1 font-semibold ${
                            darkMode
                              ? 'bg-[#0A141D] border-slate-700 text-white'
                              : 'bg-white border-slate-200 text-[#0A141D]'
                          }`}
                        >
                          <option value="admin">Administrador (Total)</option>
                          <option value="veterinario">Veterinário (Gera laudos)</option>
                          <option value="assistente">Assistente (Consulta)</option>
                          <option value="pendente">Bloqueado / Pendente</option>
                        </select>
                      </td>
                      <td className="p-2.5">
                        <select
                          value={planoAtual}
                          onChange={(e) => handlePlanoChange(u.email, e.target.value)}
                          className={`text-xs border rounded-lg px-2 py-1 font-semibold ${
                            planoAtual === 'ILIMITADO' || u.role === 'admin'
                              ? darkMode
                                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                                : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                              : darkMode
                              ? 'bg-[#0A141D] border-slate-700 text-white'
                              : 'bg-white border-slate-200 text-[#0A141D]'
                          }`}
                        >
                          <option value="ILIMITADO">💎 Ilimitado (Licença Admin)</option>
                          <option value="CLINICA">Clínica & Hosp (500 laudos)</option>
                          <option value="PRO">Especialista Pro (150 laudos)</option>
                          <option value="SOLO">Solo / Volante (40 laudos)</option>
                          <option value="GRATUITO">Degustação (10 laudos)</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-extrabold bg-[#00D296] text-[#062E2B]"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
