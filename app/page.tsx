import { Suspense } from "react";
import { Albums } from "./albums.tsx";
import { Search } from "./search.tsx";

type Props = {
  search: string;
};

export function Page({ search }: Props) {
  return (
    <>
      <h1 className="text-3xl mb-3">Spotifn’t</h1>
      <Search />
      <Suspense fallback="Getting albums">
        {/* @ts-expect-error 'Promise<Element>' is not a valid JSX element. */}
        <Albums search={search} />
      </Suspense>
    </>
  );
}
