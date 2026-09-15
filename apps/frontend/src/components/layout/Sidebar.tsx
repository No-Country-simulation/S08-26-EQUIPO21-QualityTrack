import { NavLink } from 'react-router';

import { UserBadge } from './UserBadge';

const navItems = [
  { to: '/commercial', label: 'Comercial' },
  { to: '/production', label: 'Producción' },
  { to: '/quality', label: 'Calidad' },
  { to: '/dossier', label: 'Auditoría' },
] as const;

export function Sidebar() {
  return (
    <aside className="flex w-56 shrink-0 flex-col justify-between border-r border-gray-200 bg-white">
      <nav className="flex flex-col gap-1 p-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `rounded px-3 py-2 text-sm font-medium ${
                isActive
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <UserBadge />
    </aside>
  );
}
