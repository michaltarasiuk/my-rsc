import { getAll } from "../data/db";
import { Like } from "./like.tsx";

type Props = {
  search: string | null;
};

export async function Albums({ search: search_ }: Props) {
  const albums = await getAll();
  const search = search_?.toLowerCase();

  let searchedAlbums = albums;
  if (search) {
    searchedAlbums = albums.filter(({ title, artist }) => {
      return [title, artist]
        .map((val) => val.toLowerCase())
        .some((val) => val.startsWith(search));
    });
  }

  return (
    <ul>
      {searchedAlbums.map(({ title, songs, cover, id }) => (
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
