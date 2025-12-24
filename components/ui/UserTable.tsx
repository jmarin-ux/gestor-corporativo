export const UserTable = ({ users }: { users: any[] }) => {
  return (
    <div className="overflow-x-auto bg-white rounded-lg border border-slate-200 shadow-sm">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Nombre</th>
            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Email</th>
            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Rol Actual</th>
            <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 text-sm">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-6 py-4 font-medium text-slate-900">{user.full_name}</td>
              <td className="px-6 py-4 text-slate-600">{user.email}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                  user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 
                  user.role === 'coordinador' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                }`}>
                  {user.role}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-blue-600 hover:text-blue-800 font-medium">Asignar Mando</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};