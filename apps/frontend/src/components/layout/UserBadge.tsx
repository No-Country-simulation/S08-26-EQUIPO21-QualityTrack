// Usuario simulado hasta que exista autenticación real (issue #35).
const currentUser = {
  name: 'Carlos Rivero',
  role: 'Comercial',
};

export function UserBadge() {
  return (
    <div className="border-t border-gray-200 p-4">
      <p className="truncate text-sm font-medium text-gray-900">
        {currentUser.name}
      </p>
      <p className="truncate text-xs text-gray-500">{currentUser.role}</p>
    </div>
  );
}
