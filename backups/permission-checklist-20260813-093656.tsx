"use client";

import { useMemo, useState } from "react";

type Permission = {
  key: string;
  label: string;
  description: string;
  category: string;
};

type Props = {
  permissions: Permission[];
  initialSelectedKeys?: string[];
  disabled?: boolean;
};

export function UserPermissionChecklist({
  permissions,
  initialSelectedKeys = [],
  disabled = false,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialSelectedKeys)
  );

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          permissions.map(
            (permission) => permission.category
          )
        )
      ),
    [permissions]
  );

  function toggle(
    permissionKey: string,
    checked: boolean
  ) {
    if (disabled) {
      return;
    }

    setSelected((current) => {
      const next = new Set(current);

      if (checked) {
        next.add(permissionKey);
      } else {
        next.delete(permissionKey);
      }

      return next;
    });
  }

  function selectAll() {
    if (disabled) {
      return;
    }

    setSelected(
      new Set(
        permissions.map(
          (permission) => permission.key
        )
      )
    );
  }

  function clearAll() {
    if (disabled) {
      return;
    }

    setSelected(new Set());
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">
            Permisos exactos
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Lo que esté marcado será lo que este usuario podrá hacer.
          </p>
        </div>

        {!disabled && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={selectAll}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Marcar todos
            </button>

            <button
              type="button"
              onClick={clearAll}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Quitar todos
            </button>
          </div>
        )}
      </div>

      {categories.map((category) => (
        <section
          key={category}
          className="overflow-hidden rounded-2xl border border-slate-200"
        >
          <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
            <p className="text-sm font-semibold text-slate-800">
              {category}
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {permissions
              .filter(
                (permission) =>
                  permission.category === category
              )
              .map((permission) => {
                const checked = selected.has(
                  permission.key
                );

                return (
                  <label
                    key={permission.key}
                    className={`flex gap-3 px-5 py-4 transition ${
                      disabled
                        ? "cursor-default bg-slate-50/40"
                        : "cursor-pointer hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      name={`permission:${permission.key}`}
                      checked={checked}
                      disabled={disabled}
                      onChange={(event) =>
                        toggle(
                          permission.key,
                          event.target.checked
                        )
                      }
                      className="mt-1 h-4 w-4 rounded"
                    />

                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {permission.label}
                      </p>

                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {permission.description}
                      </p>
                    </div>
                  </label>
                );
              })}
          </div>
        </section>
      ))}

      <p className="text-xs text-slate-400">
        Seleccionados: {selected.size} de {permissions.length}
      </p>
    </div>
  );
}