import { Suspense } from "react";

import { Albums } from "./albums.tsx";

type Props = {
  search: string | null;
};

export function Page({ search }: Props) {
  return (
    <main>
      <h1 className="text-3xl mb-3">Spotifn’t</h1>
      <Suspense fallback="Getting albums">
        {/* @ts-expect-error 'Promise<Element>' is not a valid JSX element. */}
        <Albums search={search} />
      </Suspense>
    </main>
  );
}
