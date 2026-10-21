"use client";

import { useVaultEntry } from "../chrome/vault-gate";

/**
 * Footer "The Vault" link. The source links to `/vault-3d`, which shows a guest the
 * members-only gate; the clone has no vault route, so the click opens that gate in
 * place, like the header's vault button.
 */
export function VaultFooterLink({ href, label, className }: { href: string; label: string; className: string }) {
  const { enter, gateNode } = useVaultEntry();

  return (
    <>
      <a
        href={href}
        className={className}
        onClick={(event) => {
          event.preventDefault();
          enter();
        }}
      >
        {label}
      </a>
      {gateNode}
    </>
  );
}
