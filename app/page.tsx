import { Suspense } from "react";
import { getAll } from "../data/db";
import { Like } from "./like.tsx";

type PageProps = {
  search: string;
};

export function Page({ search: _ }: PageProps) {
  return (
    <>
      <h1 className="text-3xl mb-3">Spotifn’t</h1>
      <Suspense fallback="Getting albums">
        {/* @ts-expect-error 'Promise<Element>' is not a valid JSX element. */}
        <Albums />
      </Suspense>
    </>
  );
}

async function Albums() {
  const albums = await getAll();
  return (
    <ul>
      {albums.map(({ title, songs, cover, id }) => (
        <li key={id} className="flex gap-2 items-center mb-2">
          <img className="w-20 aspect-square" src={cover} alt={title} />
          <div>
            <h3 className="text-xl">{title}</h3>
            <p>{songs.length} songs</p>
            <Like />
          </div>
        </li>
      ))}
    </ul>
  );
}
