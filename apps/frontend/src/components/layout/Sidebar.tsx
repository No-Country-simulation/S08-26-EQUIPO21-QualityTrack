import { NavLink } from 'react-router';

import { UserBadge } from './UserBadge';
import { Dollar, Tool, Star, Eye } from '@mynaui/icons-react';

const navItems = [
  {
    to: '/commercial',
    label: 'Comercial',
    icon: <Dollar className="size-4" />,
  },
  { to: '/production', label: 'Producción', icon: <Tool className="size-4" /> },
  { to: '/quality', label: 'Calidad', icon: <Star className="size-4" /> },
  { to: '/dossier', label: 'Auditoría', icon: <Eye className="size-4" /> },
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
              `rounded px-3 py-2 text-sm font-medium flex items-center gap-2 ${
                isActive
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>
      <UserBadge />
    </aside>
  );
}
